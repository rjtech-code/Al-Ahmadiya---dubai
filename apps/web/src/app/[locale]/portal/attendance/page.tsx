'use client';

import { CalendarCheck2, CircleAlert, Clock3, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AreaTrend, Ring, StackBar } from '@/components/portal/charts';
import { Card, Empty, ErrorBox, Hero, HeroFigure, Loading, PageTitle, Pill, Progress, Segmented, useApi, useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';

interface D {
  overall: number | null;
  weekly: { week: number; percent: number | null }[];
  byCourse: { course: { id: string; code: string; titleEn: string; titleAr: string }; held: number; attended: number; late: number; absent: number; percent: number | null }[];
  history: { id: string; date: string; course: { code: string; titleEn: string; titleAr: string }; status: string; minutes: number; joinedAt: string | null; leftAt: string | null }[];
}

export default function Attendance() {
  const t = useTranslations('portal.attendance');
  const f = useFmt();
  const { data, error } = useApi<D>('/me/portal/attendance');
  const [filter, setFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ABSENT'>('ALL');
  const [showAll, setShowAll] = useState(false);
  const label: Record<string, string> = { PRESENT: t('present'), LATE: t('late'), PARTIAL: t('partial'), ABSENT: t('absent') };
  const count = (s: string) => data?.history.filter((h) => h.status === s).length ?? 0;
  const rows = (data?.history ?? []).filter((h) => filter === 'ALL' || h.status === filter);
  const weekly = (data?.weekly ?? []).filter((w) => w.percent !== null).map((w) => ({ label: `W${w.week}`, value: w.percent! }));

  return (
    <>
      <PageTitle eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <ErrorBox message={error} />
      {!data ? <Loading /> : !data.history.length ? <Empty text={t('empty')} /> : (
        <div className="space-y-6">
          <Hero title={t('overall')} subtitle={(data.overall ?? 0) >= 75 ? t('onTrack') : t('attendanceWarning')}
            aside={<div className="rounded-full bg-white/95 p-2"><Ring value={data.overall ?? 0} size={124} stroke={11} sub={t('overallShort')} /></div>}>
            <HeroFigure label={t('classesHeld')} value={data.history.length} />
            <HeroFigure label={t('present')} value={count('PRESENT')} />
            <HeroFigure label={t('late')} value={count('LATE')} />
            <HeroFigure label={t('absent')} value={count('ABSENT')} />
          </Hero>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card icon={TrendingUp} eyebrow={t('last12')} title={t('trend')}>
              <AreaTrend data={weekly} max={100} format={(v) => `${Math.round(v)}%`} label={t('trend')} />
            </Card>
            <Card icon={CalendarCheck2} eyebrow={t('allClasses')} title={t('breakdown')}>
              <StackBar label={t('breakdown')} segments={[{ label: t('present'), value: count('PRESENT'), className: 'bg-brand-700' }, { label: t('late'), value: count('LATE'), className: 'bg-gold-500' }, { label: t('absent'), value: count('ABSENT'), className: 'bg-danger/80' }]} />
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[[t('present'), count('PRESENT'), 'text-brand-700'], [t('late'), count('LATE'), 'text-gold-700'], [t('absent'), count('ABSENT'), 'text-danger']].map(([k, v, c]) => (
                  <div key={k as string} className="rounded-2xl bg-cream-50 p-3"><p className={cn('font-display text-3xl font-semibold', c as string)}>{v}</p><p className="text-xs text-muted">{k}</p></div>
                ))}
              </div>
            </Card>
          </div>

          <Card icon={Clock3} eyebrow={t('perCourse')} title={t('byCourse')}>
            <ul className="grid gap-4 md:grid-cols-2">
              {data.byCourse.map((c) => {
                const low = c.percent !== null && c.percent < 75;
                return (
                  <li key={c.course.id} className="flex items-center gap-4 rounded-2xl border border-line/70 bg-cream-50/50 p-4">
                    <Ring value={c.percent ?? 0} size={64} stroke={7} tone={low ? 'warn' : 'brand'} label={<span className="text-base">{c.percent}%</span>} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gold-700">{c.course.code}</p>
                      <p className="truncate font-semibold text-brand-900">{f.L(c.course)}</p>
                      <Progress value={c.percent ?? 0} tone={low ? 'warn' : 'brand'} className="mt-2" />
                      <p className="mt-1.5 text-xs text-muted">{t('counts', { attended: c.attended, held: c.held, late: c.late, absent: c.absent })}</p>
                    </div>
                    {low && <CircleAlert className="size-5 shrink-0 text-warning" aria-label={t('attendanceWarning')} />}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title={t('history')} action={<Segmented value={filter} onChange={setFilter} options={[{ value: 'ALL', label: t('all') }, { value: 'PRESENT', label: t('present') }, { value: 'LATE', label: t('late') }, { value: 'ABSENT', label: t('absent') }]} />}>
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full min-w-[620px] text-sm">
                <thead><tr className="border-y border-line bg-cream-50 text-[11px] uppercase tracking-wider text-muted"><th className="px-6 py-2.5 text-start font-semibold">{t('date')}</th><th className="text-start font-semibold">{t('course')}</th><th className="text-start font-semibold">{t('joined')}</th><th className="text-start font-semibold">{t('minutes')}</th><th className="pe-6 text-start font-semibold">{t('status')}</th></tr></thead>
                <tbody className="divide-y divide-line/70">
                  {(showAll ? rows : rows.slice(0, 12)).map((h) => (
                    <tr key={h.id} className="hover:bg-cream-50/70">
                      <td className="px-6 py-3 font-medium text-brand-900">{f.date(h.date)}</td>
                      <td><span className="font-semibold text-brand-900">{h.course.code}</span> <span className="text-muted">{f.L(h.course)}</span></td>
                      <td className="tabular-nums text-muted">{h.joinedAt ? f.time(h.joinedAt) : '—'}{h.leftAt ? ` – ${f.time(h.leftAt)}` : ''}</td>
                      <td className="tabular-nums">{h.minutes}</td>
                      <td className="pe-6"><Pill status={h.status} label={label[h.status]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 12 && <div className="mt-4 text-center"><button type="button" onClick={() => setShowAll((v) => !v)} className="rounded-full border border-gold-400 px-5 py-2 text-sm font-semibold text-brand-900 hover:bg-cream-100">{showAll ? t('showLess') : t('showAll', { n: rows.length })}</button></div>}
          </Card>
        </div>
      )}
    </>
  );
}
