@echo off
setlocal enabledelayedexpansion
title NexusOrigin - All Services Launcher

:: ────────────────────────────────────────────────────────────
::  NexusOrigin — one-command startup for all services
::  Usage: start-all.bat
::  Press Ctrl+C in this window to stop everything
:: ────────────────────────────────────────────────────────────

echo.
echo   ============================================
echo     NexusOrigin — Service Launcher
echo   ============================================
echo.

cd /d "%~dp0"

:: ── helpers ─────────────────────────────────────────────────
set "OK=  [OK]"
set "FAIL=[FAIL]"
set "WARN=  [!!]"

:: ────────────────────────────────────────────────────────────
::  Step 1 — Check prerequisites
:: ────────────────────────────────────────────────────────────
echo  [1/7] Checking prerequisites ...

:: Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  %WARN% Docker not found — skipping container services
    set "HAS_DOCKER=0"
) else (
    echo  %OK% Docker found
    set "HAS_DOCKER=1"
)

:: Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  %FAIL% Node.js not found — please install Node.js ^>= 18
    exit /b 1
)
echo  %OK% Node.js found

:: pnpm
pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  %FAIL% pnpm not found — run: npm install -g pnpm
    exit /b 1
)
echo  %OK% pnpm found

:: Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  %WARN% Python not found — skipping Agent services
    set "HAS_PYTHON=0"
) else (
    echo  %OK% Python found
    set "HAS_PYTHON=1"
)

:: Go
go version >nul 2>&1
if %errorlevel% neq 0 (
    echo  %WARN% Go not found — skipping Go microservices
    set "HAS_GO=0"
) else (
    echo  %OK% Go found
    set "HAS_GO=1"
)

:: Ollama
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo  %WARN% Ollama not reachable — Agent services will fail at runtime
    echo        Start it with: ollama serve
) else (
    echo  %OK% Ollama reachable
)

echo.

:: ────────────────────────────────────────────────────────────
::  Step 2 — Install dependencies (if needed)
:: ────────────────────────────────────────────────────────────
echo  [2/7] Installing Node.js dependencies ...
if not exist "node_modules\" (
    echo        Running pnpm install ...
    call pnpm install
) else (
    echo  %OK% node_modules already exists
)
echo.

:: ────────────────────────────────────────────────────────────
::  Step 3 — Start Docker services (PostgreSQL + Redis)
:: ────────────────────────────────────────────────────────────
echo  [3/7] Starting Docker services ...
if "%HAS_DOCKER%"=="1" (
    cd docker
    docker compose up -d
    cd ..
    echo  %OK% PostgreSQL ^& Redis started
    echo        Waiting for healthy state ...
    timeout /t 4 /nobreak >nul
) else (
    echo  %WARN% Skipped — Docker not available
)
echo.

:: ────────────────────────────────────────────────────────────
::  Step 4 — Database migrations
:: ────────────────────────────────────────────────────────────
echo  [4/7] Running database migrations ...
if "%HAS_DOCKER%"=="1" (
    cd server\api-gateway
    npx prisma generate >nul 2>&1
    npx prisma migrate deploy 2>nul
    cd ..\..
    echo  %OK% Prisma client generated ^& migrations applied
) else (
    echo  %WARN% Skipped — no database available
)
echo.

:: ────────────────────────────────────────────────────────────
::  Step 5 — Start Go microservices
:: ────────────────────────────────────────────────────────────
echo  [5/7] Starting Go microservices ...

if "%HAS_GO%"=="1" (
    :: Token Service (port 8081)
    start "Nexus-TokenService" cmd /c ^
        "cd /d %~dp0server\token-service && echo Token Service on :8081 && go run cmd\server\main.go"

    :: Deploy Service (port 8082)
    start "Nexus-DeployService" cmd /c ^
        "cd /d %~dp0server\deploy-service && echo Deploy Service on :8082 && go run cmd\server\main.go"

    echo  %OK% Token Service ^(port 8081^) and Deploy Service ^(port 8082^) launched
) else (
    echo  %WARN% Skipped — Go not available
)
echo.

:: ────────────────────────────────────────────────────────────
::  Step 6 — Start Python Agent services
:: ────────────────────────────────────────────────────────────
echo  [6/7] Starting Python Agent services ...

if "%HAS_PYTHON%"=="1" (
    :: Check if Ollama model is available
    curl -s http://localhost:11434/api/tags >nul 2>&1
    if %errorlevel% equ 0 (
        start "Nexus-PythonServices" cmd /c ^
            "cd /d %~dp0client\src\main\python && echo CrewAI :8001  ^|  LangGraph :8002 && python start_services.py"
        echo  %OK% CrewAI ^(port 8001^) and LangGraph ^(port 8002^) launched
    ) else (
        echo  %WARN% Ollama not reachable — Python services will fail
        echo        Install ^& start Ollama first, then run:
        echo        python client\src\main\python\start_services.py
    )
) else (
    echo  %WARN% Skipped — Python not available
)
echo.

:: ────────────────────────────────────────────────────────────
::  Step 7 — Start NestJS API Gateway + Frontend
:: ────────────────────────────────────────────────────────────
echo  [7/7] Starting API Gateway and Frontend ...
echo.
echo   ============================================
echo     All services are starting!
echo.
echo     API Gateway    http://localhost:3000
echo     Frontend (Vite) http://localhost:5173
echo     Swagger docs   http://localhost:3000/api/docs
echo     CrewAI         http://localhost:8001
echo     LangGraph      http://localhost:8002
echo     Token Service  http://localhost:8081
echo     Deploy Service http://localhost:8082
echo     Sidecar Proxy  http://localhost:18790
echo.
echo     Press Ctrl+C to stop everything.
echo   ============================================
echo.

:: Start API Gateway in background
start "Nexus-APIGateway" cmd /c ^
    "cd /d %~dp0server\api-gateway && echo API Gateway on :3000 && npx nest start --watch"

:: Small delay to let NestJS initialize
timeout /t 2 /nobreak >nul

:: Start frontend (Vite dev server on :5173)
start "Nexus-Frontend" cmd /c ^
    "cd /d %~dp0client && echo Frontend on :5173 && npx vite"

:: ── Keep this window alive ──────────────────────────────────
echo  Launcher running — close this window or press Ctrl+C to stop.
pause >nul
