'use client';

import { ChevronLeft, ChevronRight, ClipboardCheck, Radio } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Card, Empty, ErrorBox, Loading, PageTitle, Pill, Segmented, useApi, useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';

interface E { kind: 'class' | 'deadline'; id: string; at: string; endsAt: string; titleEn: string; titleAr: string; code: string; status: string; teacher: string | null }
type View = 'day' | 'week' | 'month';
const DAY = 86_400_000;
const OFFSET = 4 * 3600_000; // Dubai
/** Midnight (Dubai) of the day containing t, as UTC ms. */
const dayStart = (t: number) => Math.floor((t + OFFSET) / DAY) * DAY - OFFSET;
const key = (t: number) => new Date(t + OFFSET).toISOString().slice(0, 10);

export default function Schedule() {
  const t = useTranslations('portal.schedule');
  const f = useFmt();
  const [view, setView] = useState<View>('week');
  const [todayStart] = useState(() => dayStart(Date.now()));
  const [anchor, setAnchor] = useState(todayStart);
  const [selected, setSelected] = useState<number | null>(null);

  const isoDow = (t0: number) => ((new Date(t0 + OFFSET).getUTCDay() + 6) % 7);
  const range = (() => {
    if (view === 'day') return [anchor, anchor + DAY];
    if (view === 'week') { const s = anchor - isoDow(anchor) * DAY; return [s, s + 7 * DAY]; }
    const d = new Date(anchor + OFFSET); const first = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - OFFSET;
    const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - OFFSET;
    const s = first - isoDow(first) * DAY; return [s, s + Math.ceil((next - s) / DAY / 7) * 7 * DAY];
  })();
  const { data, error } = useApi<E[]>(`/me/portal/schedule?from=${new Date(range[0]).toISOString()}&to=${new Date(range[1]).toISOString()}`);
  const move = (dir: -1 | 1) => {
    if (view === 'month') { const d = new Date(anchor + OFFSET); setAnchor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + dir, 1) - OFFSET); }
    else setAnchor(anchor + dir * (view === 'day' ? 1 : 7) * DAY);
    setSelected(null);
  };
  const days: number[] = [];
  for (let x = range[0]; x < range[1]; x += DAY) days.push(x);
  const on = (d: number) => (data ?? []).filter((e) => key(new Date(e.at).getTime()) === key(d));
  const today = key(todayStart);
  const month = new Date(anchor + OFFSET).getUTCMonth();

  const item = (e: E) => {
    const body = (
      <>
        <span className="w-24 shrink-0 text-xs font-semibold text-gold-700">{f.time(e.at)}{e.kind === 'class' && <><br />{f.time(e.endsAt)}</>}</span>
        <span className="min-w-0 flex-1"><span className="flex items-center gap-2 font-semibold text-brand-900">{e.kind === 'class' ? <Radio className="size-4 shrink-0" /> : <ClipboardCheck className="size-4 shrink-0" />}<span className="truncate">{f.L(e)}</span></span><span className="text-xs text-muted">{e.code}{e.kind === 'class' ? (e.teacher ? ` · ${e.teacher}` : '') : ` · ${t('deadline')}`}</span></span>
        <Pill status={e.status} />
      </>
    );
    const href = e.kind === 'deadline' ? `/portal/assignments/${e.id}` : e.status === 'LIVE' ? `/portal/live/${e.id}` : null;
    return <li key={`${e.kind}${e.id}`}>{href ? <Link href={href} className="flex items-center gap-3 rounded-2xl bg-white p-3 hover:bg-cream-200">{body}</Link> : <div className="flex items-center gap-3 rounded-2xl bg-white p-3">{body}</div>}</li>;
  };

  const title = view === 'month' ? new Date(anchor).toLocaleDateString(f.locale === 'ar' ? 'ar-AE' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' })
    : view === 'day' ? f.day(anchor) : `${f.date(range[0])} – ${f.date(range[1] - DAY)}`;

  return (
    <>
      <PageTitle title={t('title')} subtitle={t('subtitle')} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented value={view} onChange={(v) => { setView(v); setSelected(null); }} options={[{ value: 'day', label: t('day') }, { value: 'week', label: t('week') }, { value: 'month', label: t('month') }]} />
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} aria-label={t('previous')} className="grid size-9 place-items-center rounded-full border border-line bg-white"><ChevronLeft className="size-4 rtl:rotate-180" /></button>
          <button onClick={() => { setAnchor(todayStart); setSelected(null); }} className="rounded-full border border-line bg-white px-4 py-1.5 text-sm font-semibold">{t('today')}</button>
          <button onClick={() => move(1)} aria-label={t('next')} className="grid size-9 place-items-center rounded-full border border-line bg-white"><ChevronRight className="size-4 rtl:rotate-180" /></button>
          <span className="ms-2 text-sm font-semibold text-brand-900">{title}</span>
        </div>
      </div>
      <ErrorBox message={error} />
      {!data ? <Loading /> : view === 'month' ? (
        <>
          <div className="grid grid-cols-7 gap-1 rounded-[1.5rem] bg-cream-50 p-2 text-center shadow-[var(--shadow-card)]">
            {days.slice(0, 7).map((d) => <p key={d} className="py-1 text-[11px] font-semibold uppercase text-muted">{new Date(d).toLocaleDateString(f.locale === 'ar' ? 'ar-AE' : 'en-GB', { weekday: 'short', timeZone: 'Asia/Dubai' })}</p>)}
            {days.map((d) => {
              const ev = on(d);
              return (
                <button key={d} onClick={() => setSelected(d)} className={cn('flex min-h-16 flex-col items-center rounded-xl p-1 text-sm', new Date(d + OFFSET).getUTCMonth() !== month && 'opacity-40', key(d) === today && 'ring-2 ring-gold-400', selected === d ? 'bg-brand-900 text-white' : 'hover:bg-cream-200')}>
                  <span className="font-semibold">{new Date(d + OFFSET).getUTCDate()}</span>
                  <span className="mt-1 flex flex-wrap justify-center gap-0.5">{ev.slice(0, 4).map((e) => <span key={e.id} className={cn('size-1.5 rounded-full', e.kind === 'class' ? 'bg-danger' : 'bg-gold-500')} />)}</span>
                </button>
              );
            })}
          </div>
          {selected !== null && <Card title={f.day(selected)} className="mt-4">{on(selected).length ? <ul className="space-y-2">{on(selected).map(item)}</ul> : <Empty text={t('free')} />}</Card>}
        </>
      ) : (
        <div className="space-y-4">
          {days.map((d) => (
            <Card key={d} title={<span className={key(d) === today ? 'text-gold-700' : ''}>{f.day(d)}{key(d) === today && ` · ${t('today')}`}</span>}>
              {on(d).length ? <ul className="space-y-2">{on(d).map(item)}</ul> : <p className="text-sm text-muted">{t('free')}</p>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
