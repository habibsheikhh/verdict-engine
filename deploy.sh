#!/usr/bin/env bash
# =============================================================================
# Verdict Engine — Hardened Production Deployment Script
# Target: Ubuntu 22.04/24.04 LTS (AWS EC2 / VPS)
# =============================================================================
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
# =============================================================================

# Strict mode: exit immediately on error (-e), undefined variable (-u), pipe failure (-o pipefail)
set -euo pipefail

# -----------------------------------------------------------------------------
# 0. Global Setup, Path Resolution & Trap Handlers
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILE="docker-compose.prod.yml"
SANDBOX_HOST_DIR="/app/.temp/sandboxes"
MAX_HEALTH_RETRIES=20
HEALTH_INTERVAL=3

# Trap on error to provide immediate diagnostic output
cleanup_on_error() {
  local exit_code=$1
  local line_no=$2
  echo ""
  echo "======================================================"
  echo "❌ DEPLOYMENT FAILED at line ${line_no} (Exit Code: ${exit_code})"
  echo "======================================================"
  echo "Dumping recent container logs for diagnostics..."
  if [ -n "${DOCKER_COMPOSE_CMD:-}" ] && [ -f "$COMPOSE_FILE" ]; then
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" logs --tail=50 || true
  fi
  exit "$exit_code"
}
trap 'cleanup_on_error $? $LINENO' ERR

echo "======================================================"
echo "🚀 Starting Hardened Verdict Engine Production Deployment..."
echo "📂 Working Directory: ${SCRIPT_DIR}"
echo "======================================================"

# -----------------------------------------------------------------------------
# 1. Host Dependency & Docker Daemon Verification
# -----------------------------------------------------------------------------
echo "🔍 Validating host environment and prerequisites..."

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Error: Docker is not installed on this host. Please install Docker Engine first."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "❌ Error: Cannot connect to the Docker daemon. Is the Docker service running, and is '$(whoami)' in the 'docker' group?"
  exit 1
fi

# Detect Docker Compose V2 (preferred) or V1
if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE_CMD="docker-compose"
else
  echo "❌ Error: Neither 'docker compose' (V2 plugin) nor 'docker-compose' (V1) is installed."
  exit 1
fi
echo "   Docker & Compose detected (${DOCKER_COMPOSE_CMD})"

# Check available disk space (prevent running out of disk on 25-30GB EBS)
AVAILABLE_DISK_KB=$(df -k "$SCRIPT_DIR" 2>/dev/null | awk 'NR==2 {print $4}' || echo "99999999")
if [ "$AVAILABLE_DISK_KB" -lt 2097152 ]; then # Less than 2GB free
  echo "⚠️  WARNING: Less than 2GB free disk space remaining on host (${AVAILABLE_DISK_KB} KB free)."
  echo "   Running automatic Docker system prune to free space..."
  docker system prune -f || true
fi

# -----------------------------------------------------------------------------
# 2. Safe Git Synchronization
# -----------------------------------------------------------------------------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  echo "📥 Checking git status on branch '${CURRENT_BRANCH}'..."
  
  # Fetch latest remote updates with failure handling
  if git remote get-url origin >/dev/null 2>&1; then
    echo "   Fetching latest commits from remote 'origin'..."
    if ! git fetch origin "${CURRENT_BRANCH}"; then
      echo "⚠️  Git fetch failed. Continuing with local codebase..."
    else
      echo "   Resetting working tree to match origin/${CURRENT_BRANCH}..."
      git reset --hard "origin/${CURRENT_BRANCH}"
    fi
  fi
else
  echo "ℹ️  Not a git repository or git metadata omitted. Skipping git sync."
fi

# -----------------------------------------------------------------------------
# 3. Secure Host Sandbox Workspace Setup
# -----------------------------------------------------------------------------
# Mounted at /app/.temp/sandboxes in worker and host for sibling container mounts.
echo "📁 Configuring host sandbox directory (${SANDBOX_HOST_DIR})..."
if [ ! -d "$SANDBOX_HOST_DIR" ]; then
  if [ "$(id -u)" -eq 0 ]; then
    mkdir -p "$SANDBOX_HOST_DIR"
  elif command -v sudo >/dev/null 2>&1; then
    sudo mkdir -p "$SANDBOX_HOST_DIR"
  else
    echo "❌ Error: Cannot create ${SANDBOX_HOST_DIR}. Run as root or install sudo."
    exit 1
  fi
fi

# Set permissions: 1777 (Sticky bit enabled: prevents cross-sandbox tampering)
if [ "$(id -u)" -eq 0 ]; then
  chmod 1777 "$SANDBOX_HOST_DIR"
elif command -v sudo >/dev/null 2>&1; then
  sudo chmod 1777 "$SANDBOX_HOST_DIR"
fi
echo "   Sandbox directory configured with sticky bit permissions (1777)."

# -----------------------------------------------------------------------------
# 4. Strict Production Environment File Loading
# -----------------------------------------------------------------------------
ENV_FILE=""
if [ -f ".env.prod" ]; then
  ENV_FILE=".env.prod"
elif [ -f ".env" ]; then
  ENV_FILE=".env"
fi

