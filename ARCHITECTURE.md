# Architecture

## Repository

```
apps/
  api/   NestJS 11 modular monolith (REST /api/v1, Swagger at /api/docs)
  web/   Next.js 16 — public bilingual website (/en, /ar) + admin panel (/admin)
RESEARCH/  institutional research, sources, image register
```

npm workspaces. TypeScript strict everywhere (TS 5.9).

## Runtime

```
Browser ──► Next.js (:3000)
              ├─ /en/*, /ar/*   server components fetch API_ORIGIN/api/v1/public/* (ISR 30s–5m)
              ├─ /admin/*       client app (separate root layout, noindex)
              └─ /api/v1/*      rewrite ─► NestJS (:4000) ─► PostgreSQL 16
```

All browser calls are same-origin via the rewrite. This keeps the httpOnly refresh cookie first-party (`SameSite=Strict`, `Path=/api/v1/auth`).

## Backend modules (`apps/api/src`)

| Module | Responsibility |
|---|---|
| `auth` | Register (gated by admissions status), login (portal/admin audience), refresh rotation with reuse detection, logout, password reset, global `JwtAuthGuard` + `PermissionsGuard` |
| `users` | Staff user CRUD, role assignment, role-permission matrix; escalation and self-lockout protection |
| `settings` | Configurable institutional facts with a `CONFIRMED` / `CLIENT_CONFIRMATION_REQUIRED` flag |
| `cms` | Public read API (published, non-demo only) + registry-driven admin CRUD for 12 resources with publish workflow |
| `admissions` | Eligibility rules engine, application drafts, document upload (magic-byte checks, private storage), submission, status lookup, review workflow state machine |
| `engagement` | Contact form (honeypot, throttled), newsletter |
| `audit` | Append-only audit log for sensitive actions |
| `storage` | Private object-storage abstraction (local driver for dev; UAE-region bucket in production) |
| `payments` | Gateway adapters (Razorpay, dev test gateway), application fee as last step, course purchase, verification, webhook, receipts |
| `lms` | Course builder (pricing, lectures, notes, quizzes), learner access gated by active enrolment |
| `live` | **Self-hosted live classroom**: mediasoup SFU + socket.io gateway (`/live`), go-live notifications, enrolment-gated join, automatic attendance, live comments & viewer count, recording draft/publish |
| `academics` | Curriculum + eligibility rules admin, eligibility across all programmes |
| `notifications` | In-app notifications (bell, account) |
| `media` | Signed, expiring media URLs with HTTP Range streaming |
| `maintenance` | 12-month retention purge; staff login history |
| `dashboard`, `health` | Live counts; DB health check |

The core principle from the RFP is that the ERP database is the single source of truth. Future Live-Class/VOD providers will plug in as adapters behind the same modules. They will not be standalone tools.

## Content integrity rules (enforced in code)

- Every confirmable public record (colleges, departments, programmes, courses, faculty, publications, FAQs, tour stops) is shown **only when PUBLISHED and CONFIRMED**. News and events are editorial: publishing is the approval step.
- Settings are only rendered when `CONFIRMED`. Otherwise the site shows “To be announced”.
- `isDemo` records are never served unless `SHOW_DEMO_CONTENT=true`, which the API refuses to start with in production.
- Faculty appear publicly only with `consentToPublish=true` (PDPL).
- Heritage photographs carry visible CC BY-SA attribution. The 1912 building is never presented as the university campus.

## Frontend

- **i18n:** next-intl with `localePrefix: 'always'`, `proxy.ts` (Next 16 convention), and `<html lang dir>` per locale. Messages live in `src/messages/{en,ar}.json`. Logical CSS properties (`ms-`, `ps-`, `start-`) are used throughout for RTL, and `.flip-rtl` mirrors directional icons.
- **Design tokens:** `src/app/globals.css` `@theme`: `brand` deep teal, `gold`, `cream`/sand; Cormorant Garamond / Amiri (display, lining numerals) and Inter / IBM Plex Sans Arabic (body). Motifs: `.arch` (fully rounded top), `.glass` panels, pill controls, circular gold-ringed medallions, `FactsBar`.
- **Motion:** Framer Motion `Reveal`, accordion and mobile menu. It respects `prefers-reduced-motion`.
- **SEO:** per-page `generateMetadata` with canonical + hreflang, OpenGraph, JSON-LD (EducationalOrganization, Course, Event, NewsArticle, ScholarlyArticle, Person), `sitemap.xml`, and `robots.txt` (private routes disallowed, `/admin` noindex header).
