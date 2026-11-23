import { revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';

/** Called by the API after admin content changes so public pages refresh immediately (instead of after the ISR window). */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? '';
  const given = req.headers.get('x-revalidate-secret') ?? '';
  const ok = secret.length > 0 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return Response.json({ error: 'forbidden' }, { status: 403 });
  revalidateTag('cms', { expire: 0 });
  return Response.json({ revalidated: true });
}
