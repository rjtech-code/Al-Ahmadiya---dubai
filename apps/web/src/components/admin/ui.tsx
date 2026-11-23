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
          <nav aria-label="Breadcrumb" className="mb-1 text-xs text-muted">
            {[{ label: 'Admin', href: '/admin' }, ...crumbs].map((c, i, a) => (
              <span key={i}>{c.href && i < a.length - 1 ? <Link href={c.href} className="hover:text-brand-900">{c.label}</Link> : c.label}{i < a.length - 1 && ' / '}</span>
            ))}
          </nav>
        )}
        <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-semibold text-brand-900">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn('rounded-[1.5rem] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)]', className)}>
      {title && <div className="flex items-center justify-between border-b border-line px-5 py-4"><h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-brand-900">{title}</h2>{actions}</div>}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/80 bg-cream-50 p-5 shadow-[var(--shadow-card)]">
      <span className="block h-0.5 w-10 bg-gold-500" aria-hidden />
      <p className="mt-3 text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-cormorant)] text-4xl font-semibold text-brand-900">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-cream-200/60 text-xs uppercase tracking-wide text-brand-800">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-sm text-muted">No records found.</p>}
    </div>
  );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-sm">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="grid size-8 place-items-center rounded border border-line disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="size-4" /></button>
      <span className="text-muted">Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="grid size-8 place-items-center rounded border border-line disabled:opacity-40" aria-label="Next page"><ChevronRight className="size-4" /></button>
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
  return <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_TONE[status] ?? 'bg-gray-100 text-muted')}>{status.replace(/_/g, ' ')}</span>;
}

export const adminInput = 'h-10 w-full rounded-xl border border-line bg-white px-3.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-200';
export const adminBtn = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50';
export const adminBtnOutline = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-gold-400 bg-transparent px-5 text-sm font-semibold text-brand-900 hover:border-gold-500 disabled:opacity-50';
export const adminBtnDanger = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-red-200 bg-white px-5 text-sm font-semibold text-danger hover:bg-red-50 disabled:opacity-50';

export function ErrorNote({ message }: { message: string }) {
  return message ? <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{message}</p> : null;
}
