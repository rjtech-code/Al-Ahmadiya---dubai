'use client';

import { CheckCircle2, Mail } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/client-api';
import { buttonClass } from '../ui/Button';

export function NewsletterForm() {
  const t = useTranslations('newsletter');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t('invalid')); setState('error'); return; }
    setState('busy');
    try {
      await apiFetch('/public/newsletter', { method: 'POST', json: { email, locale }, auth: false });
      setState('done');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 0 ? tc('networkError') : tc('genericError'));
      setState('error');
    }
  };

  if (state === 'done') return <p role="status" className="flex items-center gap-2 text-sm font-semibold text-success"><CheckCircle2 className="size-5" />{t('done')}</p>;
  return (
    <form onSubmit={submit} noValidate className="w-full max-w-md">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{t('placeholder')}</span>
          <Mail className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('placeholder')} aria-invalid={state === 'error'} className="h-11 w-full rounded-full border border-line bg-white ps-10 pe-4 text-sm outline-none focus:border-gold-500" />
        </label>
        <button type="submit" disabled={state === 'busy'} className={buttonClass('gold', 'md')}>{t('subscribe')}</button>
      </div>
      {state === 'error' && <p role="alert" className="mt-2 text-xs font-medium text-danger">{error}</p>}
    </form>
  );
}
