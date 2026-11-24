'use client';

import { Receipt } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Empty, ErrorBox, Loading, PageTitle, Pill, Stat, useApi, useFmt } from '@/components/portal/ui';
import { Link } from '@/i18n/navigation';
import { formatMoney } from '@/lib/client-api';

interface P { id: string; purpose: string; description: string; amountFils: number; vatFils: number; currency: string; status: string; receiptNumber: string | null; paidAt: string | null; createdAt: string }

export default function Payments() {
  const t = useTranslations('portal.payments');
  const f = useFmt();
  const { data, error } = useApi<P[]>('/me/payments');
  const paid = (data ?? []).filter((p) => p.status === 'SUCCEEDED');
  return (
    <>
      <PageTitle title={t('title')} />
      <ErrorBox message={error} />
      {!data ? <Loading /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Stat tone="brand" label={t('totalPaid')} value={formatMoney(paid.reduce((s, p) => s + p.amountFils, 0), 'AED', f.locale)} />
            <Stat label={t('receipts')} value={paid.length} />
          </div>
          {data.length ? (
            <ul className="space-y-3">
              {data.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-[1.5rem] border border-white/80 bg-cream-50 p-4 shadow-[var(--shadow-card)]">
                  <div className="min-w-0 flex-1"><p className="font-semibold text-brand-900">{p.description}</p><p className="text-xs text-muted">{f.dateTime(p.paidAt ?? p.createdAt)}{p.vatFils ? ` · ${t('vat', { amount: formatMoney(p.vatFils, p.currency, f.locale) })}` : ''}</p></div>
                  <p className="font-display text-xl font-semibold text-brand-900">{formatMoney(p.amountFils, p.currency, f.locale)}</p>
                  {p.status === 'SUCCEEDED' && p.receiptNumber ? <Link href={`/account/receipts/${p.id}`} className="inline-flex items-center gap-1 rounded-full border border-gold-400 px-3 py-1.5 text-xs font-semibold text-brand-900"><Receipt className="size-3.5" />{p.receiptNumber}</Link> : <Pill status={p.status} />}
                </li>
              ))}
            </ul>
          ) : <Empty text={t('empty')} />}
        </div>
      )}
    </>
  );
}
