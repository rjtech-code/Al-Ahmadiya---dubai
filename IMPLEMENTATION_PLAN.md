# Implementation Plan

| Phase | Scope | Depends on |
|---|---|---|
| 1 ✅ | Foundation: monorepo, API, DB, auth/RBAC, audit, CMS, admissions core, 25 public pages, admin foundation | — |
| 2 ✅ (partial) | Demo seed ✅; new design applied ✅; confirmed-only visibility ✅; CMS lifecycle tests ✅. Remaining: Playwright in repo (currently scratch puppeteer scripts), axe audit, MFA (TOTP), draft preview, slug release on archive | — |
| 3 | Payment module (adapter + sandbox + webhooks + receipts) | Gateway choice (blocked) |
| 4 | Academic structure + SIS (terms, sections, rooms, timetable with clash detection, admission → student conversion, registration, prerequisites, GPA, transcripts) | Approved programmes |
| 5 | Finance (invoices, VAT rules as configuration, scholarships, installments, holds, ledger) | Finance policy |
| 6 | HR (employees, contracts, leave, payroll preparation, procurement, assets, library) | — |
| 7 | Live classes & VOD via provider adapter; attendance sync; fee/enrollment gate; signed HLS playback | Provider licence |
| 8 | Notifications (BullMQ + Redis), e-mail/SMS/WhatsApp, mobile push, device registration | Providers |
| 9 | Hardening: VAPT, load tests, backups/DR drill, UAE-region deployment | Authorisation |
