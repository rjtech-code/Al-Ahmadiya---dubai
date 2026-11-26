'use client';

import { CalendarClock, Clock3, PlayCircle, Radio, Search, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Ring } from '@/components/portal/charts';
import { Empty, ErrorBox, inputCls, Loading, PageTitle, Pill, Segmented, surface, useApi, useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';

interface S { id: string; titleEn: string; titleAr: string; scheduledAt: string; durationMin: number; status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED'; course: { id: string; code: string; slug: string; titleEn: string; titleAr: string; teacher: { fullName: string } | null }; lesson: { id: string } | null; attendedMinutes: number | null }
type F = 'LIVE' | 'SCHEDULED' | 'ENDED' | 'CANCELLED' | 'ALL';

export default function LiveClasses() {
  const t = useTranslations('portal.live');
  const f = useFmt();
  const { data, error } = useApi<S[]>('/me/portal/live');
  const [status, setStatus] = useState<F>('ALL');
  const [course, setCourse] = useState('');
  const [q, setQ] = useState('');
  const [now] = useState(() => Date.now());
  const courses = useMemo(() => [...new Map((data ?? []).map((s) => [s.course.id, s.course])).values()], [data]);
  const rows = (data ?? []).filter((s) => (status === 'ALL' || s.status === status) && (!course || s.course.id === course)
    && (!q || `${s.course.code} ${s.course.titleEn} ${s.course.titleAr} ${s.course.teacher?.fullName ?? ''}`.toLowerCase().includes(q.toLowerCase())));
  const ordered = [...rows].sort((a, b) => (a.status === 'LIVE' ? -1 : b.status === 'LIVE' ? 1 : a.status === 'SCHEDULED' && b.status === 'SCHEDULED' ? +new Date(a.scheduledAt) - +new Date(b.scheduledAt) : a.status === 'SCHEDULED' ? -1 : b.status === 'SCHEDULED' ? 1 : +new Date(b.scheduledAt) - +new Date(a.scheduledAt)));
  const label: Record<string, string> = { LIVE: t('liveNow'), SCHEDULED: t('upcoming'), ENDED: t('completed'), CANCELLED: t('cancelled') };
  const next = (data ?? []).filter((s) => s.status === 'LIVE' || s.status === 'SCHEDULED').sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))[0];
  const ended = (data ?? []).filter((s) => s.status === 'ENDED');
  const attendedPct = ended.length ? Math.round((ended.filter((s) => s.attendedMinutes !== null).length / ended.length) * 100) : 0;
  const mins = next ? Math.round((+new Date(next.scheduledAt) - now) / 60_000) : 0;

  return (
    <>
      <PageTitle eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <ErrorBox message={error} />
      {!data ? <Loading /> : (
        <div className="space-y-6">
          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            {next ? (
              <section className="pattern-girih relative overflow-hidden rounded-[1.5rem] bg-brand-900 p-6 text-white shadow-[0_18px_40px_-24px_rgb(5_40_42/0.8)]">
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', next.status === 'LIVE' ? 'bg-danger' : 'bg-white/15 text-gold-300')}><span className={cn('size-2 rounded-full bg-current', next.status === 'LIVE' && 'animate-pulse')} />{next.status === 'LIVE' ? t('liveNow') : t('nextUp')}</span>
                <p className="mt-3 text-xs font-bold text-gold-300">{next.course.code}</p>
                <h2 className="font-display text-3xl font-semibold leading-tight">{f.L(next.course)}</h2>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/80">
                  <li className="inline-flex items-center gap-1.5"><CalendarClock className="size-4 text-gold-300" />{f.dateTime(next.scheduledAt)}</li>
                  <li className="inline-flex items-center gap-1.5"><Clock3 className="size-4 text-gold-300" />{next.durationMin} min</li>
                  {next.course.teacher && <li className="inline-flex items-center gap-1.5"><UserRound className="size-4 text-gold-300" />{next.course.teacher.fullName}</li>}
                </ul>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  {next.status === 'LIVE' ? <Link href={`/portal/live/${next.id}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-gold-400 px-6 font-semibold text-brand-950 hover:bg-gold-300"><Radio className="size-4" />{t('join')}</Link>
                    : <span className="inline-flex h-11 items-center rounded-full bg-white/10 px-5 text-sm font-semibold">{t('opensAt', { time: f.time(next.scheduledAt) })}</span>}
                  {next.status !== 'LIVE' && mins > 0 && <span className="text-sm text-gold-300">{mins < 60 ? t('inMin', { n: mins }) : mins < 1440 ? t('inHours', { n: Math.round(mins / 60) }) : t('inDays', { n: Math.round(mins / 1440) })}</span>}
                </div>
              </section>
            ) : <Empty text={t('empty')} />}
            <section className={cn(surface, 'flex items-center gap-5 p-6')}>
              <Ring value={attendedPct} size={108} stroke={10} sub={t('attendedShort')} />
              <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{t('recentClasses')}</p><p className="mt-1 font-display text-3xl font-semibold text-brand-900">{ended.filter((s) => s.attendedMinutes !== null).length}/{ended.length}</p><p className="text-sm text-muted">{t('attendedOf')}</p></div>
            </section>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Segmented value={status} onChange={setStatus} options={[{ value: 'ALL', label: t('all') }, { value: 'LIVE', label: t('liveNow') }, { value: 'SCHEDULED', label: t('upcoming') }, { value: 'ENDED', label: t('completed') }]} />
            <label className="relative"><Search className="absolute start-3.5 top-3 size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} className={`${inputCls} ps-10`} /></label>
            <select value={course} onChange={(e) => setCourse(e.target.value)} aria-label={t('course')} className={inputCls}><option value="">{t('allCourses')}</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {f.L(c)}</option>)}</select>
          </div>

          {ordered.length ? (
            <ol className="relative space-y-3 border-s-2 border-gold-200 ps-6">
              {ordered.map((s) => {
                const d = new Date(s.scheduledAt);
                return (
                  <li key={s.id} className="relative">
                    <span className={cn('absolute -start-[1.95rem] top-6 size-3.5 rounded-full border-[3px] border-cream-100', s.status === 'LIVE' ? 'bg-danger' : s.status === 'SCHEDULED' ? 'bg-gold-500' : 'bg-brand-700/40')} />
                    <article className={cn(surface, 'flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap', s.status === 'LIVE' && 'ring-2 ring-danger/50')}>
                      <div className="grid w-16 shrink-0 place-items-center rounded-2xl bg-cream-100 py-2 text-center leading-tight"><span className="text-[10px] font-bold uppercase text-gold-700">{d.toLocaleDateString(f.locale === 'ar' ? 'ar-AE' : 'en-GB', { month: 'short', timeZone: 'Asia/Dubai' })}</span><span className="font-display text-2xl font-semibold text-brand-900">{d.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'Asia/Dubai' })}</span></div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-xs font-bold text-gold-700">{s.course.code}<Pill status={s.status} label={label[s.status]} /></p>
                        <p className="truncate font-semibold text-brand-900">{f.L(s.course)}</p>
                        <p className="text-xs text-muted">{f.time(s.scheduledAt)} – {f.time(new Date(+d + s.durationMin * 60_000))}{s.course.teacher && ` · ${s.course.teacher.fullName}`}{s.status === 'ENDED' && ` · ${s.attendedMinutes !== null ? t('attended', { n: s.attendedMinutes }) : t('missed')}`}</p>
                      </div>
                      {s.status === 'LIVE' && <Link href={`/portal/live/${s.id}`} className="inline-flex items-center gap-2 rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white"><Radio className="size-4" />{t('join')}</Link>}
                      {s.status === 'ENDED' && s.lesson && <Link href={`/portal/courses/${s.course.slug}?lesson=${s.lesson.id}`} className="inline-flex items-center gap-2 rounded-full border border-gold-400 px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-cream-100"><PlayCircle className="size-4" />{t('recording')}</Link>}
                    </article>
                  </li>
                );
              })}
            </ol>
          ) : <Empty text={t('empty')} />}
        </div>
      )}
    </>
  );
}
