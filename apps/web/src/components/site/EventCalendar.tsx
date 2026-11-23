'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { EventSummary } from '@/lib/types';
import { cn } from '../ui/cn';

const DUBAI = 'Asia/Dubai';
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: DUBAI, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** Month grid; days with events are highlighted and selectable. Month navigation is link-based (works without JS). */
export function EventCalendar({ year, month, events, category }: { year: number; month: number; events: EventSummary[]; category?: string }) {
  const t = useTranslations('events');
  const locale = useLocale();
  const loc = locale === 'ar' ? 'ar-AE' : 'en-GB';
  const today = ymd(new Date());
  const byDay = useMemo(() => {
    const m = new Map<string, EventSummary[]>();
    for (const e of events) { const k = ymd(new Date(e.startsAt)); m.set(k, [...(m.get(k) ?? []), e]); }
    return m;
  }, [events]);
  const [selected, setSelected] = useState<string | null>(null);

  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = first.getUTCDay(); // Sunday-first, matching the collage
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + i))));
  const monthLabel = new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
  const shift = (d: number) => { const n = new Date(Date.UTC(year, month - 1 + d, 1)); return `/events?month=${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}${category ? `&category=${category}` : ''}`; };
  const key = (d: number) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const selectedEvents = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div className="glass rounded-[2rem] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href={shift(-1)} scroll={false} aria-label={t('previousMonth')} className="grid size-9 place-items-center rounded-md hover:bg-brand-50"><ChevronLeft className="flip-rtl size-5" /></Link>
        <h2 className="font-display text-lg font-semibold text-brand-900" aria-live="polite">{monthLabel}</h2>
        <Link href={shift(1)} scroll={false} aria-label={t('nextMonth')} className="grid size-9 place-items-center rounded-md hover:bg-brand-50"><ChevronRight className="flip-rtl size-5" /></Link>
      </div>
      <table className="w-full table-fixed border-collapse text-center text-sm">
        <thead><tr>{weekdays.map((w) => <th key={w} scope="col" className="pb-2 text-xs font-semibold text-muted">{w}</th>)}</tr></thead>
        <tbody>
          {Array.from({ length: Math.ceil(cells.length / 7) }, (_, r) => (
            <tr key={r}>
              {cells.slice(r * 7, r * 7 + 7).concat(Array(Math.max(0, 7 - cells.slice(r * 7, r * 7 + 7).length)).fill(null)).map((d, c) => {
                if (!d) return <td key={c} />;
                const k = key(d);
                const has = byDay.has(k);
                return (
                  <td key={c} className="p-0.5">
                    <button
                      type="button"
                      disabled={!has}
                      onClick={() => setSelected(selected === k ? null : k)}
                      aria-pressed={selected === k}
                      aria-label={has ? `${d} — ${byDay.get(k)!.length}` : String(d)}
                      className={cn('mx-auto grid size-9 place-items-center rounded-full text-sm transition-colors',
                        has ? 'bg-gold-100 font-semibold text-brand-900 hover:bg-gold-400' : 'text-brand-900/70',
                        selected === k && 'bg-brand-900 text-white hover:bg-brand-900',
                        k === today && 'ring-2 ring-gold-500')}
                    >
                      {d}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {selected && (
        <ul className="mt-4 space-y-2 border-t border-line pt-4" aria-live="polite">
          {selectedEvents.length ? selectedEvents.map((e) => (
            <li key={e.id}><Link href={`/events/${e.slug}`} className="text-sm font-semibold text-brand-800 hover:text-gold-700">{locale === 'ar' ? e.titleAr : e.titleEn}</Link></li>
          )) : <li className="text-sm text-muted">{t('noEventsDay')}</li>}
        </ul>
      )}
    </div>
  );
}
