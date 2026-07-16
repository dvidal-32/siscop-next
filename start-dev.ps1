# ─────────────────────────────────────────────────────────────────────────────
# Siscop - Startup Script for Development Environment
# ─────────────────────────────────────────────────────────────────────────────

# 0. Check prerequisites
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker CLI not found. Please install Docker Desktop and add it to your PATH."
    Exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js (npm) not found. Please install Node.js and add it to your PATH."
    Exit 1
}

# 1. Start Docker containers (Postgres, MinIO)
Write-Host "Step 1: Starting Docker containers..." -ForegroundColor Cyan

# Check if Docker daemon is running
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker daemon is not running. Please make sure Docker Desktop is started and running."
    Exit 1
}

# Clean up conflicting containers if they exist (e.g. from other projects or orphaned)
$conflictingContainers = @("prueba_minio", "prueba_postgres")
foreach ($container in $conflictingContainers) {
    $exists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $container }
    if ($exists) {
        Write-Host "Found conflicting container '$container'. Removing it to allow docker-compose to manage it..." -ForegroundColor Yellow
        docker rm -f $container > $null 2>&1
    }
}

# Run docker-compose up
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start Docker containers via docker compose."
    Exit $LASTEXITCODE
}

# Wait for Postgres database to be healthy and ready to accept connections
Write-Host "Waiting for database (prueba_postgres) to be healthy..." -ForegroundColor Yellow
$retries = 30
$dbReady = $false
while ($retries -gt 0 -and -not $dbReady) {
    Write-Host "Checking database health (Retries left: $retries)... " -NoNewline -ForegroundColor Gray
    $status = docker inspect --format="{{.State.Health.Status}}" prueba_postgres 2>$null
    if ($status) {
        $status = $status.Trim()
    }
    Write-Host "Status: '$status'" -ForegroundColor Gray
    if ($status -eq "healthy") {
        $dbReady = $true
    } else {
        Start-Sleep -Seconds 1
        $retries--
    }
}

if (-not $dbReady) {
    Write-Error "Database did not become healthy in time. Please check Docker Desktop."
    Exit 1
}
Write-Host "Database is healthy and ready!" -ForegroundColor Green

# 2. Check and configure Backend
Write-Host "`nStep 2: Checking backend configuration..." -ForegroundColor Cyan
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "backend/node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    $exitCode = $LASTEXITCODE
    Pop-Location
    if ($exitCode -ne 0) {
        Write-Error "Failed to install backend dependencies."
        Exit $exitCode
    }
}

# Run database migrations
Write-Host "Applying database migrations via Prisma..." -ForegroundColor Yellow
Push-Location backend
npx prisma migrate dev
$exitCode = $LASTEXITCODE
Pop-Location
if ($exitCode -ne 0) {
    Write-Error "Prisma database migration failed."
    Exit $exitCode
}

# 3. Check and configure Frontend
Write-Host "`nStep 3: Checking frontend configuration..." -ForegroundColor Cyan
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "frontend/node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    $exitCode = $LASTEXITCODE
    Pop-Location
    if ($exitCode -ne 0) {
        Write-Error "Failed to install frontend dependencies."
        Exit $exitCode
    }
}

# 4. Start services in separate terminal windows
Write-Host "`nStep 4: Launching services..." -ForegroundColor Cyan

# Start Backend in a new window
Write-Host "-> Starting NestJS Backend (http://localhost:3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle='Siscop Backend'; npm run start:dev" -WorkingDirectory "backend"

# Start Frontend in a new window
Write-Host "-> Starting Angular Frontend (http://localhost:4200)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle='Siscop Frontend'; npm start" -WorkingDirectory "frontend"

Write-Host "`n[SUCCESS] Everything is launching! You can check the new console windows for service logs." -ForegroundColor Green
Write-Host "Open http://localhost:4200 in your browser." -ForegroundColor Green
