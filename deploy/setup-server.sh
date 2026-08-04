#!/usr/bin/env bash
# Quick deploy helper for a VPS (Ubuntu). Run from the repo root on the server.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/musa}"
DOMAIN="${DOMAIN:-loan.khanmusa.com}"

echo "→ Installing to $APP_DIR for $DOMAIN"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env — edit AUTH_SECRET and ADMIN_PASSWORD before going live."
fi

docker compose up -d --build

if command -v nginx >/dev/null 2>&1; then
  sudo cp deploy/nginx-loan.khanmusa.com.conf "/etc/nginx/sites-available/${DOMAIN}.conf"
  sudo ln -sf "/etc/nginx/sites-available/${DOMAIN}.conf" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
  sudo nginx -t && sudo systemctl reload nginx
  echo "Nginx site enabled. Run: sudo certbot --nginx -d ${DOMAIN}"
else
  echo "Nginx not found. Install it, then copy deploy/nginx-loan.khanmusa.com.conf"
fi

echo "App should be on http://127.0.0.1:3000 (proxied via ${DOMAIN})"
