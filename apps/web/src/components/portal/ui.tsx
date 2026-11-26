'use client';

import { Inbox, Loader2, type LucideIcon } from 'lucide-react';
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

/** Shared surface for every portal card: white, hairline border, soft layered shadow. */
export const surface = 'rounded-[1.25rem] border border-brand-900/[0.07] bg-white shadow-[0_1px_2px_rgb(11_58_60/0.04),0_10px_30px_-18px_rgb(11_58_60/0.25)]';

export function PageTitle({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-600">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold leading-tight text-brand-900 sm:text-[2.6rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Brand hero band with an optional row of figures, used at the top of analytical pages. */
export function Hero({ title, subtitle, children, aside }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="pattern-girih relative mb-6 overflow-hidden rounded-[1.5rem] bg-brand-900 p-6 text-white shadow-[0_18px_40px_-24px_rgb(5_40_42/0.8)] sm:p-7">
      <span aria-hidden className="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-gold-400/15 blur-2xl" />
      <div className="relative flex flex-wrap items-center gap-6">
        <div className="min-w-0 flex-1">
          <div className="font-display text-2xl font-semibold leading-tight sm:text-3xl">{title}</div>
          {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
          {children && <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-10">{children}</div>}
        </div>
        {aside}
      </div>
    </section>
  );
}
export function HeroFigure({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-300">{label}</p><p className="mt-1 font-display text-3xl font-semibold leading-none">{value}</p>{hint && <p className="mt-1 text-xs text-white/60">{hint}</p>}</div>;
}

export function Card({ title, eyebrow, action, children, className, icon: Icon }: { title?: ReactNode; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string; icon?: LucideIcon }) {
  return (
    <section className={cn(surface, 'min-w-0 p-5 sm:p-6', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700"><Icon className="size-[18px]" /></span>}
            <div className="min-w-0">{eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>}<h2 className="font-display text-xl font-semibold leading-tight text-brand-900">{title}</h2></div>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** KPI tile: icon, label, big value, optional hint and trend line. */
export function Stat({ label, value, hint, tone = 'default', icon: Icon, trend }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'brand'; icon?: LucideIcon; trend?: ReactNode }) {
  const brand = tone === 'brand';
  return (
    <div className={cn('relative overflow-hidden p-5', brand ? 'pattern-girih rounded-[1.25rem] bg-brand-900 text-white shadow-[0_14px_30px_-20px_rgb(5_40_42/0.9)]' : surface)}>
      <div className="flex items-start justify-between gap-3">
        <p className={cn('text-[11px] font-bold uppercase tracking-[0.14em]', brand ? 'text-gold-300' : 'text-muted')}>{label}</p>
        {Icon && <span className={cn('grid size-9 place-items-center rounded-xl', brand ? 'bg-white/10 text-gold-300' : 'bg-gold-100 text-gold-700')}><Icon className="size-[18px]" /></span>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className={cn('font-display text-4xl font-semibold leading-none', brand ? 'text-white' : 'text-brand-900')}>{value}</p>
        {trend && <span className={brand ? 'text-gold-300' : 'text-brand-600'}>{trend}</span>}
      </div>
      {hint && <p className={cn('mt-2 text-xs', brand ? 'text-white/65' : 'text-muted')}>{hint}</p>}
    </div>
  );
}

export function Empty({ text, children }: { text: string; children?: ReactNode }) {
  return <div className="flex flex-col items-center gap-3 rounded-[1.25rem] border border-dashed border-gold-300 bg-cream-50/60 p-10 text-center text-sm text-muted"><span className="grid size-12 place-items-center rounded-2xl bg-gold-100 text-gold-700"><Inbox className="size-6" aria-hidden /></span>{text}{children}</div>;
}

export function Loading() {
  return (
    <div className="space-y-3" aria-busy="true">
      <p className="sr-only"><Loader2 className="animate-spin" /></p>
      {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-[1.25rem] bg-gradient-to-r from-cream-200/70 via-cream-100 to-cream-200/70" />)}
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
  UPLOADED: 'bg-amber-50 text-warning', VERIFIED: 'bg-emerald-50 text-success', REJECTED: 'bg-red-50 text-danger', SUCCEEDED: 'bg-emerald-50 text-success', FAILED: 'bg-red-50 text-danger',
};
export function Pill({ status, label }: { status: string; label?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', TONES[status] ?? 'bg-cream-200 text-brand-900')}>{label ?? status.replace(/_/g, ' ')}</span>;
}

export function Progress({ value, className, tone = 'brand' }: { value: number; className?: string; tone?: 'brand' | 'gold' | 'success' | 'warn' }) {
  const bar = { brand: 'bg-gradient-to-r from-brand-700 to-brand-600', gold: 'bg-gradient-to-r from-gold-600 to-gold-400', success: 'bg-success', warn: 'bg-warning' }[tone];
  return <div className={cn('h-2 overflow-hidden rounded-full bg-cream-200', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><div className={cn('h-full rounded-full transition-all duration-700', bar)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-full border border-brand-900/[0.07] bg-white p-1 shadow-sm">
      {options.map((o) => <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className={cn('rounded-full px-4 py-1.5 text-xs font-semibold transition', value === o.value ? 'bg-brand-900 text-white shadow' : 'text-brand-900/75 hover:bg-cream-100 hover:text-brand-900')}>{o.label}</button>)}
    </div>
  );
}

export const inputCls = 'h-10 rounded-full border border-brand-900/10 bg-white px-4 text-sm shadow-sm outline-none placeholder:text-muted/70 focus:border-gold-500 focus:ring-2 focus:ring-gold-200';
