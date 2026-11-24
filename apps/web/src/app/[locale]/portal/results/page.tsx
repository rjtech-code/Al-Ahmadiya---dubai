'use client';

import { useTranslations } from 'next-intl';
import { Card, Empty, ErrorBox, Loading, PageTitle, Stat, useApi, useFmt } from '@/components/portal/ui';

interface D { cgpa: number | null; creditsEarned: number; terms: { term: string; gpa: number | null; credits: number; courses: { id: string; marks: number | null; grade: string; gradePoints: number; creditHours: number; course: { code: string; titleEn: string; titleAr: string } }[] }[] }

export default function Results() {
  const t = useTranslations('portal.results');
  const f = useFmt();
  const { data, error } = useApi<D>('/me/portal/results');
  return (
    <>
      <PageTitle title={t('title')} subtitle={t('subtitle')} />
      <ErrorBox message={error} />
      {!data ? <Loading /> : !data.terms.length ? <Empty text={t('empty')} /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Stat tone="brand" label={t('cgpa')} value={data.cgpa ?? '—'} hint={t('scale')} />
            <Stat label={t('credits')} value={data.creditsEarned} />
            <Stat label={t('lastGpa')} value={data.terms.at(-1)?.gpa ?? '—'} hint={data.terms.at(-1)?.term} />
          </div>
          {[...data.terms].reverse().map((term) => (
            <Card key={term.term} title={term.term} action={<span className="text-sm font-semibold text-brand-900">{t('gpa')}: {term.gpa ?? '—'}</span>}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="text-xs uppercase text-muted"><tr><th className="py-2 text-start">{t('course')}</th><th className="text-start">{t('marks')}</th><th className="text-start">{t('grade')}</th><th className="text-start">{t('points')}</th><th className="text-start">{t('creditHours')}</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {term.courses.map((r) => <tr key={r.id}><td className="py-2"><span className="font-semibold text-brand-900">{r.course.code}</span> {f.L(r.course)}</td><td>{r.marks ?? '—'}</td><td className="font-semibold">{r.grade}</td><td>{r.gradePoints.toFixed(1)}</td><td>{r.creditHours}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
