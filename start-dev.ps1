# =============================================================================
# Verdict Engine — 1-Click Local Development Launch Script
# =============================================================================

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "🚀 Launching Verdict Engine Development Environment..." -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Start Docker Containers (Postgres & Redis)
Write-Host "`n📦 Starting Docker containers (PostgreSQL & Redis)..." -ForegroundColor Yellow
docker compose up -d

# Verify containers are healthy
$containers = docker ps --filter "name=oj_" --format "{{.Names}}: {{.Status}}"
Write-Host $containers -ForegroundColor Green

# 2. Launch API Server in a new window
Write-Host "`n⚡ Starting API Server (port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\api'; npm run dev"

# 3. Launch Execution Worker in a new window
Write-Host "⚡ Starting Execution Worker (BullMQ + Docker)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\worker'; npm run dev"

# 4. Launch React Frontend in a new window
Write-Host "⚡ Starting Vite Frontend (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\client'; npm run dev"

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "✨ All services launched in separate windows!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "📡 Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "======================================================" -ForegroundColor Cyan

