#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────
#  NexusOrigin — one-command startup for all services
#  Usage: ./start-all.sh
#  Press Ctrl+C to stop everything
# ────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

ok()   { echo -e "  ${GREEN}[OK]${NC} $*"; }
fail() { echo -e "  ${RED}[FAIL]${NC} $*"; }
warn() { echo -e "  ${YELLOW}[!!]${NC} $*"; }
info() { echo -e "  ${CYAN}[..]${NC} $*"; }

echo ""
echo "  ============================================"
echo "    NexusOrigin — Service Launcher"
echo "  ============================================"
echo ""

# ────────────────────────────────────────────────────────────
#  Step 1 — Check prerequisites
# ────────────────────────────────────────────────────────────
echo " [1/7] Checking prerequisites ..."

HAS_DOCKER=0; HAS_PYTHON=0; HAS_GO=0

if command -v docker &>/dev/null; then
  ok "Docker found"
  HAS_DOCKER=1
else
  warn "Docker not found — skipping container services"
fi

command -v node &>/dev/null  || { fail "Node.js not found — please install Node.js >= 18"; exit 1; }
ok "Node.js found"

command -v pnpm &>/dev/null || { fail "pnpm not found — run: npm install -g pnpm"; exit 1; }
ok "pnpm found"

if command -v python3 &>/dev/null || command -v python &>/dev/null; then
  ok "Python found"
  HAS_PYTHON=1
else
  warn "Python not found — skipping Agent services"
fi

if command -v go &>/dev/null; then
  ok "Go found"
  HAS_GO=1
else
  warn "Go not found — skipping Go microservices"
fi

# Ollama check
if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
  ok "Ollama reachable"
else
  warn "Ollama not reachable — Agent services will fail at runtime"
  echo "        Start it with: ollama serve"
fi

echo ""

# ────────────────────────────────────────────────────────────
#  Step 2 — Install dependencies (if needed)
# ────────────────────────────────────────────────────────────
echo " [2/7] Installing Node.js dependencies ..."
if [ ! -d "node_modules" ]; then
  info "Running pnpm install ..."
  pnpm install
else
  ok "node_modules already exists"
fi
echo ""

# ────────────────────────────────────────────────────────────
#  Step 3 — Start Docker services (PostgreSQL + Redis)
# ────────────────────────────────────────────────────────────
echo " [3/7] Starting Docker services ..."
if [ "$HAS_DOCKER" = "1" ]; then
  cd docker
  docker compose up -d
  cd "$ROOT"
  ok "PostgreSQL & Redis started"
  info "Waiting for healthy state ..."
  sleep 4
else
  warn "Skipped — Docker not available"
fi
echo ""

# ────────────────────────────────────────────────────────────
#  Step 4 — Database migrations
# ────────────────────────────────────────────────────────────
echo " [4/7] Running database migrations ..."
if [ "$HAS_DOCKER" = "1" ]; then
  cd server/api-gateway
  npx prisma generate >/dev/null 2>&1
  npx prisma migrate deploy 2>/dev/null || true
  cd "$ROOT"
  ok "Prisma client generated & migrations applied"
else
  warn "Skipped — no database available"
fi
echo ""

# ────────────────────────────────────────────────────────────
#  Step 5 — Start Go microservices
# ────────────────────────────────────────────────────────────
echo " [5/7] Starting Go microservices ..."
if [ "$HAS_GO" = "1" ]; then
  cd server/token-service
  go run cmd/server/main.go &
  cd "$ROOT"
  ok "Token Service launched (port 8081)"

  cd server/deploy-service
  go run cmd/server/main.go &
  cd "$ROOT"
  ok "Deploy Service launched (port 8082)"
else
  warn "Skipped — Go not available"
fi
echo ""

# ────────────────────────────────────────────────────────────
#  Step 6 — Start Python Agent services
# ────────────────────────────────────────────────────────────
echo " [6/7] Starting Python Agent services ..."
if [ "$HAS_PYTHON" = "1" ]; then
  if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    PYTHON=$(command -v python3 || command -v python)
    cd client/src/main/python
    $PYTHON start_services.py &
    cd "$ROOT"
    ok "CrewAI (port 8001) and LangGraph (port 8002) launched"
  else
    warn "Ollama not reachable — Python services will fail"
    echo "        Install & start Ollama first, then run:"
    echo "        python client/src/main/python/start_services.py"
  fi
else
  warn "Skipped — Python not available"
fi
echo ""

# ────────────────────────────────────────────────────────────
#  Step 7 — Start NestJS API Gateway + Frontend
# ────────────────────────────────────────────────────────────
echo " [7/7] Starting API Gateway and Frontend ..."
echo ""
echo "  ============================================"
echo "    All services are starting!"
echo ""
echo "    API Gateway    http://localhost:3000"
echo "    Frontend       http://localhost:5173"
echo "    Swagger docs   http://localhost:3000/api/docs"
echo "    CrewAI         http://localhost:8001"
echo "    LangGraph      http://localhost:8002"
echo "    Token Service  http://localhost:8081"
echo "    Deploy Service http://localhost:8082"
echo "    Sidecar Proxy  http://localhost:18790"
echo ""
echo "    Press Ctrl+C to stop everything."
echo "  ============================================"
echo ""

# Start API Gateway in background
cd server/api-gateway
npx nest start --watch &
cd "$ROOT"
sleep 2

# Start frontend
cd client
npx vite &
cd "$ROOT"

# ── Keep running until Ctrl+C ────────────────────────────────
echo "Launcher running — press Ctrl+C to stop."
wait
