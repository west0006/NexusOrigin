# ─── scripts/dev.sh ────────────────────────────────────────
#!/bin/bash
set -e

echo "🚀 Starting development environment..."

# Start Docker services
echo "Starting PostgreSQL and Redis..."
cd docker
docker-compose up -d
cd ..

# Wait for services
echo "Waiting for services to be ready..."
sleep 3

# Run database migrations
echo "Running database migrations..."
cd server/api-gateway
npx prisma migrate dev --name init 2>/dev/null || npx prisma migrate deploy
npx prisma generate
cd ../..

# Start all services with Turborepo
echo "Starting all services..."
pnpm dev