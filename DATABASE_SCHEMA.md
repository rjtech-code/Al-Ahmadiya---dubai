# Database Schema

PostgreSQL 16. Prisma 7 schema: `apps/api/prisma/schema.prisma`. Migrations: `apps/api/prisma/migrations/`.

| Domain | Tables |
|---|---|
| Identity & access | `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `Session` (hashed refresh tokens, family-based rotation), `PasswordReset` |
| Audit | `AuditLog` (indexed by entity, actor, time) |
| Configuration | `SiteSetting` (key, valueEn/valueAr, confirmation, sourceUrl, note) |
| Media & heritage | `MediaAsset` (licence, author, source, approval), `HeritageMilestone` (sourceUrls[], caveats) |
| Academic catalogue | `College`, `Department`, `Program`, `Course`, `CoursePrerequisite`, `ProgramCourse`, `FacultyMember` (consent flag) |
| Editorial | `NewsArticle`, `Event`, `EventAgendaItem`, `EventSpeaker`, `Publication`, `PublicationAuthor`, `Faq`, `CampusTourStop` |
| Engagement | `ContactMessage`, `NewsletterSubscriber` |
| Admissions | `EligibilityRule`, `Application` (random non-sequential reference), `ApplicationStatusEvent`, `ApplicationDocument` (private storage key, SHA-256) |
| Payments | `Payment` (user, application **or** enrollment, minor units, provider order id + payment id unique, idempotency key, receipt number) |
| Online learning | `Course` (+ `onlineEnabled`, `deliveryMode`, `priceFils`), `Lesson` (private video key, size), `CourseNote` (text and/or private PDF), `Quiz` (questions JSON incl. correct index — never sent to students), `QuizAttempt`, `Enrollment` (PENDING_PAYMENT → ACTIVE) |
| Live classes | `LiveSession` (unguessable room, status, recording key + DRAFT/PUBLISHED; published recording links to a `Lesson`) |
| Notifications & security | `Notification` (per user, read state), `StaffLogin` (staff only; 12-month retention) |

Conventions: UUID keys; bilingual paired columns; `publishStatus` + `confirmation` on public content; `deletedAt` soft delete where content may be referenced; `isDemo` for dev-only sample records.

Seeding: `npm run db:seed -w apps/api` seeds permissions, 13 roles, the initial Super Admin (from env), 26 settings (21 awaiting confirmation), 9 sourced heritage milestones and 4 licensed heritage images. **No fabricated programmes, faculty, news or statistics.**

Planned: SIS (Student, Enrollment, Grade, Transcript), Academic (Term, Section, TimetableSlot, Room), Finance (Invoice, LedgerEntry, Scholarship, Installment), HR (Employee, Contract, Leave, Payroll), Live classes (ClassSession, AttendanceEvent, Recording).
