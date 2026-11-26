'use client';

import { CheckCircle2, Clock3, FileImage, FileText, Upload, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StackBar } from '@/components/portal/charts';
import { Card, Empty, ErrorBox, Loading, PageTitle, useApi, useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';

interface Doc { id: string; docType: string; originalName: string; sizeBytes: number; status: string; createdAt: string; application: { id: string; reference: string } }

const STATUS: Record<string, { icon: typeof CheckCircle2; cls: string; ribbon: string }> = {
  VERIFIED: { icon: CheckCircle2, cls: 'text-success bg-emerald-50', ribbon: 'bg-success' },
  UPLOADED: { icon: Clock3, cls: 'text-warning bg-amber-50', ribbon: 'bg-gold-500' },
  REJECTED: { icon: XCircle, cls: 'text-danger bg-red-50', ribbon: 'bg-danger' },
};

export default function Documents() {
  const t = useTranslations('portal.documents');
  const ta = useTranslations('apply.docTypes');
  const f = useFmt();
  const { data, error } = useApi<Doc[]>('/me/portal/documents');
  const label: Record<string, string> = { UPLOADED: t('pending'), VERIFIED: t('verified'), REJECTED: t('rejected') };
  const n = (s: string) => (data ?? []).filter((d) => d.status === s).length;
  const size = (b: number) => (b > 1_000_000 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

  return (
    <>
      <PageTitle eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} actions={<Link href="/admissions/apply" className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-800"><Upload className="size-4" />{t('upload')}</Link>} />
      <ErrorBox message={error} />
      {!data ? <Loading /> : data.length ? (
        <div className="space-y-6">
          <Card eyebrow={data[0].application.reference} title={t('verification')}>
            <StackBar label={t('verification')} segments={[{ label: t('verified'), value: n('VERIFIED'), className: 'bg-success' }, { label: t('pending'), value: n('UPLOADED'), className: 'bg-gold-500' }, { label: t('rejected'), value: n('REJECTED'), className: 'bg-danger/80' }]} />
            {n('REJECTED') > 0 && <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-danger">{t('rejectedHint', { n: n('REJECTED') })}</p>}
          </Card>
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((d) => {
              const s = STATUS[d.status] ?? STATUS.UPLOADED;
              const Icon = s.icon;
              const image = /\.(jpe?g|png)$/i.test(d.originalName);
              return (
                <li key={d.id} className="group overflow-hidden rounded-[1.25rem] border border-brand-900/[0.07] bg-white shadow-[0_10px_30px_-18px_rgb(11_58_60/0.25)] transition hover:-translate-y-0.5">
                  {/* Paper preview */}
                  <div className="relative grid h-40 place-items-center bg-gradient-to-br from-cream-100 to-cream-200">
                    <div className="relative h-28 w-22 rounded-sm bg-white p-3 shadow-md [clip-path:polygon(0_0,78%_0,100%_18%,100%_100%,0_100%)]">
                      <span className="absolute end-0 top-0 size-5 bg-cream-300 [clip-path:polygon(0_0,100%_100%,0_100%)]" />
                      {image ? <FileImage className="size-6 text-gold-600" /> : <FileText className="size-6 text-brand-700" />}
                      <span className="mt-2 block h-1 w-12 rounded bg-cream-200" /><span className="mt-1.5 block h-1 w-14 rounded bg-cream-200" /><span className="mt-1.5 block h-1 w-10 rounded bg-cream-200" /><span className="mt-1.5 block h-1 w-13 rounded bg-cream-200" />
                    </div>
                    <span className={cn('absolute end-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold', s.cls)}><Icon className="size-3.5" />{label[d.status] ?? d.status}</span>
                  </div>
                  <span className={cn('block h-1', s.ribbon)} />
                  <div className="p-4">
                    <p className="font-semibold text-brand-900">{ta.has(d.docType) ? ta(d.docType) : d.docType}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{d.originalName}</p>
                    <p className="mt-3 flex justify-between text-[11px] text-muted"><span>{size(d.sizeBytes)} · {d.originalName.split('.').pop()?.toUpperCase()}</span><span>{f.date(d.createdAt)}</span></p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : <Empty text={t('empty')} />}
    </>
  );
}
