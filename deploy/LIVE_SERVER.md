# Frontend-only deployment

This repository is configured to run the public website and ERP demo as one Next.js application. Do not provision or start the NestJS API, PostgreSQL, mediasoup or a separate live-class service for this preview.

## Vercel

- Root Directory: `apps/web`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output: Next.js default
- Required environment variable: `NEXT_PUBLIC_SITE_URL`
- No API, database, JWT, storage or live-server environment variables are required.

## Local development

```bash
npm install
npm run dev
```

The application is available at http://localhost:3000. Select a staff role at `/admin/login` or open the Student Portal demo. All ERP demo data is stored in browser localStorage.

## Operational limitations

This deployment is a frontend-only demonstration. Real payment processing, email, cross-device persistence, private document storage, live audio/video and server-side authentication are disabled. Do not use it to process real student or staff information.
