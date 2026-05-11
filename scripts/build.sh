# ─── scripts/build.sh ──────────────────────────────────────
#!/bin/bash
set -e

echo "🔨 Building all services..."

# Build with Turborepo
pnpm build

echo "✅ Build complete! Check dist/ directories for outputs."