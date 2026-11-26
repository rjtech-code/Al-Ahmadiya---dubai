'use client';

import { CheckCircle2, CreditCard, Receipt, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Bars } from '@/components/portal/charts';
import { Card, Empty, ErrorBox, Hero, HeroFigure, Loading, PageTitle, useApi, useFmt } from '@/components/portal/ui';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { formatMoney } from '@/lib/client-api';

interface P { id: string; purpose: string; description: string; amountFils: number; vatFils: number; currency: string; status: string; receiptNumber: string | null; paidAt: string | null; createdAt: string }

export default function Payments() {
  const t = useTranslations('portal.payments');
  const f = useFmt();
  const { data, error } = useApi<P[]>('/me/payments');
  const paid = (data ?? []).filter((p) => p.status === 'SUCCEEDED');
  const money = (fils: number) => formatMoney(fils, 'AED', f.locale);
  const total = paid.reduce((s, p) => s + p.amountFils, 0);
  // Paid per calendar month, last six months.
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - (5 - i)); return d; });
  const monthly = months.map((m) => ({ label: m.toLocaleDateString(f.locale === 'ar' ? 'ar-AE' : 'en-GB', { month: 'short' }), value: paid.filter((p) => p.paidAt && new Date(p.paidAt).getUTCMonth() === m.getUTCMonth() && new Date(p.paidAt).getUTCFullYear() === m.getUTCFullYear()).reduce((s, p) => s + p.amountFils / 100, 0) }));

  return (
    <>
      <PageTitle eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <ErrorBox message={error} />
      {!data ? <Loading /> : (
        <div className="space-y-6">
          <Hero title={money(total)} subtitle={t('totalPaid')}>
            <HeroFigure label={t('receipts')} value={paid.length} />
            <HeroFigure label={t('lastPayment')} value={paid[0]?.paidAt ? f.date(paid[0].paidAt) : '—'} />
            <HeroFigure label={t('outstanding')} value={money(0)} hint={t('nothingDue')} />
          </Hero>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card icon={CreditCard} eyebrow={t('last6')} title={t('monthly')}>
              <Bars data={monthly} format={(v) => `${Math.round(v)}`} label={t('monthly')} />
              <p className="mt-2 text-xs text-muted">{t('aed')}</p>
            </Card>
            <Card eyebrow={t('split')} title={t('byPurpose')}>
              <ul className="space-y-3">
                {[{ k: 'course', l: t('courseFees') }, { k: 'application-fee', l: t('applicationFees') }].map(({ k, l }) => {
                  const v = paid.filter((p) => p.purpose === k).reduce((s, p) => s + p.amountFils, 0);
                  return (
                    <li key={k}>
                      <div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold text-brand-900">{l}</span><span className="tabular-nums text-muted">{money(v)}</span></div>
                      <span className="block h-2.5 overflow-hidden rounded-full bg-cream-200"><span className={cn('block h-full rounded-full', k === 'course' ? 'bg-brand-700' : 'bg-gold-500')} style={{ width: `${total ? (v / total) * 100 : 0}%` }} /></span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          <section>
            <h2 className="mb-3 font-display text-2xl font-semibold text-brand-900">{t('history')}</h2>
            {data.length ? (
              <ul className="grid gap-4 md:grid-cols-2">
                {data.map((p) => {
                  const ok = p.status === 'SUCCEEDED';
                  return (
                    <li key={p.id} className="relative overflow-hidden rounded-[1.25rem] border border-brand-900/[0.07] bg-[#fffdf9] shadow-[0_10px_30px_-18px_rgb(11_58_60/0.25)]">
                      <div className={cn('flex items-center justify-between gap-3 px-5 py-3', ok ? 'bg-brand-900 text-white' : 'bg-red-50 text-danger')}>
                        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]">{ok ? <CheckCircle2 className="size-4 text-gold-300" /> : <XCircle className="size-4" />}{ok ? t('paid') : t('failed')}</span>
                        <span className="text-xs opacity-80">{f.dateTime(p.paidAt ?? p.createdAt)}</span>
                      </div>
                      <div className="px-5 pb-5 pt-4">
                        <p className="font-semibold text-brand-900">{p.description}</p>
                        <div className="my-4 border-t-2 border-dotted border-line" />
                        <div className="flex items-end justify-between gap-3">
                          <div className="text-xs text-muted"><p>{t('receiptNo')}</p><p className="font-mono text-sm font-semibold text-brand-900">{p.receiptNumber ?? '—'}</p></div>
                          <p className="font-display text-3xl font-semibold text-brand-900">{money(p.amountFils)}</p>
                        </div>
                        {ok && p.receiptNumber && <Link href={`/account/receipts/${p.id}`} className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold-400 px-4 py-1.5 text-xs font-semibold text-brand-900 hover:bg-cream-100"><Receipt className="size-3.5" />{t('viewReceipt')}</Link>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <Empty text={t('empty')} />}
          </section>
        </div>
      )}
    </>
  );
}
