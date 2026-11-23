import { api } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** iCalendar export for "Add to calendar". */
export async function GET(_req: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const e = await api.event(slug).catch(() => null);
  if (!e) return new Response('Not found', { status: 404 });
  const ar = locale === 'ar';
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Al Ahmadiya//Events//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${e.id}@al-ahmadiya`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(e.startsAt)}`, `DTEND:${stamp(e.endsAt)}`,
    `SUMMARY:${esc(ar ? e.titleAr : e.titleEn)}`, `DESCRIPTION:${esc(ar ? e.summaryAr : e.summaryEn)}`,
    ...(e.venueEn ? [`LOCATION:${esc((ar ? e.venueAr : e.venueEn) ?? '')}`] : []),
    `URL:${SITE_URL}/${locale}/events/${e.slug}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${e.slug}.ics"` } });
}
