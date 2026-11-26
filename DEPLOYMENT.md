# Frontend-only deployment

The Al Ahmadiya website and ERP frontend now run in local-demo mode. The web application does not connect to NestJS, PostgreSQL, Render, or an external authentication service. ERP demo records and role selection are stored in the browser's local storage.

## Local development

Requires Node.js 22+.

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
npm run dev:web
```

Open:
- Website: http://localhost:3000/en
- Admin / role selection: http://localhost:3000/admin/login

Choose a demo role. The role is stored locally and opens its workspace directly. No API server or database is required.

## Vercel deployment

- Set the Vercel Root Directory to `apps/web`.
- Build command: `npm run build`.
- Install command: `npm install`.
- Add `NEXT_PUBLIC_SITE_URL` with the canonical website origin.
- Do not configure `API_ORIGIN`, `NEXT_PUBLIC_API_ORIGIN`, `NEXT_PUBLIC_LIVE_ORIGIN`, database credentials, or backend secrets for this frontend.

The frontend intentionally disables API proxying and live signalling. CRUD demo actions are stored in browser local storage and are local to each browser/device. Clearing browser storage resets the demo data.

## Important limitations

This is a frontend demonstration environment, not a production ERP deployment. Local demo data is not shared between users or devices. Real payments, live streaming, private document uploads, email delivery, and cross-device account authentication are not available in this mode. The NestJS source remains in the repository for reference but is not used by the website.
