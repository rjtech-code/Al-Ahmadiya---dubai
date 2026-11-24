'use client';

import { useTranslations } from 'next-intl';
import { Card, Empty, ErrorBox, Loading, PageTitle, Pill, Progress, Stat, useApi, useFmt } from '@/components/portal/ui';

interface D {
  overall: number | null;
  byCourse: { course: { id: string; code: string; titleEn: string; titleAr: string }; held: number; attended: number; late: number; absent: number; percent: number | null }[];
  history: { id: string; date: string; course: { code: string; titleEn: string; titleAr: string }; status: string; minutes: number; joinedAt: string | null; leftAt: string | null }[];
}

export default function Attendance() {
  const t = useTranslations('portal.attendance');
  const f = useFmt();
  const { data, error } = useApi<D>('/me/portal/attendance');
  const label: Record<string, string> = { PRESENT: t('present'), LATE: t('late'), PARTIAL: t('partial'), ABSENT: t('absent') };
  return (
    <>
      <PageTitle title={t('title')} subtitle={t('subtitle')} />
      <ErrorBox message={error} />
      {!data ? <Loading /> : !data.history.length ? <Empty text={t('empty')} /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat tone="brand" label={t('overall')} value={`${data.overall}%`} />
            <Stat label={t('present')} value={data.history.filter((h) => h.status === 'PRESENT').length} />
            <Stat label={t('late')} value={data.history.filter((h) => h.status === 'LATE').length} />
            <Stat label={t('absent')} value={data.history.filter((h) => h.status === 'ABSENT').length} />
          </div>
          <Card title={t('byCourse')}>
            <ul className="space-y-4">
              {data.byCourse.map((c) => (
                <li key={c.course.id}>
                  <div className="flex justify-between text-sm"><span className="font-semibold text-brand-900">{c.course.code} · {f.L(c.course)}</span><span className={c.percent !== null && c.percent < 75 ? 'font-semibold text-danger' : 'font-semibold text-success'}>{c.percent}%</span></div>
                  <Progress value={c.percent ?? 0} className="mt-1" />
                  <p className="mt-1 text-xs text-muted">{t('counts', { attended: c.attended, held: c.held, late: c.late, absent: c.absent })}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card title={t('history')}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-start text-sm">
                <thead className="text-xs uppercase text-muted"><tr><th className="py-2 text-start">{t('date')}</th><th className="text-start">{t('course')}</th><th className="text-start">{t('joined')}</th><th className="text-start">{t('minutes')}</th><th className="text-start">{t('status')}</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {data.history.map((h) => <tr key={h.id}><td className="py-2">{f.date(h.date)}</td><td>{h.course.code}</td><td>{h.joinedAt ? f.time(h.joinedAt) : '—'}{h.leftAt ? ` – ${f.time(h.leftAt)}` : ''}</td><td>{h.minutes}</td><td><Pill status={h.status} label={label[h.status]} /></td></tr>)}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
