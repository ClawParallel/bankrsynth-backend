#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# BANKRSYNTH BACKEND DEPLOY SCRIPT
# Run on VPS as the bankrsynth user (or root).
# Pulls latest code, installs deps, reloads PM2.
#
# Usage: bash deploy-backend.sh [branch]
# ══════════════════════════════════════════════════════════════

set -euo pipefail

BRANCH="${1:-main}"
REPO="https://github.com/ClawParallel/bankrsynth-backend.git"
APP_DIR="/opt/bankrsynth"
BACKEND_DIR="$APP_DIR/apps/backend"
LOG_DIR="/var/log/bankrsynth"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}◈ $1${NC}"; }
info() { echo -e "${CYAN}  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

mkdir -p "$LOG_DIR"

log "BankrSynth Backend Deploy — branch: $BRANCH"

# ─── Clone or pull ───────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  log "Pulling latest from $BRANCH..."
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  log "Cloning repository..."
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ─── Environment ─────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  warn ".env not found — copying .env.example"
  warn "IMPORTANT: Edit $APP_DIR/.env with your production values!"
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "NODE_ENV=production" > "$BACKEND_DIR/.env"
  echo "PORT=3000" >> "$BACKEND_DIR/.env"
fi

# ─── Install dependencies ────────────────────────────────────
log "Installing dependencies..."
cd "$APP_DIR"
pnpm install --frozen-lockfile --filter @bankrsynth/backend...

# ─── Build shared packages ───────────────────────────────────
log "Building workspace packages..."
pnpm run --filter @bankrsynth/shared build 2>/dev/null || warn "shared build skipped"

# ─── Create log dir ──────────────────────────────────────────
mkdir -p "$LOG_DIR"

# ─── Start / reload PM2 ──────────────────────────────────────
log "Starting / reloading PM2..."
cd "$BACKEND_DIR"

if pm2 list | grep -q "bankrsynth-backend"; then
  pm2 reload ecosystem.config.js --env production
  info "PM2 process reloaded (zero-downtime)"
else
  pm2 start ecosystem.config.js --env production
  info "PM2 process started"
fi

pm2 save

# ─── Health check ────────────────────────────────────────────
log "Waiting for backend to be ready..."
ATTEMPTS=0
until curl -sf http://localhost:3000/health > /dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ $ATTEMPTS -ge 15 ]; then
    err "Backend health check failed after 30s — check logs: pm2 logs bankrsynth-backend"
  fi
  sleep 2
done

log "Backend is healthy at http://localhost:3000/health"

# ─── Summary ─────────────────────────────────────────────────
echo ""
log "Deploy complete!"
echo ""
echo -e "  ${CYAN}Commands:${NC}"
echo -e "  pm2 status                     # process status"
echo -e "  pm2 logs bankrsynth-backend    # live logs"
echo -e "  pm2 reload ecosystem.config.js # zero-downtime reload"
echo -e "  pm2 restart bankrsynth-backend # full restart"
echo ""
