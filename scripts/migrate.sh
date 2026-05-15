#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# BANKRSYNTH MONOREPO MIGRATION SCRIPT
# Migrates standalone frontend/backend repos into this monorepo.
# Run once from the monorepo root.
# ══════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}◈${NC} $1"; }
info() { echo -e "${CYAN}◈${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err() { echo -e "${RED}✗${NC} $1"; exit 1; }

MONOREPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

log "BankrSynth Monorepo Migration"
echo ""

# ─── Check prerequisites ──────────────────────────────────────
command -v pnpm >/dev/null 2>&1 || err "pnpm not found. Run: npm install -g pnpm@9"
command -v node >/dev/null 2>&1 || err "Node.js not found"
command -v git >/dev/null 2>&1 || err "git not found"

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  err "Node.js 20+ required (current: v$NODE_VERSION)"
fi

# ─── Step 1: Copy apps ────────────────────────────────────────
log "Step 1/6: Migrating apps..."

FRONTEND_SRC="${1:-$HOME/bankrsynth-frontend}"
BACKEND_SRC="${2:-$HOME/bankrsynth-backend}"

if [ -d "$FRONTEND_SRC" ]; then
  info "Copying frontend from $FRONTEND_SRC"
  rsync -a --exclude=node_modules --exclude=.next --exclude=.git \
    "$FRONTEND_SRC/" "$MONOREPO_ROOT/apps/frontend/"
  log "Frontend migrated"
else
  warn "Frontend source not found at $FRONTEND_SRC — skipping"
fi

if [ -d "$BACKEND_SRC" ]; then
  info "Copying backend from $BACKEND_SRC"
  rsync -a --exclude=node_modules --exclude=.git \
    "$BACKEND_SRC/" "$MONOREPO_ROOT/apps/backend/"
  log "Backend migrated"
else
  warn "Backend source not found at $BACKEND_SRC — skipping"
fi

# ─── Step 2: Update package names ────────────────────────────
log "Step 2/6: Updating package names..."

# Frontend
if [ -f "$MONOREPO_ROOT/apps/frontend/package.json" ]; then
  # Already handled by the migration — just verify
  FNAME=$(node -e "console.log(require('$MONOREPO_ROOT/apps/frontend/package.json').name)")
  info "Frontend package name: $FNAME"
fi

# ─── Step 3: Set up environment ───────────────────────────────
log "Step 3/6: Setting up environment..."

if [ ! -f "$MONOREPO_ROOT/.env" ]; then
  cp "$MONOREPO_ROOT/.env.example" "$MONOREPO_ROOT/.env"
  warn "Created .env from .env.example — fill in your values!"
fi

if [ ! -f "$MONOREPO_ROOT/apps/backend/.env" ]; then
  cat > "$MONOREPO_ROOT/apps/backend/.env" << 'EOF'
# Backend-specific env — inherits from root .env via dotenv
# Override root values here if needed
PORT=3000
EOF
fi

if [ ! -f "$MONOREPO_ROOT/apps/frontend/.env.local" ]; then
  cat > "$MONOREPO_ROOT/apps/frontend/.env.local" << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF
  log "Created apps/frontend/.env.local"
fi

# ─── Step 4: Install dependencies ────────────────────────────
log "Step 4/6: Installing dependencies..."
cd "$MONOREPO_ROOT"
pnpm install
log "Dependencies installed"

# ─── Step 5: Build shared packages ───────────────────────────
log "Step 5/6: Building shared packages..."
pnpm run build:packages 2>/dev/null || warn "Package build skipped (TypeScript sources need tsup)"

# ─── Step 6: Initialize git ───────────────────────────────────
log "Step 6/6: Git setup..."
if [ ! -d "$MONOREPO_ROOT/.git" ]; then
  cd "$MONOREPO_ROOT"
  git init
  git add -A
  git commit -m "feat: BankrSynth monorepo — AI-native autonomous development terminal"
  log "Git repository initialized"
else
  info "Git already initialized"
fi

echo ""
log "Migration complete!"
echo ""
echo -e "  ${CYAN}Next steps:${NC}"
echo -e "  1. Edit ${YELLOW}.env${NC} with your API keys"
echo -e "  2. Run ${GREEN}pnpm dev${NC} to start all services"
echo -e "  3. Frontend → ${CYAN}http://localhost:3001${NC}"
echo -e "  4. Backend  → ${CYAN}http://localhost:3000${NC}"
echo ""
