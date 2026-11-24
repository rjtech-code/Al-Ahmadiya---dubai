'use client';

import { Receipt, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, BadgeDollarSign, CreditCard, FileSpreadsheet, Hourglass, ListChecks } from 'lucide-react';
import { useAdmin } from '@/components/admin/AdminContext';
import { BarChart, DashPanel, HBars, IconStat, monthLabel, QuickActions, WelcomeBanner } from '@/components/admin/dash';
import { ErrorNote, Pager, Panel, StatCard, StatusPill, Table } from '@/components/admin/ui';
import { cn } from '@/components/ui/cn';
import { apiFetch, ApiError, formatMoney } from '@/lib/client-api';

interface Summary {
  collectedFils: number; payments: number; thisMonthFils: number; dueFils: number; dueCount: number; payingStudents: number;
  monthly: { month: string; collectedFils: number }[]; aging: { label: string; fils: number }[];
  recent: { id: string; amountFils: number; currency: string; status: string; receiptNumber: string | null; paidAt: string | null; createdAt: string; purpose: string; user: { id: string; fullName: string } }[];
  dueStudents: { id: string; fullName: string; email: string; course: string; fils: number; since: string }[];
}
interface Row { id: string; name: string; email: string; courses: { code: string; title: string; status: string }[]; paidFils: number; dueFils: number; lastPaidAt: string | null }
interface Detail {
  fullName: string; email: string; paidFils: number; dueFils: number;
  enrollments: { id: string; status: string; activatedAt: string | null; createdAt: string; course: { code: string; titleEn: string; priceFils: number | null; currency: string } }[];
  payments: { id: string; purpose: string; description: string; amountFils: number; currency: string; status: string; receiptNumber: string | null; paidAt: string | null; createdAt: string }[];
}
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' }) : '—');
const COURSE_STATUS: Record<string, string> = { ACTIVE: 'Paid · studying', PENDING_PAYMENT: 'Not paid yet', CANCELLED: 'Cancelled' };

