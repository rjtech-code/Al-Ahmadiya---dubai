# Architecture

## Repository

```
apps/
  api/   NestJS source retained for reference; not used by the frontend demo
  web/   Next.js 16 — bilingual website (/en, /ar) + ERP/admin + student portal
RESEARCH/  institutional research, sources, image register
```

npm workspaces. TypeScript strict everywhere.

## Runtime — frontend local mode

```
Browser ──► Next.js (:3000)
              ├─ Public pages use bundled frontend content/fallbacks
              ├─ /admin/* uses local demo role + role-specific workspace
              ├─ /portal/* uses local demo session and local demo API adapter
              └─ ERP reads/writes are stored in browser localStorage
```

The frontend does not proxy `/api/v1/*` to NestJS. The catch-all API route returns a disabled response, server-side public API wrappers do not fetch a remote API, and live-class signalling is disabled in local-only mode.

## Backend source retained for reference

The `apps/api/src` directory remains in this repository, but it is not started by the web app and is not required to run or build the frontend. No database or backend environment variables are required for the frontend demo.

## Frontend

- **i18n:** next-intl with `localePrefix: 'always'`, `proxy.ts` (Next 16 convention), and `<html lang dir>` per locale. Messages live in `src/messages/{en,ar}.json`.
- **Design tokens:** `src/app/globals.css` design system and responsive layouts.
- **Motion:** Framer Motion and reduced-motion support.
- **SEO:** per-page metadata, canonical/hreflang, OpenGraph, JSON-LD, sitemap and robots directives.
