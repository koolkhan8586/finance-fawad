# Loan — shared money books (loan.khanmusa.com)

Shared money books for family and friends. Track loans, repayments, and shared expenses with separate logins.

## Features

- **Admin login** (you) creates accounts for brother / friends
- **Shared books** — each person only sees books they’re in
- **Transaction types:** gave money, received / repayment, shared expense (50/50), settlement, adjustment
- Live balance: who owes whom

## Local development

```bash
cp .env.example .env.local
# edit ADMIN_USERNAME, ADMIN_PASSWORD, AUTH_SECRET
npm install
npm run dev
```

Open http://localhost:3000

## Deploy on Ubuntu VPS (no Docker)

If `docker` is not installed, use this path (recommended for a simple VPS):

```bash
cd /opt/musa
# make sure you have the app branch/code (not an empty main)
git fetch origin
git checkout cursor/musa-ledger-app-5c39   # or main after you merge the PR

bash deploy/install-without-docker.sh
```

That script installs Node.js 22, builds the app, starts it with **systemd**, and configures **Nginx** for `loan.khanmusa.com`.

Then:

```bash
# set a strong admin password
nano /opt/musa/.env
systemctl restart musa

# DNS: A record loan.khanmusa.com → your server IP

# HTTPS
apt install -y certbot python3-certbot-nginx
certbot --nginx -d loan.khanmusa.com

# useful checks
systemctl status musa --no-pager
curl -I http://127.0.0.1:3000
```

### Manual steps (same idea, without the script)

```bash
apt update
apt install -y curl build-essential python3 nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

cd /opt/musa
cp -n .env.example .env
nano .env   # AUTH_SECRET, ADMIN_PASSWORD, NEXT_PUBLIC_APP_URL=https://loan.khanmusa.com

npm ci
npm run build
mkdir -p data

cp deploy/musa.service /etc/systemd/system/musa.service
# edit ExecStart path if npm is not at /usr/bin/npm:  which npm
systemctl daemon-reload
systemctl enable --now musa

cp deploy/nginx-loan.khanmusa.com.conf /etc/nginx/sites-available/loan.khanmusa.com.conf
ln -sf /etc/nginx/sites-available/loan.khanmusa.com.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## Deploy with Docker (optional)

Only if you want Docker:

```bash
apt update
apt install -y docker.io docker-compose-v2
systemctl enable --now docker

cd /opt/musa
cp -n .env.example .env
nano .env
docker compose up -d --build
```

## Notifications (WhatsApp free → email fallback)

When someone adds/edits/deletes an entry, other members of that book can get an alert:

1. **WhatsApp (free)** via [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/)
   - Each person activates the bot once and gets an API key
   - On **People → Edit**, set WhatsApp phone (`+92…`) + API key
2. **Email fallback** if WhatsApp is missing/fails — set SMTP in `.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Loan <you@gmail.com>"
```

Paid WhatsApp Business API is not required for this free setup.
