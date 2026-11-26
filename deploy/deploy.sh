#!/usr/bin/env bash
set -euo pipefail

# Frontend-only validation/build. Production deployment is handled by Vercel.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Installing workspace dependencies"
npm install

echo "==> Linting the Next.js frontend"
npm run lint -w apps/web

echo "==> Type-checking the Next.js frontend"
npm run typecheck -w apps/web

echo "==> Building the Next.js frontend"
npm run build -w apps/web

echo "Frontend build complete. Deploy the apps/web project through Vercel."