export default function Finance() {
  const { user } = useAdmin();
  const [s, setS] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<{ row: Row; d: Detail | null } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { apiFetch<{ data: Summary }>('/admin/finance/summary').then((r) => setS(r.data)).catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to load')); }, []);
  useEffect(() => {
    let x = false;
    apiFetch<{ data: Row[]; meta: { page: number; totalPages: number } }>(`/admin/finance/students?page=${page}${search ? `&q=${encodeURIComponent(search)}` : ''}`)
      .then((r) => { if (!x) { setRows(r.data); setMeta(r.meta); } }).catch((e: unknown) => { if (!x) setError(e instanceof ApiError ? e.message : 'Failed to load'); });
    return () => { x = true; };
  }, [page, search]);
  const show = async (row: Row) => {
    setOpen({ row, d: null });
    try { setOpen({ row, d: (await apiFetch<{ data: Detail }>(`/admin/finance/students/${row.id}`)).data }); } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load'); }
  };

  return (
    <>
      <WelcomeBanner title={`Welcome, ${user.fullName}`} subtitle="Finance overview — what each student bought, paid and still owes." image="/images/courses/af110.jpg" />
      <ErrorNote message={error} />
      {s && (
        <div className="mb-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <IconStat icon={BadgeDollarSign} label="Fees collected" value={formatMoney(s.collectedFils)} hint={`${formatMoney(s.thisMonthFils)} this month`} />
            <IconStat icon={Hourglass} label="Outstanding" value={formatMoney(s.dueFils)} hint={`${s.dueCount} unpaid course${s.dueCount === 1 ? '' : 's'}`} />
            <IconStat icon={FileSpreadsheet} label="Successful payments" value={s.payments} />
            <IconStat icon={ListChecks} label="Paying students" value={s.payingStudents} />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <DashPanel title="Collected per month" action={<span className="text-xs text-muted">Last 6 months · AED</span>}>
              <BarChart label="Fees collected per month (AED)" data={s.monthly.map((m) => ({ x: monthLabel(m.month), y: Math.round(m.collectedFils / 100) }))} format={(v) => v.toLocaleString('en-GB')} />
            </DashPanel>
            <DashPanel title="Outstanding by age" action={<span className="text-xs text-muted">Days since enrolment</span>}>
              {s.dueFils ? <HBars rows={s.aging.map((a) => ({ label: `${a.label} days`, value: a.fils }))} format={(v) => formatMoney(v)} /> : <p className="text-sm text-muted">Nothing outstanding.</p>}
            </DashPanel>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <DashPanel title="Recent transactions" action={<Link href="/admin/payments" className="text-xs font-semibold text-brand-700 hover:underline">All payments →</Link>}>
              {s.recent.length ? (
                <ul className="divide-y divide-line text-sm">
                  {s.recent.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0"><span className="block truncate font-semibold text-brand-900">{p.user.fullName}</span><span className="text-xs text-muted">{date(p.paidAt ?? p.createdAt)} · {p.purpose === 'course' ? 'Course fee' : 'Application fee'}</span></span>
                      <span className="text-end"><span className="block font-semibold">{formatMoney(p.amountFils, p.currency)}</span><StatusPill status={p.status} /></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">No transactions yet.</p>}
            </DashPanel>
            <DashPanel title="Unpaid courses">
              {s.dueStudents.length ? (
                <ul className="divide-y divide-line text-sm">
                  {s.dueStudents.map((u, i) => (
                    <li key={`${u.id}-${i}`} className="flex items-center justify-between gap-3 py-2">
                      <span className="flex min-w-0 items-center gap-2"><AlertTriangle className="size-4 shrink-0 text-warning" /><span className="truncate"><span className="font-semibold text-brand-900">{u.fullName}</span> · {u.course}</span></span>
                      <span className="text-xs text-muted">{formatMoney(u.fils)} · since {date(u.since)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">Every enrolled student has paid.</p>}
            </DashPanel>
          </div>
          <DashPanel title="Quick actions">
            <QuickActions items={[
              { href: '/admin/payments', label: 'All payments', icon: CreditCard },
              { href: '/admin/payments?status=SUCCEEDED', label: 'Receipts', icon: FileSpreadsheet },
              { href: '/admin/finance#students', label: 'Student balances', icon: ListChecks },
            ]} />
          </DashPanel>
        </div>
      )}
      <h2 id="students" className="mb-3 font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-brand-900">Students</h2>
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }} className="mb-4 flex max-w-md gap-2">
        <div className="relative flex-1"><Search className="absolute start-3 top-3 size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student name or email" className="h-10 w-full rounded-xl border border-line bg-white ps-9 pe-3 text-sm" /></div>
        <button className="rounded-full bg-brand-900 px-4 text-sm font-semibold text-white">Search</button>
      </form>
      {!rows ? <p className="text-sm text-muted">Loading…</p> : (
        <>
          <Table head={['Student', 'Courses', 'Paid', 'Due', 'Last payment']} empty={!rows.length}>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => void show(r)} className="cursor-pointer hover:bg-cream-100">
                <td className="px-4 py-3"><span className="font-semibold text-brand-900">{r.name}</span><span className="block text-xs text-muted">{r.email}</span></td>
                <td className="px-4 py-3"><ul className="space-y-0.5 text-xs">{r.courses.map((c) => <li key={c.code}><strong>{c.code}</strong> {c.title} <span className={cn(c.status === 'ACTIVE' ? 'text-success' : 'text-warning')}>· {COURSE_STATUS[c.status] ?? c.status}</span></li>)}{!r.courses.length && <li className="text-muted">Application fee only</li>}</ul></td>
                <td className="px-4 py-3 font-semibold text-success">{formatMoney(r.paidFils)}</td>
                <td className={cn('px-4 py-3 font-semibold', r.dueFils ? 'text-danger' : 'text-muted')}>{r.dueFils ? formatMoney(r.dueFils) : '—'}</td>
                <td className="px-4 py-3 text-xs">{date(r.lastPaidAt)}</td>
              </tr>
            ))}
          </Table>
          <Pager page={meta.page} totalPages={meta.totalPages} onPage={setPage} />
        </>
      )}
      <p className="mt-4 text-xs text-muted">Need every transaction, including failed ones? <Link href="/admin/payments" className="font-semibold text-brand-700 underline">All payments</Link></p>

      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-brand-950/40" onClick={() => setOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-xl overflow-y-auto bg-cream-100 p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div><h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-brand-900">{open.row.name}</h2><p className="text-sm text-muted">{open.row.email}</p></div>
              <button onClick={() => setOpen(null)} aria-label="Close" className="rounded-full p-2 hover:bg-cream-200"><X className="size-5" /></button>
            </div>
            {!open.d ? <p className="text-sm text-muted">Loading…</p> : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Paid" value={formatMoney(open.d.paidFils)} />
                  <StatCard label="Due" value={open.d.dueFils ? formatMoney(open.d.dueFils) : '—'} />
                </div>
                <Panel title="Courses">
                  <ul className="space-y-2 text-sm">{open.d.enrollments.map((e) => <li key={e.id} className="flex justify-between gap-2"><span><strong>{e.course.code}</strong> {e.course.titleEn}<span className="block text-xs text-muted">{e.course.priceFils ? formatMoney(e.course.priceFils, e.course.currency) : 'Free'}</span></span><span className={cn('text-xs font-semibold', e.status === 'ACTIVE' ? 'text-success' : 'text-warning')}>{COURSE_STATUS[e.status] ?? e.status}</span></li>)}{!open.d.enrollments.length && <li className="text-muted">No courses.</li>}</ul>
                </Panel>
                <Panel title="Payments & receipts">
                  <ul className="divide-y divide-line text-sm">
                    {open.d.payments.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span>{p.description}<span className="block text-xs text-muted">{date(p.paidAt ?? p.createdAt)} · {formatMoney(p.amountFils, p.currency)}</span></span>
                        {p.status === 'SUCCEEDED' && p.receiptNumber ? <a href={`/en/account/receipts/${p.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-gold-400 px-3 py-1 text-xs font-semibold text-brand-900"><Receipt className="size-3.5" />{p.receiptNumber}</a> : <StatusPill status={p.status} />}
                      </li>
                    ))}
                    {!open.d.payments.length && <li className="py-2 text-muted">No payments yet.</li>}
                  </ul>
                </Panel>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
