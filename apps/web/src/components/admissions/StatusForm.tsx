'use client';

import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/client-api';
import { formatDate } from '@/lib/i18n-helpers';
import { Field, FormAlert, Input } from '../forms/Field';
import { Button } from '../ui/Button';

type Status = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'RETURNED_FOR_CORRECTION' | 'DOCUMENTS_PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
interface Result { reference: string; status: Status; submittedAt: string | null; program: { nameEn: string; nameAr: string } | null; timeline: { toStatus: Status; createdAt: string }[]; pendingDocuments: string[] }

const STAGES: Status[] = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'];

export function StatusForm({ initialReference }: { initialReference?: string }) {
  const t = useTranslations('status');
  const tc = useTranslations('common');
  const td = useTranslations('apply.docTypes');
  const locale = useLocale();
  const [reference, setReference] = useState(initialReference ?? '');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setResult(null);
    if (!/^AHM-\d{4}-[A-Z2-9]{8}$/i.test(reference.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(t('notFound')); return; }
    setBusy(true);
    try {
      const { data } = await apiFetch<{ data: Result }>('/public/admissions/status', { method: 'POST', auth: false, json: { reference: reference.trim(), email: email.trim() } });
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? t('notFound') : err instanceof ApiError && err.status !== 0 ? err.message : tc('networkError'));
    } finally { setBusy(false); }
  };

  const reached = (s: Status) => result?.timeline.some((x) => x.toStatus === s);
  const finalNegative = result && ['REJECTED', 'WITHDRAWN'].includes(result.status);

  return (
    <div className="space-y-6">
      <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label={t('reference')} htmlFor="s-ref" required><Input id="s-ref" value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder={t('referencePlaceholder')} dir="ltr" autoComplete="off" /></Field>
        <Field label={t('email')} htmlFor="s-email" required><Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        <Button type="submit" disabled={busy}>{busy ? t('tracking') : t('track')}</Button>
      </form>
      <p className="text-xs text-muted">{t('privacy')}</p>
      {error && <FormAlert>{error}</FormAlert>}
      {result && (
        <div aria-live="polite" className="rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold text-brand-900">{t('resultTitle')}</h3>
              <p className="text-sm text-muted" dir="ltr">{result.reference}</p>
              {result.program && <p className="text-sm text-muted">{locale === 'ar' ? result.program.nameAr : result.program.nameEn}</p>}
              {result.submittedAt && <p className="text-xs text-muted">{t('submitted', { date: formatDate(result.submittedAt, locale) })}</p>}
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${result.status === 'APPROVED' ? 'bg-emerald-50 text-success' : finalNegative ? 'bg-red-50 text-danger' : 'bg-gold-100 text-gold-700'}`}>{t(`statuses.${result.status}`)}</span>
          </div>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STAGES.map((s) => {
              const done = reached(s) || (s === 'APPROVED' && result.status === 'APPROVED');
              const negative = s === 'APPROVED' && finalNegative;
              const ev = result.timeline.find((x) => x.toStatus === s);
              return (
                <li key={s} className="flex items-center gap-3">
                  {negative ? <XCircle className="size-7 text-danger" aria-hidden /> : done ? <CheckCircle2 className="size-7 text-success" aria-hidden /> : result.status === s ? <Clock className="size-7 text-gold-600" aria-hidden /> : <Circle className="size-7 text-line" aria-hidden />}
                  <div><p className="text-sm font-semibold text-brand-900">{negative ? t(`statuses.${result.status}`) : t(`statuses.${s}`)}</p>{ev && <p className="text-xs text-muted">{formatDate(ev.createdAt, locale)}</p>}</div>
                </li>
              );
            })}
          </ol>
          {result.pendingDocuments.length > 0 && <div className="mt-5"><p className="text-sm font-semibold text-brand-900">{t('pendingDocs')}</p><ul className="mt-1 list-disc ps-5 text-sm text-muted">{result.pendingDocuments.map((d) => <li key={d}>{td(d as 'passport')}</li>)}</ul></div>}
          <div className="mt-5 rounded-md bg-cream-100 p-4"><p className="text-sm font-semibold text-brand-900">{t('nextSteps')}</p><p className="mt-1 text-sm text-muted">{t(`next.${result.status}`)}</p></div>
        </div>
      )}
    </div>
  );
}