if [ -n "$ENV_FILE" ]; then
  echo "🔑 Loading environment configuration from '${ENV_FILE}'..."
  # Enforce strict file permissions on secrets file (read/write only by owner)
  chmod 600 "$ENV_FILE" 2>/dev/null || true
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "❌ CRITICAL ERROR: Neither '.env.prod' nor '.env' was found in ${SCRIPT_DIR}."
  echo "   Refusing to deploy with hardcoded fallback passwords in production."
  echo "   Please create .env.prod (see .env.prod.example) and re-run deploy.sh."
  exit 1
fi

# Validate essential production variables are non-empty
: "${POSTGRES_USER:?POSTGRES_USER must be set in $ENV_FILE}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set in $ENV_FILE}"
: "${JWT_SECRET:?JWT_SECRET must be set in $ENV_FILE}"
APP_PORT="${APP_PORT:-80}"

# -----------------------------------------------------------------------------
# 5. Pre-Cache GCC Compiler Sandbox Image
# -----------------------------------------------------------------------------
echo "🐳 Pre-caching GCC compiler sandbox image (gcc:latest)..."
if ! docker pull gcc:latest; then
  echo "⚠️  Docker pull for gcc:latest failed (possible network or rate limit issue)."
  if docker image inspect gcc:latest >/dev/null 2>&1; then
    echo "   Existing local gcc:latest image found. Proceeding with cached image."
  else
    echo "❌ Error: gcc:latest is not available locally or on remote registry."
    exit 1
  fi
fi

# -----------------------------------------------------------------------------
# 6. Zero-Race-Condition Staged Container Launch
# -----------------------------------------------------------------------------
echo "🔨 Building application images..."
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" build --pull

# STAGE A: Start Database & Queue Dependencies FIRST
echo "📦 Starting storage services (PostgreSQL & Redis)..."
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" up -d postgres redis

# STAGE B: Wait for PostgreSQL to be 100% Ready
echo "⏳ Waiting for PostgreSQL container to pass health checks..."
DB_COUNT=0
until $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB:-online_judge}" >/dev/null 2>&1; do
  DB_COUNT=$((DB_COUNT + 1))
  if [ "$DB_COUNT" -ge "$MAX_HEALTH_RETRIES" ]; then
    echo "❌ PostgreSQL did not become ready within timeout."
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" logs postgres
    exit 1
  fi
  echo "   Waiting for PostgreSQL... (${DB_COUNT}/${MAX_HEALTH_RETRIES})"
  sleep 2
done
echo "✅ PostgreSQL is accepting connections."

# STAGE C: Run Prisma Schema Synchronization BEFORE Starting Worker & API
echo "📦 Synchronizing Prisma database schema..."
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" run --rm --no-deps api npx prisma db push --skip-generate
echo "✅ Database schema synchronized."

# STAGE D: Launch Full Stack (API, Worker, Client) with Schema in Place
echo "🚀 Starting API, Worker, and Web Client containers..."
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" up -d --remove-orphans api worker client

# -----------------------------------------------------------------------------
# 7. Health Check Verification with Fast-Fail Detection
# -----------------------------------------------------------------------------
echo "⏳ Verifying API service health..."
COUNT=0
while true; do
  COUNT=$((COUNT + 1))
  
  # Fast-Fail: Check if API container died
  CONTAINER_STATUS=$($DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" ps --format "{{.Status}}" api 2>/dev/null || true)
  if [[ "$CONTAINER_STATUS" =~ "Exited" ]] || [[ "$CONTAINER_STATUS" =~ "Dead" ]]; then
    echo "❌ Fast-fail: API container exited unexpectedly with status: ${CONTAINER_STATUS}"
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" logs api
    exit 1
  fi

  # Test health endpoint inside the internal network
  if $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" exec -T api node -e "fetch('http://localhost:5000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))" >/dev/null 2>&1; then
    echo "✅ API internal health check passed."
    break
  fi

  if [ "$COUNT" -ge "$MAX_HEALTH_RETRIES" ]; then
    echo "❌ API service did not become healthy within expected timeout."
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" logs api
    exit 1
  fi

  echo "   Waiting for API service... (${COUNT}/${MAX_HEALTH_RETRIES})"
  sleep "$HEALTH_INTERVAL"
done

# -----------------------------------------------------------------------------
# 8. Disk Hygiene & Maintenance
# -----------------------------------------------------------------------------
echo "🧹 Pruning dangling build images to preserve disk space..."
docker image prune -f >/dev/null 2>&1 || true

# -----------------------------------------------------------------------------
# 9. Public Endpoint Verification
# -----------------------------------------------------------------------------
echo "🩺 Running public health check on port ${APP_PORT}..."
PUBLIC_HEALTH="UNKNOWN"
if command -v curl >/dev/null 2>&1; then
  PUBLIC_HEALTH=$(curl -s --connect-timeout 5 "http://localhost:${APP_PORT}/health" 2>/dev/null || echo "FAILED")
fi

HOST_IP=$(curl -s --connect-timeout 3 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "<YOUR_EC2_PUBLIC_IP>")

echo ""
echo "======================================================"
echo "🎉 Verdict Engine Deployed Successfully!"
echo "======================================================"
echo "🌐 Web Application : http://${HOST_IP}:${APP_PORT}"
echo "📡 Health Endpoint : http://${HOST_IP}:${APP_PORT}/health"
echo "🩺 Health Status   : ${PUBLIC_HEALTH}"
echo "🐳 Active Containers:"
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo "======================================================"
