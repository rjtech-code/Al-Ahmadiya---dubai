# Progress

_Last updated: 2026-11-22 (Phase 2: payments, online courses, live classes, staff logins)_

## Milestone status

| # | Milestone | Status | Verified by |
|---|---|---|---|
| 0 | Research & evidence (RESEARCH/) | ✅ Done | Sources cited in RESEARCH/OFFICIAL_SOURCES.md |
| 1 | Backend foundation (NestJS 11, config, errors, validation, Swagger) | ✅ Done | `tsc`, ESLint, server boot, `/api/docs` |
| 2 | Database & authentication (Prisma 7 / PostgreSQL 16, Argon2id, JWT + rotating refresh, lockout, reset, RBAC, audit) | ✅ Done | 24 Jest tests (unit + e2e) |
| 3 | Frontend foundation (Next 16, next-intl EN/AR, RTL, design tokens, header/footer) | ✅ Done | Build, browser screenshots EN/AR/mobile |
| 4 | All 25 public pages | ✅ Implemented — content pending client | HTTP 200 for all routes in EN + AR; 404 for unknown slugs |
| 5 | Admin foundation (login, dashboard, users, roles matrix, settings, CMS ×12 resources, admissions review, messages, audit) | ✅ Done | Browser test: login → dashboard → CMS create/publish/delete → all sections |
| 6 | API integration (website + admin read/write through `/api/v1` proxy) | ✅ Done | curl + browser |
| 7 | Testing & fixes | ✅ Phase 1 review done | QA_REPORT.md — 40 API tests, 56-route sweep, 3 browser journeys |
| 7a | Development-only demo data (`npm run db:seed:demo -w apps/api`, `-- --remove` to delete) | ✅ Done | Idempotent (ran twice, identical counts); never touches real records or settings |
| 7b | New visual design (sand/teal/gold, arch motifs, pill nav) applied to all public pages and admin | ✅ Done | Screenshots desktop/mobile, EN/AR |
| 7c | Public visibility = published **and** client-confirmed | ✅ Done | 12 CMS lifecycle tests |
| 8 | Programmes admin: single-page builder (details → curriculum → eligibility → publish), eligibility checker (admin + public “which programmes can I apply for”) | ✅ Done | API tests + browser |
| 9 | Payments: application fee = last application step; course purchase; receipts; Razorpay adapter (+ dev test gateway) | ✅ Done — Razorpay keys pending | 46 API tests + browser |
| 10 | Online courses (LMS): 7-step builder, video lectures (upload with progress, signed streaming with Range), notes (read/download), quizzes, student dashboard | ✅ Done | API tests + browser (real WebM played) |
| 11 | Live classes **on our own media server** (mediasoup + socket.io, no third-party): go-live notifications, enrolment-gated join, automatic attendance (join/leave, minutes, Present/Late/Partial/Absent, CSV), live comments with moderation, viewer count, teacher sees who joined, camera/screen/mic, browser recording → draft/download/publish | ✅ Done | 47 API tests (incl. websocket) + browser with fake camera |
| 12 | Student account (/account): applications, fee due/receipts, courses, live, notifications bell | ✅ Done | browser |
| 13 | Staff login history (staff only, 12-month auto-delete); audit noise removed | ✅ Done | API tests |
| 14 | ERP: SIS, Finance ledger, HR/payroll | ⬜ Not started | — |
| 15 | SMS/WhatsApp, e-mail, UAE PASS | ⬜ Blocked on credentials | INTEGRATIONS.md |

## Public pages checklist (25)

All routes exist under `/en/...` and `/ar/...`. ✅ = sections implemented and rendering; content marked **TBA** renders an honest “To be announced” state until the client supplies it.

