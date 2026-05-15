#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# BANKRSYNTH FRONTEND DEPLOY (self-hosted — skip if using Vercel)
# Builds Next.js in standalone mode and runs it via PM2.
#
# Usage: bash deploy-frontend.sh [branch]
# ══════════════════════════════════════════════════════════════

set -euo pipefail

BRANCH="${1:-main}"
APP_DIR="/opt/bankrsynth"
FRONTEND_DIR="$APP_DIR/apps/frontend"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}◈ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

[ -d "$APP_DIR" ] || err "Run deploy-backend.sh first — $APP_DIR not found"

cd "$APP_DIR"
git pull origin "$BRANCH"

# ─── Set env for standalone build ────────────────────────────
export NEXT_OUTPUT=standalone

# ─── Install ─────────────────────────────────────────────────
log "Installing frontend dependencies..."
pnpm install --frozen-lockfile --filter @bankrsynth/frontend...

# ─── Build packages ──────────────────────────────────────────
log "Building workspace packages..."
pnpm run --filter @bankrsynth/shared build 2>/dev/null || warn "shared skipped"
pnpm run --filter @bankrsynth/synth-sdk build 2>/dev/null || warn "synth-sdk skipped"

# ─── Build Next.js ───────────────────────────────────────────
log "Building Next.js frontend..."
pnpm run --filter @bankrsynth/frontend build

# ─── PM2 launch ──────────────────────────────────────────────
log "Starting frontend via PM2..."
cat > /tmp/frontend-pm2.json << 'EOF'
{
  "name": "bankrsynth-frontend",
  "script": ".next/standalone/server.js",
  "cwd": "/opt/bankrsynth/apps/frontend",
  "instances": 1,
  "exec_mode": "fork",
  "autorestart": true,
  "max_memory_restart": "512M",
  "env": {
    "NODE_ENV": "production",
    "PORT": 3001,
    "HOSTNAME": "0.0.0.0"
  },
  "out_file": "/var/log/bankrsynth/frontend-out.log",
  "error_file": "/var/log/bankrsynth/frontend-error.log"
}
EOF

if pm2 list | grep -q "bankrsynth-frontend"; then
  pm2 reload bankrsynth-frontend
else
  pm2 start /tmp/frontend-pm2.json
fi

pm2 save

log "Frontend running at http://localhost:3001"
