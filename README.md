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

## Notifications (WAHA WhatsApp → TextMeBot → email)

When someone adds/edits/deletes an entry, other book members can get a WhatsApp alert.

### Option A — WAHA (self-hosted WhatsApp API)

1. Start WAHA (sample compose in `deploy/waha.docker-compose.yml`):

```bash
export WAHA_API_KEY='long-random-secret'
docker compose -f /opt/musa/deploy/waha.docker-compose.yml up -d
```

2. Open `http://SERVER_IP:3001`, start session `default`, scan QR with WhatsApp.

3. In Loan `/opt/musa/.env`:

```bash
WAHA_URL=http://127.0.0.1:3001
WAHA_API_KEY=long-random-secret
WAHA_SESSION=default
```

4. `systemctl restart musa`

5. **People → Edit** → set WhatsApp phone like `+923001234567`

Loan sends: `POST /api/sendText` with `chatId: 923001234567@c.us`.

### Option B — TextMeBot

```bash
TEXTMEBOT_APIKEY=your_key
```

### Email fallback

Set `SMTP_*` in `.env` (see `.env.example`) if WhatsApp fails or phone is missing.

## Google Drive receipts (optional)

When adding an entry you can attach a receipt (image or PDF). Files are uploaded **directly to your Google Drive** — nothing is stored on the Loan server.

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable **Google Drive API**.
2. OAuth consent screen → add scope `https://www.googleapis.com/auth/drive.file`.
3. Create **OAuth client ID** (Web application). Authorized redirect URI:
   `https://loan.khanmusa.com/api/google-drive/callback`
4. Add to `/opt/musa/.env`:

```bash
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://loan.khanmusa.com/api/google-drive/callback
```

5. Restart the app, then **Settings → Connect Google Drive** and sign in.
6. When adding an entry, use the optional **Receipt** field. Files appear in Drive under `Loan/{book name}/`.
