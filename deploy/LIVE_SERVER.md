# Deploying: Render (API) + Vercel (website) + VPS (live classes)

Live classes need UDP ports (40000–40200) and a public IP. Render cannot provide that, so the
live-class server runs on a small VPS. Everything else stays where it is. **Three pieces, not more:**

| Piece | Where | What runs |
|---|---|---|
| Core API | Render web service (1 service) | `apps/api` → `dist/main.js` |
| Database | Render PostgreSQL (existing) | shared by the API and the live server |
| Website | Vercel | `apps/web` |
| Live classes | VPS (2 vCPU / 4 GB, UAE region if possible) | `apps/api` → `dist-live/main.live.js` |

Delete any other Render services that try to run the live server.

## 1. Render core API — settings that keep the build small

- Root directory: *(empty)*
- Build command (installs only the API workspace and skips the native media server):
  ```
  npm ci --workspace=apps/api --include-workspace-root --include=dev --omit=optional && npm run db:generate -w apps/api && npm run build -w apps/api
  ```
- Start command: `npm run db:deploy -w apps/api && npm run start -w apps/api`
- Environment: `NODE_VERSION=22`, `HOST=0.0.0.0`, `DATABASE_URL` = the Render Postgres **internal** URL,
  `LIVE_SERVER_URL=https://live.<your-domain>`, plus the usual values from `deploy/api.env.production.example`.

Why the old build ran out of memory: installing the whole monorepo pulls in the website toolchain and,
if mediasoup is installed, compiles its C++ media worker. The command above avoids both.

## 2. Render PostgreSQL — let the VPS connect

The live server writes attendance and chat to the same database.
Render dashboard → your database → **Access control** → add the VPS public IP.
Use the **external** connection string on the VPS, with `?sslmode=require` at the end.
No second database is needed.

## 3. VPS — live-class server

```bash
# Ubuntu 22.04/24.04
sudo apt install -y nginx certbot python3-certbot-nginx build-essential python3
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.bashrc && nvm install 22
npm install -g pm2
git clone <repository> /srv/ahmadiya && cd /srv/ahmadiya
npm ci --workspace=apps/api --include-workspace-root --include=dev   # installs mediasoup (prebuilt worker)
cp deploy/api.env.production.example apps/api/.env                     # fill in, see below
npm run db:generate -w apps/api && npm run build:live
pm2 start ecosystem.config.cjs --only ahmadiya-live && pm2 save && pm2 startup
```

`apps/api/.env` on the VPS — same secrets as the Render API (**JWT_ACCESS_SECRET must match**), plus:
```
DATABASE_URL=<Render external URL>?sslmode=require
LIVE_PORT=4001
LIVE_LISTEN_IP=0.0.0.0
LIVE_ANNOUNCED_IP=<VPS public IP>
LIVE_SERVER_URL=https://live.<your-domain>
CORS_ORIGINS=https://<website domain>
```

Firewall: `sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw allow 40000:40200/udp && sudo ufw allow 40000:40200/tcp && sudo ufw enable`

Nginx (`/etc/nginx/sites-available/live`), then `certbot --nginx -d live.<your-domain>`:
```nginx
server {
  server_name live.<your-domain>;
  location /socket.io/ {
    proxy_pass http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
  }
}
```

## 4. Vercel website

Add `NEXT_PUBLIC_LIVE_ORIGIN=https://live.<your-domain>` and redeploy (NEXT_PUBLIC values are fixed at build time).

## Local development

`npm run dev:api` (4000), `npm run dev:live` (4001, needs `LIVE_PORT=4001` in `apps/api/.env`),
`npm run dev:web` (3000, needs `NEXT_PUBLIC_LIVE_ORIGIN=http://localhost:4001` in `apps/web/.env.local`).
