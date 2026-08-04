# Musa Ledger — deploy to loan.khanmusa.com

Shared money books for family and friends. Track loans, repayments, and shared expenses with separate logins.

## Features

- **Admin login** (you) creates accounts for brother / friends
- **Shared books** — each person only sees books they’re in
- **Transaction types**
  - Gave money
  - Received / repayment
  - Shared expense (50/50)
  - Settlement
  - Manual adjustment
- Live balance: who owes whom

## Local development

```bash
cp .env.example .env.local
# edit ADMIN_USERNAME, ADMIN_PASSWORD, AUTH_SECRET
npm install
npm run dev
```

Open http://localhost:3000

Default admin is created on first start from `.env` values.

## Deploy with Docker (recommended)

On your server:

```bash
# clone this repo
git clone <your-repo-url> /opt/musa
cd /opt/musa

cp .env.example .env
# set strong AUTH_SECRET, ADMIN_PASSWORD, NEXT_PUBLIC_APP_URL=https://loan.khanmusa.com

docker compose up -d --build
```

App listens on port **3000**. Point Nginx at it (sample config in `deploy/nginx-loan.khanmusa.com.conf`).

### DNS

Create an **A record**:

```
loan.khanmusa.com  →  your-server-ip
```

### TLS (Let’s Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d loan.khanmusa.com
```

## Without Docker

```bash
npm ci
npm run build
# set env vars, then:
npm run start
```

Use a process manager (systemd / pm2) and reverse proxy with Nginx.

## First-time setup on the live site

1. Sign in as admin
2. Open **People** → create logins for brother and friend
3. Open **Books** → create a shared book with each person
4. Share their username/password privately
5. Add entries: gave / received / shared expense

Data is stored in SQLite at `./data/musa.db` (or `DATABASE_PATH`). Back up that file regularly.
