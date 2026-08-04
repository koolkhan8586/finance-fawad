#!/usr/bin/env bash
# Install Musa on Ubuntu/Debian WITHOUT Docker (Node.js + systemd + optional Nginx).
# Run as root from /opt/musa:
#   bash deploy/install-without-docker.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="${DOMAIN:-loan.khanmusa.com}"
cd "$APP_DIR"

echo "==> Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates build-essential python3 nginx

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v 2>/dev/null | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  echo "==> Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "Node $(node -v) / npm $(npm -v)"

if [[ ! -f .env ]]; then
  cp .env.example .env
  # Generate a random AUTH_SECRET
  SECRET="$(openssl rand -hex 32)"
  sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=${SECRET}|" .env
  sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://${DOMAIN}|" .env
  echo "==> Created .env — CHANGE ADMIN_PASSWORD before sharing the site:"
  echo "    nano ${APP_DIR}/.env"
fi

# Fix unquoted ADMIN_NAME=Ammad Khan (breaks bash/systemd)
if grep -qE '^ADMIN_NAME=[^"].*[[:space:]]' .env; then
  sed -i 's/^ADMIN_NAME=\(.*\)$/ADMIN_NAME="\1"/' .env
  echo "==> Quoted ADMIN_NAME in .env"
fi

echo "==> Installing npm packages"
npm ci

echo "==> Building Next.js app"
NEXT_PUBLIC_APP_URL="https://${DOMAIN}" npm run build

mkdir -p data
chown -R root:root "$APP_DIR"
chmod 600 .env || true

NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"

echo "==> Installing systemd service"
cat >/etc/systemd/system/musa.service <<EOF
[Unit]
Description=Musa Ledger (${DOMAIN})
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_PATH=${APP_DIR}/data/musa.db
ExecStart=${NPM_BIN} run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable musa
systemctl restart musa

echo "==> Configuring Nginx for ${DOMAIN}"
cat >/etc/nginx/sites-available/${DOMAIN}.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

ln -sf "/etc/nginx/sites-available/${DOMAIN}.conf" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo
echo "============================================"
echo " Musa is running on http://127.0.0.1:3000"
echo " Nginx is proxying http://${DOMAIN}"
echo
echo " Next steps:"
echo " 1) Edit passwords:  nano ${APP_DIR}/.env"
echo "    then:            systemctl restart musa"
echo " 2) DNS A record:    ${DOMAIN} → this server IP"
echo " 3) HTTPS:           apt install -y certbot python3-certbot-nginx"
echo "                     certbot --nginx -d ${DOMAIN}"
echo " 4) Check status:    systemctl status musa --no-pager"
echo "============================================"
