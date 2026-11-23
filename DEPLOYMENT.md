# Deployment & Local Setup

## Local development
Requires Node 22+ and PostgreSQL 16 (a role for your OS user: `sudo -u postgres createuser -s $USER`).

```bash
createdb al_ahmadiya && createdb al_ahmadiya_test
npm install
cp apps/api/.env.example apps/api/.env      # set secrets: openssl rand -hex 32
cp apps/web/.env.example apps/web/.env.local
npm run db:migrate          # prisma migrate dev
npm run db:seed             # roles, admin, settings, heritage
npm run db:seed:content -w apps/api   # colleges, programmes, courses, news, events, research, tour + images
npm run dev:api             # http://localhost:4000/api/v1  (docs /api/docs)
npm run dev:web             # http://localhost:3000/en      (admin /admin)
```

The initial Super Admin comes from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. **Change the password after first sign-in.**

Opening admissions: in Admin → Site settings, set `admissions.status` to `OPEN` and mark it Confirmed.

## Checks
`npm run lint` · `npm run typecheck` · `npm test` (API unit + e2e against `al_ahmadiya_test`; the suite refuses to run against a database whose name does not end in `_test`) · `npm run build`.

---

## Production

Target: one Linux server (Ubuntu 22.04/24.04, 4 vCPU / 8 GB RAM or more, in the UAE region per PDPL) running Nginx, PM2 and Node 22, with a managed PostgreSQL 16 database. Files in `deploy/`:

| File | Purpose |
|---|---|
| `deploy/api.env.production.example` | Template for `apps/api/.env` on the server |
| `deploy/web.env.production.example` | Template for `apps/web/.env.production.local` on the server |
| `deploy/nginx.conf.example` | HTTPS, `/api/v1/` and `/socket.io/` to the API, everything else to the website |
| `ecosystem.config.cjs` | PM2 processes `ahmadiya-api` (port 4000) and `ahmadiya-web` (port 3000), both bound to 127.0.0.1 |
| `deploy/deploy.sh` | Install → migrate → build → start/reload → health check |
| `deploy/backup.sh` | Nightly `pg_dump` + uploaded files archive |

### Safety built into the code
With `NODE_ENV=production` the API refuses to start if any of these is wrong, and prints what to fix:
- JWT/cookie secrets shorter than 64 characters, identical, or still placeholders; missing `REVALIDATE_SECRET`
- `WEB_BASE_URL` / `CORS_ORIGINS` not `https://`
- a remote `DATABASE_URL` without `sslmode=`
- `LIVE_ANNOUNCED_IP` left as a local address
- `PAYMENT_PROVIDER=test` (development gateway), or Razorpay selected with missing or placeholder keys / webhook secret
- `SHOW_DEMO_CONTENT=true`

Also in production: Swagger (`/api/docs`) is off, cookies are `Secure`, HSTS is sent, and `npm run db:seed` rejects a weak or `@localhost` admin account.

### First deployment
```bash
# 1. Server packages
sudo apt install -y nginx certbot python3-certbot-nginx postgresql-client build-essential python3
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && nvm install 22
npm install -g pm2 && pm2 startup         # follow the printed command once

# 2. Code
sudo mkdir -p /srv/ahmadiya /var/lib/ahmadiya/storage && sudo chown -R $USER /srv/ahmadiya /var/lib/ahmadiya
git clone <repository> /srv/ahmadiya && cd /srv/ahmadiya

# 3. Settings (fill in every value; generate secrets with: openssl rand -hex 32)
cp deploy/api.env.production.example apps/api/.env
cp deploy/web.env.production.example apps/web/.env.production.local
chmod 600 apps/api/.env apps/web/.env.production.local

# 4. Build, migrate, start
bash deploy/deploy.sh

# 5. First data (once)
npm run db:seed                         # roles, Super Admin, settings, heritage timeline
npm run db:seed:content -w apps/api     # academic content + images (skip if you will enter content in the admin panel)
#    then delete SEED_ADMIN_PASSWORD from apps/api/.env

# 6. Web server and HTTPS
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/ahmadiya   # replace example.com
sudo ln -s /etc/nginx/sites-available/ahmadiya /etc/nginx/sites-enabled/
sudo certbot --nginx -d example.com -d www.example.com
sudo nginx -t && sudo systemctl reload nginx

# 7. Firewall
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full'
sudo ufw allow 40000:40200/udp && sudo ufw allow 40000:40200/tcp     # live classes
sudo ufw enable
```

### Updates
```bash
cd /srv/ahmadiya && git pull && bash deploy/deploy.sh
```
`deploy.sh` applies new migrations with `prisma migrate deploy` (never `migrate dev`/`reset` in production) and reloads PM2.

### Payments (Razorpay)
Live keys from the Razorpay dashboard go in `apps/api/.env`. Add a webhook to `https://<domain>/api/v1/payments/razorpay/webhook` (events `payment.captured`, `order.paid`) with the same secret as `RAZORPAY_WEBHOOK_SECRET`. Make one small real payment and refund it before launch.

### Live classes (self-hosted media server)
Open UDP and TCP `LIVE_RTC_MIN_PORT`–`LIVE_RTC_MAX_PORT` (default 40000–40200), set `LIVE_ANNOUNCED_IP` to the server's public IP, and keep HTTPS on (browsers only allow camera/microphone over HTTPS). The API runs as a single process because live-class rooms live in memory. Roughly 200 viewers per CPU core; for users on strict networks add a TURN server (coturn) in the UAE region.

### Backups
`deploy/backup.sh` writes a database dump and an archive of `STORAGE_DIR` (uploaded videos, notes, applicant documents) to `/var/backups/ahmadiya`, keeping 14 days. Schedule it with cron (example inside the script), copy the backups off the server, and run a restore test before go-live. Use the managed database's point-in-time recovery as well.

### Before go-live
- [ ] Domain DNS points at the server; HTTPS certificate issued
- [ ] `apps/api/.env` and `apps/web/.env.production.local` filled; API starts without "Unsafe production configuration"
- [ ] Super Admin password changed after first sign-in; `SEED_ADMIN_PASSWORD` removed from the file
- [ ] Placeholder faculty names, publications and course prices replaced with real ones in the admin panel
- [ ] Site settings filled and Confirmed (contact details, admissions status, application fee)
- [ ] Razorpay live payment and webhook tested
- [ ] A live class tested from a phone on mobile data
- [ ] Backup cron running and one restore tested
