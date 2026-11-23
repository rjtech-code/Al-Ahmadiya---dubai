'use client';

import { Loader2, Printer } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError, formatMoney } from '@/lib/client-api';
import { formatDate } from '@/lib/i18n-helpers';
import { LogoMark } from '../site/Logo';
import { useAuthed } from './useAuthed';

interface R { receiptNumber: string; paidAt: string; description: string; amountFils: number; vatFils: number; currency: string; provider: string; providerRef: string | null; payer: { fullName: string; email: string }; applicationReference: string | null; course: { code: string; titleEn: string; titleAr: string } | null }

export function ReceiptView({ id }: { id: string }) {
  const t = useTranslations('receipt');
  const locale = useLocale();
  const { state } = useAuthed();
  const [r, setR] = useState<R | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (state.status !== 'authed') return;
    apiFetch<{ data: R }>(`/me/payments/${id}/receipt`).then((x) => setR(x.data)).catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Error'));
  }, [state.status, id]);
  if (error) return <p className="text-danger">{error}</p>;
  if (!r) return <Loader2 className="size-5 animate-spin text-muted" />;
  const rows: [string, string][] = [
    [t('number'), r.receiptNumber], [t('date'), formatDate(r.paidAt, locale, { dateStyle: 'long', timeStyle: 'short' } as Intl.DateTimeFormatOptions)], [t('payer'), `${r.payer.fullName} (${r.payer.email})`],
    [t('description'), r.description], ...(r.applicationReference ? [[t('application'), r.applicationReference] as [string, string]] : []), ...(r.course ? [[t('course'), `${r.course.code} — ${locale === 'ar' ? r.course.titleAr : r.course.titleEn}`] as [string, string]] : []),
    [t('amount'), formatMoney(r.amountFils, r.currency, locale)], [t('vat'), formatMoney(r.vatFils, r.currency, locale)], [t('method'), r.provider === 'test' ? 'Test gateway (development)' : 'Razorpay'], [t('reference'), r.providerRef ?? '—'],
  ];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex justify-end print:hidden"><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white"><Printer className="size-4" />{t('print')}</button></div>
      <article className="rounded-[2rem] bg-white p-8 shadow-[var(--shadow-card)] print:shadow-none">
        <header className="flex items-center justify-between border-b border-line pb-5">
          <div className="flex items-center gap-3"><LogoMark className="size-10 text-gold-600" /><div><p className="font-display text-2xl font-semibold uppercase text-brand-900">Al Ahmadiya</p><p className="text-xs text-muted">Dubai, UAE</p></div></div>
          <h1 className="font-display text-3xl font-semibold text-brand-900">{t('title')}</h1>
        </header>
        <dl className="divide-y divide-line">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-6 py-3 text-sm"><dt className="text-muted">{k}</dt><dd className="text-end font-medium text-brand-900" dir="auto">{v}</dd></div>)}</dl>
        <p className="mt-4 flex justify-between border-t-2 border-brand-900 pt-4 font-display text-2xl font-semibold text-brand-900"><span>{t('total')}</span><span>{formatMoney(r.amountFils + r.vatFils, r.currency, locale)}</span></p>
      </article>
    </div>
  );
}
