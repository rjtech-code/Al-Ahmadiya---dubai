#!/usr/bin/env bash
# Build and (re)start the platform on the production server. Run from the project folder:
#   bash deploy/deploy.sh
# Requires apps/api/.env and apps/web/.env.production.local (see deploy/*.env.production.example).
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f apps/api/.env ] || { echo "Missing apps/api/.env"; exit 1; }
[ -f apps/web/.env.production.local ] || { echo "Missing apps/web/.env.production.local"; exit 1; }
grep -q '^NODE_ENV=production' apps/api/.env || { echo "apps/api/.env must set NODE_ENV=production"; exit 1; }

echo "==> Installing dependencies"
npm ci --include=dev

echo "==> Generating database client and applying migrations"
npm run db:generate -w apps/api
npm run db:deploy

echo "==> Building"
npm run build

STORAGE_DIR=$(grep -E '^STORAGE_DIR=' apps/api/.env | cut -d= -f2-)
[ -n "$STORAGE_DIR" ] && mkdir -p "$STORAGE_DIR"

echo "==> Starting / reloading"
if pm2 describe ahmadiya-api >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

sleep 5
curl -fsS http://127.0.0.1:4000/api/v1/health >/dev/null && echo "API healthy" || { echo "API health check FAILED: pm2 logs ahmadiya-api"; exit 1; }
curl -fsS -o /dev/null http://127.0.0.1:3000/en && echo "Website healthy" || { echo "Website check FAILED: pm2 logs ahmadiya-web"; exit 1; }
