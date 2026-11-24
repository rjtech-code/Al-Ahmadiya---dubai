'use client';

import { Inbox, Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn } from '../ui/cn';

/** GET a portal endpoint; `reload()` refetches. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let off = false;
    apiFetch<{ data: T }>(path).then((r) => { if (!off) { setData(r.data); setError(''); } })
      .catch((e: unknown) => { if (!off) setError(e instanceof ApiError && e.status !== 0 ? e.message : 'Network error'); });
    return () => { off = true; };
  }, [path, tick]);
  return { data, error, reload: () => setTick((t) => t + 1) };
}

export function useFmt() {
  const locale = useLocale();
  const tag = locale === 'ar' ? 'ar-AE' : 'en-GB';
  const opt = { timeZone: 'Asia/Dubai' } as const;
  return {
    locale,
    L: <T extends { titleEn: string; titleAr: string }>(o: T) => (locale === 'ar' ? o.titleAr : o.titleEn),
    date: (d: string | number | Date) => new Date(d).toLocaleDateString(tag, { ...opt, day: 'numeric', month: 'short', year: 'numeric' }),
    day: (d: string | number | Date) => new Date(d).toLocaleDateString(tag, { ...opt, weekday: 'long', day: 'numeric', month: 'long' }),
    time: (d: string | number | Date) => new Date(d).toLocaleTimeString(tag, { ...opt, hour: '2-digit', minute: '2-digit' }),
    dateTime: (d: string | number | Date) => new Date(d).toLocaleString(tag, { ...opt, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
  };
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold text-brand-900 sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[1.5rem] border border-white/80 bg-cream-50 p-5 shadow-[var(--shadow-card)]', className)}>
      {(title || action) && <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-display text-xl font-semibold text-brand-900">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: string; tone?: 'default' | 'brand' }) {
  return (
    <div className={cn('rounded-[1.5rem] p-5 shadow-[var(--shadow-card)]', tone === 'brand' ? 'pattern-girih bg-brand-900 text-white' : 'border border-white/80 bg-cream-50')}>
      <p className={cn('text-xs font-medium', tone === 'brand' ? 'text-gold-300' : 'text-muted')}>{label}</p>
      <p className={cn('mt-1 font-display text-4xl font-semibold', tone === 'brand' ? 'text-white' : 'text-brand-900')}>{value}</p>
      {hint && <p className={cn('mt-1 text-xs', tone === 'brand' ? 'text-white/70' : 'text-muted')}>{hint}</p>}
    </div>
  );
}

export function Empty({ text, children }: { text: string; children?: ReactNode }) {
  return <div className="flex flex-col items-center gap-2 rounded-[1.5rem] border border-dashed border-line p-8 text-center text-sm text-muted"><Inbox className="size-7 text-gold-500" aria-hidden />{text}{children}</div>;
}

export function Loading() {
  return (
    <div className="space-y-3" aria-busy="true">
      <p className="sr-only"><Loader2 className="animate-spin" /></p>
      {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-[1.5rem] bg-cream-200/70" />)}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return message ? <p role="alert" className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{message}</p> : null;
}

const TONES: Record<string, string> = {
  LIVE: 'bg-danger text-white', SCHEDULED: 'bg-brand-50 text-brand-800', ENDED: 'bg-cream-200 text-muted', CANCELLED: 'bg-gray-100 text-muted line-through',
  PENDING: 'bg-amber-50 text-warning', SUBMITTED: 'bg-brand-50 text-brand-800', GRADED: 'bg-emerald-50 text-success', OVERDUE: 'bg-red-50 text-danger',
  PRESENT: 'bg-emerald-50 text-success', LATE: 'bg-amber-50 text-warning', PARTIAL: 'bg-amber-50 text-warning', ABSENT: 'bg-red-50 text-danger',
  VERIFIED: 'bg-emerald-50 text-success', REJECTED: 'bg-red-50 text-danger', SUCCEEDED: 'bg-emerald-50 text-success', FAILED: 'bg-red-50 text-danger',
};
export function Pill({ status, label }: { status: string; label?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', TONES[status] ?? 'bg-cream-200 text-brand-900')}>{label ?? status.replace(/_/g, ' ')}</span>;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return <div className={cn('h-1.5 overflow-hidden rounded-full bg-cream-200', className)}><div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-full bg-cream-200 p-1">
      {options.map((o) => <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className={cn('rounded-full px-4 py-1.5 text-xs font-semibold transition', value === o.value ? 'bg-brand-900 text-white shadow' : 'text-brand-900 hover:bg-white/60')}>{o.label}</button>)}
    </div>
  );
}

export const inputCls = 'h-10 rounded-xl border border-line bg-white px-3.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-200';
