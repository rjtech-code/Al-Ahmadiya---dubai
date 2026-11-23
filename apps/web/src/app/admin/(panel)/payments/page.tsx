'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminInput, ErrorNote, PageHeader, Pager, StatCard, StatusPill, Table } from '@/components/admin/ui';
import { apiFetch, ApiError, formatMoney } from '@/lib/client-api';

interface P { id: string; purpose: string; description: string; amountFils: number; currency: string; status: string; provider: string; providerRef: string | null; receiptNumber: string | null; paidAt: string | null; createdAt: string; user: { fullName: string; email: string } }
interface Meta { page: number; totalPages: number; totals: { purpose: string; count: number; amountFils: number }[]; provider: string }

export default function PaymentsAdmin() {
  const [rows, setRows] = useState<P[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState('');
  const fetchRows = useCallback(() => apiFetch<{ data: P[]; meta: Meta }>(`/admin/payments?page=${page}&pageSize=25${status ? `&status=${status}` : ''}${purpose ? `&purpose=${purpose}` : ''}`), [page, status, purpose]);
  useEffect(() => {
    let c = false;
    fetchRows().then((r) => { if (!c) { setRows(r.data); setMeta(r.meta); } }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed'); });
    return () => { c = true; };
  }, [fetchRows]);
  const total = (p: string) => meta?.totals.find((t) => t.purpose === p);
  return (
    <>
      <PageHeader title="Payments" crumbs={[{ label: 'Payments' }]} description={`Application fees and course purchases. A payment is only marked paid after the gateway signature/webhook is verified on the server. Gateway: ${meta?.provider ?? '…'}${meta?.provider === 'test' ? ' (development test gateway — no real money)' : ''}.`} />
      <ErrorNote message={error} />
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <StatCard label={`Application fees (${total('application-fee')?.count ?? 0})`} value={formatMoney(total('application-fee')?.amountFils ?? 0)} />
        <StatCard label={`Course sales (${total('course')?.count ?? 0})`} value={formatMoney(total('course')?.amountFils ?? 0)} />
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <select aria-label="Status" className={`${adminInput} !w-44`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{['SUCCEEDED', 'PENDING', 'FAILED', 'REFUNDED'].map((s) => <option key={s}>{s}</option>)}</select>
        <select aria-label="Purpose" className={`${adminInput} !w-48`} value={purpose} onChange={(e) => { setPurpose(e.target.value); setPage(1); }}><option value="">All purposes</option><option value="application-fee">Application fee</option><option value="course">Course</option></select>
      </div>
      <Table head={['Date', 'Payer', 'Description', 'Amount', 'Status', 'Receipt', 'Gateway ref']} empty={!rows.length}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-2.5 text-xs">{new Date(p.paidAt ?? p.createdAt).toLocaleString('en-GB')}</td>
            <td className="px-4 py-2.5">{p.user.fullName}<span className="block text-xs text-muted">{p.user.email}</span></td>
            <td className="px-4 py-2.5 text-xs">{p.description}</td>
            <td className="px-4 py-2.5 font-semibold">{formatMoney(p.amountFils, p.currency)}</td>
            <td className="px-4 py-2.5"><StatusPill status={p.status} /></td>
            <td className="px-4 py-2.5 font-mono text-xs">{p.receiptNumber ?? '—'}</td>
            <td className="px-4 py-2.5 font-mono text-[11px] text-muted">{p.provider}:{p.providerRef ?? '—'}</td>
          </tr>
        ))}
      </Table>
      <Pager page={meta?.page ?? 1} totalPages={meta?.totalPages ?? 1} onPage={setPage} />
    </>
  );
}
