'use client';

import { HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Empty, ErrorBox, Loading, PageTitle, Pill, Segmented, useApi, useFmt } from '@/components/portal/ui';
import { Link } from '@/i18n/navigation';

interface Q { id: string; titleEn: string; titleAr: string; passPercent: number; questionCount: number; attempts: number; best: { score: number; total: number } | null; passed: boolean; lastAt: string | null; course: { slug: string; code: string; titleEn: string; titleAr: string } }

export default function Quizzes() {
  const t = useTranslations('portal.quizzes');
  const f = useFmt();
  const { data, error } = useApi<Q[]>('/me/portal/quizzes');
  const [tab, setTab] = useState<'available' | 'completed'>('available');
  const rows = (data ?? []).filter((q) => (tab === 'available' ? !q.attempts : q.attempts > 0));
  return (
    <>
      <PageTitle title={t('title')} />
      <div className="mb-5"><Segmented value={tab} onChange={setTab} options={[{ value: 'available', label: t('available') }, { value: 'completed', label: t('completed') }]} /></div>
      <ErrorBox message={error} />
      {!data ? <Loading /> : rows.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((q) => (
            <article key={q.id} className="rounded-[1.5rem] border border-white/80 bg-cream-50 p-5 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold text-gold-700">{q.course.code}</p>
              <h2 className="flex items-start gap-2 font-display text-xl font-semibold text-brand-900"><HelpCircle className="mt-1 size-5 shrink-0 text-gold-600" />{f.L(q)}</h2>
              <p className="mt-2 text-sm text-muted">{t('meta', { n: q.questionCount, pass: q.passPercent })}</p>
              {q.best && <p className="mt-2 flex items-center gap-2 text-sm"><Pill status={q.passed ? 'GRADED' : 'PENDING'} label={q.passed ? t('passed') : t('notPassed')} />{t('best', { score: q.best.score, total: q.best.total })} · {t('tries', { n: q.attempts })}</p>}
              <Link href={`/portal/courses/${q.course.slug}?tab=quizzes`} className="mt-4 inline-block rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">{q.attempts ? t('retake') : t('start')}</Link>
            </article>
          ))}
        </div>
      ) : <Empty text={tab === 'available' ? t('noneAvailable') : t('noneDone')} />}
    </>
  );
}
