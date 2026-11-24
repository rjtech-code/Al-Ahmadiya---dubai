'use client';

import { PlayCircle, Radio, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Empty, ErrorBox, inputCls, Loading, PageTitle, Pill, Segmented, useApi, useFmt } from '@/components/portal/ui';
import { Link } from '@/i18n/navigation';

interface S { id: string; titleEn: string; titleAr: string; scheduledAt: string; durationMin: number; status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED'; course: { id: string; code: string; slug: string; titleEn: string; titleAr: string; teacher: { fullName: string } | null }; lesson: { id: string } | null; attendedMinutes: number | null }
type F = 'LIVE' | 'SCHEDULED' | 'ENDED' | 'CANCELLED' | 'ALL';

export default function LiveClasses() {
  const t = useTranslations('portal.live');
  const f = useFmt();
  const { data, error } = useApi<S[]>('/me/portal/live');
  const [status, setStatus] = useState<F>('ALL');
  const [course, setCourse] = useState('');
  const [date, setDate] = useState('');
  const [q, setQ] = useState('');
  const courses = useMemo(() => [...new Map((data ?? []).map((s) => [s.course.id, s.course])).values()], [data]);
  const dayKey = (d: string) => new Date(new Date(d).getTime() + 4 * 3600_000).toISOString().slice(0, 10);
  const rows = (data ?? []).filter((s) => (status === 'ALL' || s.status === status) && (!course || s.course.id === course) && (!date || dayKey(s.scheduledAt) === date)
    && (!q || `${s.course.code} ${s.course.titleEn} ${s.course.titleAr} ${s.course.teacher?.fullName ?? ''}`.toLowerCase().includes(q.toLowerCase())));
  const ordered = [...rows].sort((a, b) => (a.status === 'LIVE' ? -1 : b.status === 'LIVE' ? 1 : a.status === 'SCHEDULED' && b.status === 'SCHEDULED' ? +new Date(a.scheduledAt) - +new Date(b.scheduledAt) : +new Date(b.scheduledAt) - +new Date(a.scheduledAt)));
  const label: Record<string, string> = { LIVE: t('liveNow'), SCHEDULED: t('upcoming'), ENDED: t('completed'), CANCELLED: t('cancelled') };

  return (
    <>
      <PageTitle title={t('title')} subtitle={t('subtitle')} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented value={status} onChange={setStatus} options={[{ value: 'ALL', label: t('all') }, { value: 'LIVE', label: t('liveNow') }, { value: 'SCHEDULED', label: t('upcoming') }, { value: 'ENDED', label: t('completed') }, { value: 'CANCELLED', label: t('cancelled') }]} />
        <label className="relative"><Search className="absolute start-3 top-3 size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} className={`${inputCls} ps-9`} /></label>
        <select value={course} onChange={(e) => setCourse(e.target.value)} aria-label={t('course')} className={inputCls}><option value="">{t('allCourses')}</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {f.L(c)}</option>)}</select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={t('date')} className={inputCls} />
      </div>
      <ErrorBox message={error} />
      {!data ? <Loading /> : ordered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ordered.map((s) => (
            <article key={s.id} className={`rounded-[1.5rem] border bg-cream-50 p-5 shadow-[var(--shadow-card)] ${s.status === 'LIVE' ? 'border-danger' : 'border-white/80'}`}>
              <div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-gold-700">{s.course.code}</p><Pill status={s.status} label={label[s.status]} /></div>
              <h2 className="mt-1 font-display text-xl font-semibold text-brand-900">{f.L(s.course)}</h2>
              <dl className="mt-3 space-y-1 text-sm text-muted">
                <div>{f.day(s.scheduledAt)}</div>
                <div>{f.time(s.scheduledAt)} – {f.time(new Date(+new Date(s.scheduledAt) + s.durationMin * 60_000))}</div>
                {s.course.teacher && <div>{t('teacher')}: <span className="text-brand-900">{s.course.teacher.fullName}</span></div>}
                {s.status === 'ENDED' && <div>{s.attendedMinutes !== null ? t('attended', { n: s.attendedMinutes }) : t('missed')}</div>}
              </dl>
              <div className="mt-4">
                {s.status === 'LIVE' && <Link href={`/portal/live/${s.id}`} className="inline-flex items-center gap-2 rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white"><Radio className="size-4" />{t('join')}</Link>}
                {s.status === 'SCHEDULED' && <p className="text-xs text-muted">{t('opensAt', { time: f.time(s.scheduledAt) })}</p>}
                {s.status === 'ENDED' && s.lesson && <Link href={`/portal/courses/${s.course.slug}?lesson=${s.lesson.id}`} className="inline-flex items-center gap-2 rounded-full border border-gold-400 px-4 py-2 text-sm font-semibold text-brand-900"><PlayCircle className="size-4" />{t('recording')}</Link>}
              </div>
            </article>
          ))}
        </div>
      ) : <Empty text={t('empty')} />}
    </>
  );
}
