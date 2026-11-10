#!/usr/bin/env bash
# =============================================================================
# Verdict Engine — One-Click Production Deployment Script
# Target: Ubuntu ARM64 (Oracle Cloud Free Tier) / x86_64 VPS
# =============================================================================
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
# =============================================================================

set -e # Exit immediately on error

echo "======================================================"
echo "🚀 Starting Verdict Engine Production Deployment..."
echo "======================================================"

# 1. Pull Latest Code from Git (if in a Git repo)
if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "📥 Pulling latest commits from origin..."
  git fetch origin main 2>/dev/null || true
  git reset --hard origin/main 2>/dev/null || true
fi

# 2. Ensure Host Sandboxing Directory Exists
# This directory is mounted at /app/.temp/sandboxes on both the worker
# and host to enable sibling container volume sharing for solution files.
echo "📁 Setting up host sandbox workspace directory..."
sudo mkdir -p /app/.temp/sandboxes
sudo chmod 777 /app/.temp/sandboxes

# 3. Pre-pull C++ Compiler Sandbox Image
# Pre-pulling gcc:latest on the host ensures the very first submission
# executes immediately with sub-second latency instead of waiting on a pull.
echo "🐳 Pre-caching GCC compiler sandbox image on host..."
docker pull gcc:latest

# 4. Check for .env.prod File
if [ -f ".env.prod" ]; then
  echo "🔑 Sourcing environment variables from .env.prod..."
  set -a
  source .env.prod
  set +a
else
  echo "⚠️  No .env.prod file found. Using default container environment settings."
fi

# 5. Build and Launch Production Container Stack
echo "🔨 Building and launching containers via docker-compose.prod.yml..."
docker compose -f docker-compose.prod.yml up -d --build

# 6. Wait for PostgreSQL & API to be Ready
echo "⏳ Waiting for API and database containers to pass health checks..."
MAX_RETRIES=20
COUNT=0
until docker compose -f docker-compose.prod.yml exec -T api node -e "fetch('http://localhost:5000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))" > /dev/null 2>&1; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_RETRIES ]; then
    echo "❌ API service did not become healthy within expected timeout."
    docker compose -f docker-compose.prod.yml logs api
    exit 1
  fi
  echo "   Waiting for API service... ($COUNT/$MAX_RETRIES)"
  sleep 3
done

echo "✅ API service is healthy!"

# 7. Apply Prisma Schema & Seed Production Problems
echo "📦 Synchronizing Prisma database schema..."
docker compose -f docker-compose.prod.yml exec -T api npx prisma db push --skip-generate

echo "🌱 Ensuring 10 classic challenges and demo users are seeded..."
docker compose -f docker-compose.prod.yml exec -T api npm run prisma:seed

# 8. Final Health Check Verification
echo "🩺 Running live health check..."
HEALTH_STATUS=$(curl -s http://localhost:${APP_PORT:-80}/health || echo "FAILED")
echo "Health Response: $HEALTH_STATUS"

echo "======================================================"
echo "🎉 Verdict Engine deployed successfully on AWS EC2!"
echo "🌐 Web App URL: http://<YOUR_EC2_PUBLIC_IP>:${APP_PORT:-80}"
echo "📡 API Health Status: http://<YOUR_EC2_PUBLIC_IP>:${APP_PORT:-80}/health"
echo "✨ Full stack (Frontend + API + Worker + DB + Redis) is online!"
echo "======================================================"

