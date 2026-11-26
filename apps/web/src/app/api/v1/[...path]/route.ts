/** The frontend is intentionally offline-first. Never proxy requests to an API server. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const disabled = () => Response.json({ error: { code: 'BACKEND_DISABLED', message: 'Backend access is disabled. Use the local demo data adapter.' } }, { status: 410 });
export const GET = disabled;
export const HEAD = disabled;
export const POST = disabled;
export const PUT = disabled;
export const PATCH = disabled;
export const DELETE = disabled;
export const OPTIONS = disabled;
