'use client';

import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Empty, ErrorBox, Loading, PageTitle, Pill, useApi, useFmt } from '@/components/portal/ui';
import { Link } from '@/i18n/navigation';

interface Doc { id: string; docType: string; originalName: string; sizeBytes: number; status: string; createdAt: string; application: { id: string; reference: string } }

export default function Documents() {
  const t = useTranslations('portal.documents');
  const ta = useTranslations('apply.docTypes');
  const f = useFmt();
  const { data, error } = useApi<Doc[]>('/me/portal/documents');
  const status: Record<string, string> = { UPLOADED: t('pending'), VERIFIED: t('verified'), REJECTED: t('rejected') };
  return (
    <>
      <PageTitle title={t('title')} subtitle={t('subtitle')} actions={<Link href="/admissions/apply" className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">{t('upload')}</Link>} />
      <ErrorBox message={error} />
      {!data ? <Loading /> : data.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((d) => (
            <li key={d.id} className="flex items-center gap-4 rounded-[1.5rem] border border-white/80 bg-cream-50 p-4 shadow-[var(--shadow-card)]">
              <FileText className="size-8 shrink-0 text-gold-600" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-900">{ta.has(d.docType) ? ta(d.docType) : d.docType}</p>
                <p className="truncate text-xs text-muted">{d.originalName} · {(d.sizeBytes / 1024).toFixed(0)} KB · {f.date(d.createdAt)} · {d.application.reference}</p>
              </div>
              <Pill status={d.status} label={status[d.status] ?? d.status} />
            </li>
          ))}
        </ul>
      ) : <Empty text={t('empty')} />}
    </>
  );
}
