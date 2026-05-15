#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# BANKRSYNTH VPS INITIAL SETUP
# Run once on a fresh Ubuntu 22.04 / 24.04 VPS as root.
# Installs: Node 20, pnpm, PM2, Nginx, Certbot
#
# Usage: sudo bash setup-vps.sh YOUR_DOMAIN
# ══════════════════════════════════════════════════════════════

set -euo pipefail

DOMAIN="${1:-}"
APP_USER="bankrsynth"
APP_DIR="/opt/bankrsynth"
LOG_DIR="/var/log/bankrsynth"
NODE_VERSION="20"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}◈${NC} $1"; }
info() { echo -e "${CYAN}◈${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; exit 1; }

[ "$(id -u)" -eq 0 ] || err "Run as root: sudo bash setup-vps.sh"
[ -n "$DOMAIN" ]      || err "Usage: sudo bash setup-vps.sh YOUR_DOMAIN"

log "BankrSynth VPS Setup — $DOMAIN"

# ─── System update ───────────────────────────────────────────
log "1/8 Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ─── Node.js 20 ──────────────────────────────────────────────
log "2/8 Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs
node --version && npm --version

# ─── pnpm ────────────────────────────────────────────────────
log "3/8 Installing pnpm..."
npm install -g pnpm@9
pnpm --version

# ─── PM2 ─────────────────────────────────────────────────────
log "4/8 Installing PM2..."
npm install -g pm2
pm2 --version

# ─── Nginx ───────────────────────────────────────────────────
log "5/8 Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx

# ─── Certbot ─────────────────────────────────────────────────
log "6/8 Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx
certbot --version

# ─── App user + directories ──────────────────────────────────
log "7/8 Creating app user and directories..."
id -u "$APP_USER" &>/dev/null || useradd -m -s /bin/bash "$APP_USER"
mkdir -p "$APP_DIR" "$LOG_DIR"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR" "$LOG_DIR"

# ─── Firewall ────────────────────────────────────────────────
log "8/8 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ─── Summary ─────────────────────────────────────────────────
echo ""
log "VPS setup complete!"
echo ""
echo -e "  ${CYAN}Next steps:${NC}"
echo -e "  1. Deploy code:   sudo -u $APP_USER bash deploy-backend.sh"
echo -e "  2. Configure SSL: sudo certbot --nginx -d api.$DOMAIN -d $DOMAIN"
echo -e "  3. Install nginx config and reload:"
echo -e "     sudo cp $APP_DIR/infrastructure/nginx/nginx.vps.conf /etc/nginx/sites-available/bankrsynth"
echo -e "     sudo sed -i 's/YOUR_DOMAIN/$DOMAIN/g' /etc/nginx/sites-available/bankrsynth"
echo -e "     sudo ln -sf /etc/nginx/sites-available/bankrsynth /etc/nginx/sites-enabled/"
echo -e "     sudo nginx -t && sudo systemctl reload nginx"
echo ""
