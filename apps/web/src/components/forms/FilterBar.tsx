'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { buttonClass } from '../ui/Button';

export interface FilterField {
  name: string;
  label: string;
  type: 'search' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
}

const LG_COLS: Record<number, string> = { 1: 'lg:grid-cols-2', 2: 'lg:grid-cols-3', 3: 'lg:grid-cols-4' };

/** Search + filter controls that sync to the URL query string (server pages re-render with results). */
export function FilterBar({ fields }: { fields: FilterField[] }) {
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, sp.get(f.name) ?? ''])));

  const apply = (next: Record<string, string>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    start(() => router.push(`${pathname}${q.size ? `?${q}` : ''}`, { scroll: false }));
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    apply(values);
  };
  const hasAny = Object.values(values).some(Boolean);
  const search = fields.filter((f) => f.type === 'search');
  const selects = fields.filter((f) => f.type === 'select');

  return (
    <form role="search" onSubmit={onSubmit} className="glass rounded-[1.75rem] p-3 sm:p-4" aria-busy={pending}>
      {search.map((f) => (
        <div key={f.name} className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">{f.label}</span>
            <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={values[f.name]}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              placeholder={f.placeholder}
              maxLength={100}
              className="h-11 w-full rounded-full border border-line bg-white ps-10 pe-4 text-sm outline-none transition focus:border-gold-500 focus:bg-white"
            />
          </label>
          <button type="submit" className={buttonClass('gold', 'md')}>{t('search')}</button>
        </div>
      ))}
      {selects.length > 0 && (
        <div className={`grid gap-2 sm:grid-cols-2 ${LG_COLS[Math.min(selects.length, 3)]} ${search.length ? 'mt-3' : ''}`}>
          {selects.map((f) => (
            <label key={f.name} className="block">
              <span className="sr-only">{f.label}</span>
              <select
                value={values[f.name]}
                onChange={(e) => {
                  const next = { ...values, [f.name]: e.target.value };
                  setValues(next);
                  apply(next);
                }}
                className="h-10 w-full rounded-full border border-line bg-white px-4 text-sm text-brand-900 outline-none focus:border-gold-500"
              >
                <option value="">{f.label}: {t('all')}</option>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          ))}
          {hasAny && (
            <button type="button" onClick={() => { const cleared = Object.fromEntries(fields.map((f) => [f.name, ''])); setValues(cleared); apply(cleared); }} className="inline-flex h-10 items-center justify-center gap-1 rounded-md text-sm font-semibold text-brand-700 hover:text-gold-700">
              <X className="size-4" aria-hidden />{t('clear')}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
