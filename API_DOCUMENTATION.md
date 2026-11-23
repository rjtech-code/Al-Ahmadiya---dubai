# API Documentation

Interactive OpenAPI docs: **http://localhost:4000/api/docs** (non-production only).

Base URL: `/api/v1`. Success responses are `{ "data": …, "meta"?: … }`. Errors are `{ "error": { "code", "message", "details"? } }`.

## Auth
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | public | Applicant self-registration. `409 ADMISSIONS_CLOSED` unless admissions are open + confirmed. 5/min |
| POST | `/auth/login` | public | `{email,password,audience:'portal'|'admin',rememberMe}`. Admin audience requires a staff role. Lockout after 5 failures (15 min). 10/min |
| POST | `/auth/refresh` | cookie | Rotates the refresh token. Reuse revokes the whole family. `204` when there is no cookie |
| POST | `/auth/logout` | cookie | Revokes the session family |
| GET | `/auth/me` | bearer | Profile, roles, permissions |
| POST | `/auth/forgot-password` | public | Always `202` (no account enumeration) |
| POST | `/auth/reset-password` | public | Single-use, 30-minute token. Revokes all sessions |

## Public content (`/public`)
`settings`, `stats`, `heritage`, `media`, `colleges`, `colleges/:slug`, `departments/:slug`, `programs?q&level&category&college&featured&page&pageSize`, `programs/:slug`, `courses?featured`, `courses/:slug`, `faculty?q&college&department&specialization`, `faculty/:slug`, `news?category&featured`, `news/:slug`, `events?from&to&category&when=upcoming|past&limit`, `events/:slug`, `research?q&type&year&author`, `research/:slug`, `campus-tour`, `faqs?scope=programs|admissions`, `POST contact`, `POST newsletter`.

## Admissions
| Method | Path | Auth |
|---|---|---|
| GET | `/public/admissions/config` | public |
| POST | `/public/admissions/eligibility` | public |
| POST | `/public/admissions/status` | public (`reference` + `email` both required) |
| GET | `/applications/mine` | applicant |
| POST | `/applications` | applicant. Admissions must be open |
| PUT | `/applications/:id/steps/:1-4` | applicant (own, editable only) |
| POST/DELETE | `/applications/:id/documents[/:docId]` | applicant. PDF/JPEG/PNG ≤5 MB, magic-byte verified |
| POST | `/applications/:id/submit` | applicant |
| GET | `/admin/applications[/:id]` | `admissions.read` |
| GET | `/admin/applications/:id/documents/:docId` | `admissions.review` (audited) |
| POST | `/admin/applications/:id/transition` | `admissions.review`. APPROVED/REJECTED also need `admissions.decide` |

## Administration
`/admin/dashboard` (`dashboard.read`) · `/admin/users` (`users.read`/`users.write`+`roles.write`) · `/admin/roles`, `PUT /admin/roles/:key/permissions` (`roles.*`) · `/admin/settings`, `PUT /admin/settings/:key` (`settings.write`) · `/admin/cms`, `/admin/cms/:resource[/:id]`, `POST …/:id/status` (`cms.read|write|publish`) · `/admin/contact-messages`, `/admin/newsletter-subscribers` (`engagement.read`) · `/admin/audit` (`audit.read`).

CMS resources: `colleges, departments, programs, courses, faculty, news, events, publications, faqs, campus-tour, heritage, media`.

## Mobile readiness
The same versioned endpoints serve the future Student and Faculty apps, using bearer tokens. Device registration and push notifications are not yet implemented.

