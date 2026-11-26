'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '../ui/cn';

export function PageHeader({ title, crumbs, actions, description }: { title: string; crumbs?: { label: string; href?: string }[]; actions?: ReactNode; description?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-600">
            {[{ label: 'Admin', href: '/admin' }, ...crumbs].map((c, i, a) => (
              <span key={i}>{c.href && i < a.length - 1 ? <Link href={c.href} className="hover:text-brand-900">{c.label}</Link> : c.label}{i < a.length - 1 && ' / '}</span>
            ))}
          </nav>
        )}
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold leading-tight text-brand-900 sm:text-[2.6rem]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn(card, className)}>
      {title && <div className="flex items-center justify-between gap-3 border-b border-brand-900/[0.06] px-5 py-4"><h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-brand-900">{title}</h2>{actions}</div>}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className={cn(card, 'relative overflow-hidden p-5')}>
      <span className="absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-gold-400 to-gold-600" aria-hidden />
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-cormorant)] text-4xl font-semibold leading-none text-brand-900">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className={cn(card, 'overflow-x-auto')}>
      <table className="w-full min-w-[640px] text-start text-sm [&_tbody_tr:hover]:bg-cream-50/80">
        <thead className="border-b border-brand-900/[0.06] bg-cream-50 text-[11px] uppercase tracking-[0.12em] text-muted">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 text-start font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-brand-900/[0.05]">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-sm text-muted">No records found.</p>}
    </div>
  );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-sm">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="grid size-9 place-items-center rounded-xl border border-brand-900/10 bg-white shadow-sm disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="size-4" /></button>
      <span className="text-muted">Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="grid size-9 place-items-center rounded-xl border border-brand-900/10 bg-white shadow-sm disabled:opacity-40" aria-label="Next page"><ChevronRight className="size-4" /></button>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  PUBLISHED: 'bg-emerald-50 text-success', DRAFT: 'bg-amber-50 text-warning', ARCHIVED: 'bg-gray-100 text-muted',
  CONFIRMED: 'bg-emerald-50 text-success', CLIENT_CONFIRMATION_REQUIRED: 'bg-amber-50 text-warning',
  SUBMITTED: 'bg-brand-50 text-brand-800', UNDER_REVIEW: 'bg-amber-50 text-warning', APPROVED: 'bg-emerald-50 text-success', REJECTED: 'bg-red-50 text-danger',
  RETURNED_FOR_CORRECTION: 'bg-amber-50 text-warning', DOCUMENTS_PENDING: 'bg-amber-50 text-warning',
};
export function StatusPill({ status }: { status: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize', STATUS_TONE[status] ?? 'bg-gray-100 text-muted')}><span className="size-1.5 rounded-full bg-current opacity-70" />{status.replace(/_/g, ' ').toLowerCase()}</span>;
}

/** Shared staff-panel surface: white, hairline border, soft layered shadow. */
export const card = 'rounded-[1.25rem] border border-brand-900/[0.07] bg-white shadow-[0_1px_2px_rgb(11_58_60/0.04),0_10px_30px_-18px_rgb(11_58_60/0.25)]';
export const adminInput = 'h-10 w-full rounded-xl border border-brand-900/10 bg-white px-3.5 text-sm shadow-sm outline-none placeholder:text-muted/70 focus:border-gold-500 focus:ring-2 focus:ring-gold-200';
export const adminBtn = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_rgb(5_40_42/0.8)] hover:bg-brand-800 disabled:opacity-50';
export const adminBtnOutline = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-brand-900/10 bg-white px-5 text-sm font-semibold text-brand-900 shadow-sm hover:border-gold-400 hover:bg-cream-50 disabled:opacity-50';
export const adminBtnDanger = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-danger hover:bg-red-50 disabled:opacity-50';

export function ErrorNote({ message }: { message: string }) {
  return message ? <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-danger">{message}</p> : null;
}