| # | Page | Route | Data source | Real content today |
|---|---|---|---|---|
| 01 | Home | `/` | heritage, colleges, programmes, news, events | ✅ Verified heritage; others TBA |
| 02 | About | `/about` | heritage timeline (9 sourced milestones), settings | ✅ History; vision/mission TBA |
| 03 | Colleges & Departments | `/colleges` | CMS | TBA |
| 04 | College Detail | `/colleges/[slug]` | CMS | TBA (layout verified via API tests) |
| 05 | Department Detail | `/departments/[slug]` | CMS | TBA |
| 06 | Programmes & Courses | `/programs` | CMS + filters | TBA |
| 07 | Programme Details | `/programs/[slug]` | CMS | TBA |
| 08 | Course Details | `/courses/[slug]` | CMS | TBA |
| 09 | Faculty Directory | `/faculty` | CMS (consent-gated) | TBA |
| 10 | Faculty Profile | `/faculty/[slug]` | CMS | TBA |
| 11 | News & Events | `/news` | CMS | TBA |
| 12 | News Details | `/news/[slug]` | CMS (safe Markdown) | TBA |
| 13 | Events Calendar | `/events` | CMS + interactive month grid | TBA |
| 14 | Event Details | `/events/[slug]` (+ `.ics`) | CMS | TBA |
| 15 | Research Publications | `/research` | CMS + filters | TBA |
| 16 | Publication Details | `/research/[slug]` | CMS | TBA |
| 17 | Virtual Campus Tour | `/campus-tour` | CMS + heritage gallery | ✅ Heritage; campus TBA |
| 18 | Contact | `/contact` | settings + working form | ✅ Form; address/phone TBA |
| 19 | Admissions Landing | `/admissions` | settings + config | ✅ “Not yet open” state |
| 20 | Eligibility Check | `/admissions/eligibility` | backend rules engine | ✅ Engine; rules TBA |
| 21 | Registration | `/register` | `/auth/register` | ✅ Gated: opens with admissions |
| 22 | Login | `/login` (+ `/login/reset`) | auth API | ✅ Working |
| 23 | Online Application | `/admissions/apply` | 7-step wizard, uploads | ✅ Working when admissions open |
| 24 | Application Fee | `/admissions/payment` | — | ⛔ Intentionally non-operational (fee & gateway unconfirmed) |
| 25 | Status Tracking | `/admissions/status` | reference + e-mail lookup | ✅ Working |

## Phase 1 review — files changed

- **API:** `prisma/schema.prisma` + migration `faq_is_demo`; `prisma/seed-demo.ts` (new); `package.json` (`db:seed:demo`); `src/cms/cms-public.controller.ts` (confirmed-only visibility, demo-mode meta, related-publication authors fix); `src/admissions/admissions.service.ts` (same rule for programmes); `test/app.e2e-spec.ts` (+16 tests); `.env` (dev: `SHOW_DEMO_CONTENT=true`).
- **Web — design system:** `app/globals.css` (new tokens: brand teal / gold / sand, arch, glass, lining numerals), `app/[locale]/layout.tsx` (Cormorant Garamond, demo banner), `components/ui/*` (pill buttons, cards, tabs, pagination, safe `Reveal`), `components/forms/*`.
- **Web — layout:** `components/site/Header.tsx` (dropdown pill nav, search overlay, `العربية | EN`, portal button), `Logo.tsx` (arch mark), `PageHero.tsx` (sand band + arch frame), `Cards.tsx` (arch windows, circular portraits, date medallions), `FactsBar.tsx` (new), `Footer.tsx`, `CtaBand.tsx`, `EventCalendar.tsx`; pages rebuilt: home, about, admissions; restructured: programme, course, faculty profile, contact, event; `LanguageSwitcher.tsx` removed (merged into header).
- **Admin:** `app/admin/layout.tsx`, `components/admin/AdminShell.tsx`, `ui.tsx`, `CmsEditor.tsx` (DEMO + “Hidden: awaiting confirmation” pills), login, settings, roles, CMS index.
- **Messages:** `messages/en.json`, `messages/ar.json` (header, home, demo banner keys).

## Blockers (external)

1. **Client documents:** see `RESEARCH/CONTENT_GAPS.md` (licensing, branding, programmes, contacts, photography).
2. **Razorpay account & keys** (test keys to try real checkout; live keys + webhook secret for production). Note: Razorpay is an Indian gateway — confirm it can serve a UAE institution and AED settlement, or switch adapter to a UAE gateway (Network International / Telr / PayTabs).
3. **Live-class hosting:** server with public IP, open media ports, HTTPS and a TURN server (see DEPLOYMENT.md).
3. **E-mail provider** (Microsoft 365 / Google Workspace). Password-reset links are only logged to the API console in development.
4. **Redis** is not installed locally. The background-job layer (BullMQ) is deferred until notifications and ERP jobs need it.

## Next steps (resume here — awaiting user review before the next phase)

1. Slug reuse after archiving: soft-deleted records keep their slug reserved (409 on reuse). Decide: free the slug on archive, or offer restore.
2. Payment module: provider abstraction + sandbox driver + signed webhook + idempotency + receipts (backend only, UI stays disabled until confirmed).
3. ERP phase 1: Academic structure → SIS (admission conversion, student IDs, registration, prerequisites, GPA).
4. Add Playwright to the repo for automated browser E2E (the current browser checks run from a scratch script).
5. MFA (TOTP) enrolment for staff.