## Payments
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/public/payments/config` | public | `{ provider: razorpay|test|none, keyId }` |
| POST | `/payments/application/:id` | applicant | Last application step. Returns `{completed:true}` (free) or `{completed:false, checkout}` |
| POST | `/payments/course/:slug` | user | Course purchase; `409 ALREADY_ENROLLED`; free courses activate immediately |
| POST | `/payments/verify` | user | `{orderId,paymentId,signature}` — verified server-side, idempotent |
| POST | `/payments/test/complete` | user | Development test gateway only |
| POST | `/payments/razorpay/webhook` | Razorpay | `X-Razorpay-Signature` over raw body |
| GET | `/me/payments`, `/me/payments/:id/receipt` | user | Own payments / receipt |
| GET | `/admin/payments` | `payments.read` | List + totals |

Submitting an application with an unpaid fee returns **402 `PAYMENT_REQUIRED`**; with an unconfirmed fee **409 `FEE_NOT_CONFIGURED`**.

## Online courses
Admin (`lms.manage`): `GET /admin/lms/courses`, `GET /admin/lms/courses/:id`, `PUT …/:id/online` `{onlineEnabled, deliveryMode, priceAed}`, `POST …/:id/lessons` (multipart `video` + titles; MP4/WebM/MOV verified by magic bytes, ≤ `MAX_VIDEO_MB`), `PUT/DELETE /admin/lms/lessons/:id`, `POST /admin/lms/lessons/:id/video`, `GET /admin/lms/lessons/:id/preview`, `POST …/:id/lessons/reorder`, `POST …/:id/notes` (multipart optional PDF), `PUT/DELETE /admin/lms/notes/:id`, `POST …/:id/quizzes`, `PUT/DELETE /admin/lms/quizzes/:id`.
Student (active enrolment): `GET /me/courses`, `GET /me/courses/:slug` (quiz answers never sent), `GET /me/enrollments/:slug`, `GET /me/lessons/:id/url`, `GET /me/notes/:id/url?download=1`, `POST /me/quizzes/:id/attempts`.
Media: `GET /media/:token` — HMAC-signed, expiring, HTTP Range supported.

## Live classes
Staff (`live.host`): `GET /admin/live/config`, `GET|POST /admin/live/sessions`, `GET /admin/live/sessions/:id`, `POST …/:id/start` (notifies students), `…/end`, `…/cancel`, `POST …/:id/recording` (multipart `video`, `action=draft|publish`, titles, `notesEn/Ar`, `quiz` JSON), `POST …/:id/publish`, `GET …/:id/recording-url`.
Student: `GET /me/live` (includes own attendance), `GET /me/live/:id/join` (403 not enrolled, 409 not live).
Attendance: `GET /admin/live/sessions/:id/attendance` — every enrolled student with first join, last leave, minutes, % of class, joins and status (PRESENT ≥ 75% · LATE = present but joined after 10 min · PARTIAL · ABSENT).

### Live classroom websocket (`socket.io`, namespace `/live`)
Connect with `auth: { token: <access token> }`. Request/acknowledge events: `join {sessionId}` → `{isHost, rtpCapabilities, producers, viewers, participants?, chat, session}`; `createTransport`; `connectTransport {transportId, dtlsParameters}`; `produce {transportId, kind, rtpParameters}` (teacher only); `consume {transportId, producerId, rtpCapabilities}`; `resume {consumerId}`; `chat {body}` (≤500 chars, 1 per 1.5 s); `deleteChat {id}` (teacher). Server events: `presence {viewers}`, `participants [...]` (teacher only), `chat`, `chatDeleted`, `newProducer`, `producerClosed`, `hostLeft`, `ended`. Errors are returned as `{ok:false, error:{code,message}}` (NOT_ENROLLED, NOT_LIVE, FORBIDDEN, TOO_FAST…).

## Programmes & eligibility
`GET /admin/academics/programs[/:id]`, `PUT /admin/academics/programs/:id/curriculum`, `PUT /admin/academics/programs/:id/eligibility`, `POST /admin/academics/eligibility-check` (`academics.manage`, includes drafts), `POST /public/admissions/eligibility/all` (public).

## Account & notifications
`GET /me/overview`, `GET /me/notifications`, `GET /me/notifications/unread-count`, `POST /me/notifications/:id/read`, `POST /me/notifications/read-all`.

## Security
`GET /admin/staff-logins` (`security.read`) — staff sign-ins only; purged after 12 months (daily job 03:00 Asia/Dubai).
