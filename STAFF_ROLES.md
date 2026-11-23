# Staff roles — what each role controls and where it shows on the site

Staff sign in at **/admin/login**. The sidebar only shows the sections a role has permission for, and the API enforces the same permissions on every request. Students and applicants use the public site and **/account**; they can never open /admin.

| Role | Admin sections they see | What they do | Where their work appears on the public site |
|---|---|---|---|
| **Super Admin** | Everything | Full control; only role that can create other Super Admins; permissions cannot be reduced | — |
| **University Administrator** | Dashboard, Applications (view), Programmes & eligibility, Online courses, Live classes, Payments, Website content (publish), Site settings, Messages, Staff & users (view), Roles (view), Staff logins | Runs the site day-to-day; confirms institutional facts in Site settings | Header/footer contact details, About page vision/mission, every published page |
| **Admissions Officer** | Dashboard, Applications (review **and approve/reject**), Programmes & eligibility, Payments | Reviews applications, verifies documents, approves/rejects; maintains eligibility rules | Status on **/admissions/status**; applicant’s **/account → Applications**; eligibility results on **/admissions/eligibility** |
| **Admissions Reviewer** | Dashboard, Applications (review only) | Moves applications to *Under review / Documents pending / Returned*; cannot approve or reject | Applicant status timeline |
| **Registrar** | Dashboard, Applications (view) | Read-only oversight of admissions (student records/SIS arrive in the ERP phase) | — |
| **Academic Administrator** | Dashboard, Programmes & eligibility, Online courses, Live classes, Website content (drafts) | Builds programmes (details → curriculum → eligibility), builds courses (price, lectures, notes, quizzes), schedules live classes | **/programs/…**, **/courses/…** (price + Enrol), student **/account/courses/…** |
| **Faculty Member** | Dashboard, Online courses, Live classes | Uploads lectures/notes/quizzes, goes live, records the class and publishes the recording | Students get a notification; class appears in **/account → Live classes**; recording becomes a lecture |
| **Finance Manager / Finance Officer** | Dashboard (manager), Payments | Sees every application-fee and course payment, receipts and gateway references | Student **/account → Payments & receipts** |
| **Content Editor** | Dashboard, Website content (draft only), Messages | Writes news, events, pages; cannot publish (a publisher must approve) | News, events, research pages once published |
| **HR Manager** | Dashboard | Placeholder until the HR/payroll module is built | — |
| Applicant / Student | *(no admin access)* | Apply, pay, buy courses, study, join live classes | **/account** |

## Key workflows across roles

1. **Admissions:** Academic Admin sets programme eligibility → applicant checks eligibility, applies (login required), pays the fee in the last step (Razorpay) → application is submitted automatically after the payment is verified → Reviewer/Officer reviews → Officer approves → applicant sees the result in their account and on the status page.
2. **Online course:** Academic Admin/Faculty creates the course in the 7-step builder and sets a price → student signs in and pays on the course page → course activates in **/account → My courses** → videos stream via short-lived signed links, notes can be read or downloaded, quizzes are scored on the server.
3. **Live class (on our own server, no third-party tool):** Faculty schedules a class (students notified) → clicks *Go live* (camera + mic start; every enrolled student gets a “Live now” notification) → students join from their account; **attendance is recorded automatically as each student joins and leaves**; the teacher sees the viewer count and the names (with join time) of everyone in class, plus live comments they can moderate → teacher ends the class → attendance table (Present / Late / Partial / Absent, CSV export) → **Save as draft / Download / Upload & publish** the recording (with extra notes and a quiz).

## Security records
- **Staff login history** (Admin → Staff logins): every staff sign-in and failed attempt, with IP and browser. Student logins are not recorded. **Deleted automatically after 12 months.**
- A minimal staff action trail (approvals, payments, role changes, course/live changes) is kept for accountability and is also deleted after 12 months. Applicant sign-ins and registrations are no longer logged.
