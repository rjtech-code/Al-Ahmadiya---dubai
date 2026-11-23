# QA Report — 2026-11-22 (updated after Phase 1 review)

## Automated
| Check | Result |
|---|---|
| API ESLint | ✅ 0 problems |
| Web ESLint (next/core-web-vitals + TS) | ✅ 0 problems |
| `tsc --noEmit` API + web (strict) | ✅ |
| Jest — 6 unit tests (eligibility engine, workflow state machine, reference format) | ✅ |
| Jest — 18 e2e tests against real PostgreSQL (health, heritage, settings confirmation, draft/demo hiding, contact validation, auth errors, registration gating, password policy, anonymous refresh, refresh rotation + reuse revocation, lockout, RBAC 401/403, admin-audience denial, editor cannot publish, escalation prevention, audit entries, closed-admissions block, full application flow incl. magic-byte upload rejection, status lookup privacy, invalid transition 409, approve) | ✅ 24/24 total |
| `nest build` | ✅ |
| `next build` (production) | ✅ |

## Manual / browser (headless Chrome)
| Check | Result |
|---|---|
| All 25 public routes × EN/AR | ✅ HTTP 200 |
| Unknown route / unknown slug | ✅ HTTP 404 (fixed: a streaming `loading.tsx` had caused 200s) |
| `<html lang dir>` and RTL layout (Arabic About page) | ✅ |
| Mobile 390 px header | ✅ (fixed: `hidden` vs `inline-flex` class conflict) |
| Admin: redirect when signed out, wrong-password error, login, session restore after reload, CMS create→publish→delete, all 8 sections render | ✅ |
| robots.txt / sitemap.xml / admin `X-Robots-Tag: noindex` | ✅ |
| Browser console | ✅ Clean except the expected 401 on a deliberately wrong password |

## Known limitations
- Detail-page layouts (college, programme, course, faculty, news, event, publication) are verified through the API and build. They have **not yet been visually reviewed with data**, because no institutional content exists yet. A dev-only demo seed is next.
- The admin UI is English-only (the content it edits is bilingual).
- Arabic copy was written by the developer and **needs review by a native Arabic editor** before launch.
- No automated accessibility audit (axe) has run yet. Manual checks covered skip link, focus rings, ARIA on tabs/accordion/stepper, and form labels.
- Payment, e-mail, SMS, UAE PASS and live classes are not implemented (see INTEGRATIONS.md).


## Phase 1 review (demo data + redesign)

### Automated
| Check | Result |
|---|---|
| Lint (API + web) | ✅ 0 problems |
| Typecheck (API incl. tests + web) | ✅ (fixed an implicit-any in the new CMS test that ts-jest did not catch) |
| Jest | ✅ **40/40** — added: anonymous refresh 204, related publications include authors, 12 × CMS lifecycle (validation 400 with field details, draft private, editor cannot publish 403, publish → public, EN/AR on the same record, published-but-unconfirmed hidden, edit persisted, unauthenticated 401), delete for all 12 resources (editor 403, admin 204, public removal, admin 404), unknown resource 404, malformed id 400, invalid slug / assessment weights ≠100 / DOI / end-before-start all 400 |
| `nest build`, `next build` | ✅ |
| Demo seed idempotency | ✅ ran twice: colleges 3, departments 5, programmes 6, courses 9, faculty 7, news 4, events 5, publications 4, FAQs 8, tour 5 — identical counts, no duplicate curriculum/agenda/author rows |

### Route sweep (production-like dev server, demo mode on)
56 checks: 26 routes × EN/AR all **200** with no `undefined` / `NaN` / `[object Object]` in rendered text; unknown slugs **404** in both languages. Detail pages verified to show the requested record (title match) and the `.ics` export.

### Browser (headless Chrome via puppeteer-core, scratch scripts)
| Journey | Result |
|---|---|
| Admin: signed-out redirect, wrong password, login, reload keeps session, CMS create → publish → delete, all 8 sections | ✅ (console: only the intentional wrong-password 401) |
| Applicant: eligibility fail/pass (backend rules), registration validation, register → wizard, server validation on empty step, 4 steps saved without input focus loss, PDF upload, review, submit, Arabic status tracking, admin sees application | ✅ (console: only the intentional empty-step 400). Admissions setting restored to CLOSED and test data deleted afterwards |
| Broken images / horizontal overflow on 16 page captures (1440 px + 390 px) | ✅ none |

### Issues found and fixed
1. **Publication detail 500** — related publications were returned without `authors`; fixed in API + defensive card; regression test added.
2. **Published-but-unconfirmed content was public** — now hidden for all confirmable types (and admissions programme lists); admin shows a “Hidden: awaiting confirmation” pill.
3. **About timeline cards invisible** — scroll-reveal started at opacity 0 and never fired in some renders. `Reveal` now never hides content (slide-only), so content is visible without JS and to crawlers.
4. **Centred section headings rendered right-aligned** — conflicting flex classes.
5. **Wizard review step lacked its heading** (`reviewTitle` unused) — added.
6. **Old-style numerals** in Cormorant made “0/1” read as “o/I” in stats — lining numerals forced.
7. Requirement card stretching, oversized placeholders (dark → light), faculty profile layout — aligned to the design.

