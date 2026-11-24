'use client';

import { ClipboardCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Empty, ErrorBox, Loading, PageTitle, Pill, Segmented, useApi, useFmt } from '@/components/portal/ui';
import { Link } from '@/i18n/navigation';

interface A { id: string; titleEn: string; titleAr: string; dueAt: string; maxMarks: number; state: 'PENDING' | 'SUBMITTED' | 'GRADED' | 'OVERDUE'; marks: number | null; submittedAt: string | null; course: { code: string; titleEn: string; titleAr: string } }

export default function Assignments() {
  const t = useTranslations('portal.assignments');
  const f = useFmt();
  const { data, error } = useApi<A[]>('/me/portal/assignments');
  const [tab, setTab] = useState<A['state']>('PENDING');
  const label: Record<A['state'], string> = { PENDING: t('pending'), SUBMITTED: t('submitted'), GRADED: t('graded'), OVERDUE: t('overdue') };
  const rows = (data ?? []).filter((a) => a.state === tab);
  return (
    <>
      <PageTitle title={t('title')} />
      <div className="mb-5"><Segmented value={tab} onChange={setTab} options={(['PENDING', 'SUBMITTED', 'GRADED', 'OVERDUE'] as const).map((s) => ({ value: s, label: `${label[s]} (${(data ?? []).filter((a) => a.state === s).length})` }))} /></div>
      <ErrorBox message={error} />
      {!data ? <Loading /> : rows.length ? (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id}>
              <Link href={`/portal/assignments/${a.id}`} className="flex flex-wrap items-center gap-4 rounded-[1.5rem] border border-white/80 bg-cream-50 p-5 shadow-[var(--shadow-card)] hover:-translate-y-0.5 transition">
                <ClipboardCheck className="size-8 shrink-0 text-gold-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gold-700">{a.course.code} · {f.L(a.course)}</p>
                  <p className="font-display text-xl font-semibold text-brand-900">{f.L(a)}</p>
                  <p className="text-sm text-muted">{t('due', { date: f.dateTime(a.dueAt) })} · {t('marks', { n: a.maxMarks })}</p>
                </div>
                {a.state === 'GRADED' ? <span className="font-display text-2xl font-semibold text-success">{a.marks}/{a.maxMarks}</span> : <Pill status={a.state} label={label[a.state]} />}
              </Link>
            </li>
          ))}
        </ul>
      ) : <Empty text={t('empty')} />}
    </>
  );
}