### Known limitations (unchanged or new)
- Archived (soft-deleted) records keep their slug reserved; reusing it returns 409.
- No real photography: CMS records without images show labelled “Photograph to be supplied” placeholders.
- Mockup elements intentionally **not** reproduced literally: “Admissions Open” (shown only when the setting is confirmed), “Watch Video” (no video exists — replaced by Virtual tour), “Timetable/Library/Check Result” quick links (modules not built — replaced by existing functions), mockup building imagery (would misrepresent the campus).
- Arabic copy still needs native-editor review; admin UI is English-only.


## Phase 2 — payments, online courses, live classes (2026-11-22)

### Automated (Jest, real PostgreSQL)
46/46 pass. New: application fee 402 until paid → server-verified payment submits the application; forged signature rejected (400, nothing submitted); idempotent completion (one receipt); receipt not visible to another user; course builder validation (fake video rejected by magic bytes, invalid quiz rejected, students 403); purchase requires login (401), activation after payment, double purchase 409, content 403 for non-enrolled; signed video URL with Range → 206; tampered media token 403; notes download disposition; quiz scoring without leaking answers; live: join 409 before start, notification “Live now” with link, join 403 for non-enrolled, recording draft → publish creates lesson + notes + quiz, second publish 409; staff logins recorded for staff only (applicant login not recorded), failed attempts with reason, retention purge removes >12-month rows; eligibility rules + all-programmes check incl. unmet reasons; duplicate qualification rule 400.

### Browser (headless Chrome)
24/24 steps: admin 7-step course builder (real WebM lecture uploaded and later played back), notes, quiz, live class scheduling; student registers while admissions are closed, sees “Sign in to enrol”, pays through the test gateway, course activates, video plays via signed URL, notes open, quiz 1/1; admin goes live → student bell + live banner → join page; admin ends class → recording draft → published with extra notes → appears as a lecture; receipt in account; admin payments; staff logins (no student entries); programme builder eligibility; admin + public eligibility checks. Console: only Jitsi device errors (headless browser has no camera/mic).

### Issues found and fixed
1. Registration was gated by admissions status, blocking course buyers → registration always open; applications still gated.
2. Admin changes appeared on public pages only after the ISR window (≤60 s) → on-demand revalidation (`/api/revalidate`, shared secret) triggered after admin writes; verified the course panel appears within 2 s.
3. Success messages disappeared after 2.5 s → 6 s.
4. Prisma `migrate dev` refused a non-interactive run (required column on empty `Payment`) → migration generated with `migrate diff`, reviewed (additive only), applied with `migrate deploy`.

### Known limitations
- Razorpay not exercised against the real gateway (no keys); flow verified with the protocol-compatible test gateway.
- `meet.jit.si` limits embedded sessions; production Jitsi/JaaS required. Live attendance tracking not implemented.
- Video is served as uploaded (no HLS transcoding/DRM watermarking yet); download is discouraged (`controlsList=nodownload`) but not prevented.
- Archived records keep their slug reserved (409 on reuse).
- Every page ships the full translation catalogue to the browser — trim per page for performance.


## Phase 3 — self-hosted live classroom (2026-11-22)
- Jitsi removed. Live classes now run on our own mediasoup SFU inside the API with socket.io signalling.
- **Jest 47/47** — new websocket test: join before start refused (NOT_LIVE); host joins; non-enrolled student refused (NOT_ENROLLED); enrolled student joins → attendance row written, teacher receives participant names, viewer count; student cannot broadcast (FORBIDDEN); comments broadcast; rate limit (TOO_FAST); only teacher can delete comments; live attendance report shows the student online; ending the class emits `ended` to students and finalises attendance (seconds, last left).
- **Browser (Chrome with fake camera/mic), 10/10:** teacher goes live and broadcasts; student notified; student receives the teacher's video on our site (960×540) with viewer count; teacher sees the student's name + join time and "1 watching"; comments both ways; attendance panel; 4 s browser recording; end class → student sees "class ended", attendance saved (join/leave times, % of class); recording published. No console errors.
- **Bugs found and fixed:** (1) site-wide `Permissions-Policy` blocked camera/microphone → allowed for our own origin only; (2) header/bell did not update after sign-in until reload (each component had its own session state) → single shared session store; (3) student live page crashed during server rendering (`MediaStream` used at render) → created in the browser only; (4) tracks arriving before the player mounted were not attached → attach on mount; (5) attendance table could show a stale snapshot right after ending → cleared and re-fetched; now also refreshes instantly on every join/leave.
- **Limits:** one teacher broadcasting (students watch, comment); hand-raise/student video not implemented; single media worker — scale-out needed for very large classes; TURN server required in production for strict networks.
