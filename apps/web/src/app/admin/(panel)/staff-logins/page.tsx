'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adminBtnOutline, adminInput, ErrorNote, PageHeader, Pager, StatCard, StatusPill, Table } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface L { id: string; email: string; success: boolean; reason: string | null; ip: string | null; userAgent: string | null; createdAt: string; user: { fullName: string; roles: { role: { nameEn: string } }[] } | null }
interface Meta { page: number; totalPages: number; total: number; last30Days: { success?: number; failed?: number } }

/** Staff sign-in history only (students/applicants are never recorded). Entries older than 12 months are deleted automatically. */
export default function StaffLogins() {
  const [rows, setRows] = useState<L[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [result, setResult] = useState('');
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const fetchRows = useCallback(() => apiFetch<{ data: L[]; meta: Meta }>(`/admin/staff-logins?page=${page}&pageSize=50${q ? `&q=${encodeURIComponent(q)}` : ''}${result ? `&result=${result}` : ''}`), [page, q, result]);
  useEffect(() => {
    let c = false;
    fetchRows().then((r) => { if (!c) { setRows(r.data); setMeta(r.meta); } }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed'); });
    return () => { c = true; };
  }, [fetchRows, reload]);
  const ua = (s: string | null) => (s ? (/(Firefox|Edg|Chrome|Safari)\/[\d.]+/.exec(s)?.[0] ?? s.slice(0, 40)) : '—');
  return (
    <>
      <PageHeader title="Staff login history" crumbs={[{ label: 'Staff logins' }]} description="Sign-ins to the administration panel by staff accounts only. Student and applicant logins are not stored. Records are deleted automatically after 12 months." />
      <ErrorNote message={error} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Successful sign-ins (30 days)" value={meta?.last30Days.success ?? 0} />
        <StatCard label="Failed attempts (30 days)" value={meta?.last30Days.failed ?? 0} />
        <StatCard label="Records kept" value={meta?.total ?? 0} hint="Retention: 12 months" />
      </div>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); setPage(1); setReload((n) => n + 1); }} className="mb-3 flex flex-wrap gap-2">
        <input aria-label="Email" placeholder="Filter by e-mail…" value={q} onChange={(e) => setQ(e.target.value)} className={`${adminInput} max-w-xs`} />
        <select aria-label="Result" value={result} onChange={(e) => { setResult(e.target.value); setPage(1); }} className={`${adminInput} !w-40`}><option value="">All</option><option value="success">Successful</option><option value="failed">Failed</option></select>
        <button className={adminBtnOutline}>Filter</button>
      </form>
      <Table head={['Time', 'Staff member', 'Role', 'Result', 'IP address', 'Browser']} empty={!rows.length}>
        {rows.map((l) => (
          <tr key={l.id}>
            <td className="whitespace-nowrap px-4 py-2.5 text-xs">{new Date(l.createdAt).toLocaleString('en-GB')}</td>
            <td className="px-4 py-2.5">{l.user?.fullName ?? '—'}<span className="block text-xs text-muted">{l.email}</span></td>
            <td className="px-4 py-2.5 text-xs">{l.user?.roles.map((r) => r.role.nameEn).join(', ') ?? '—'}</td>
            <td className="px-4 py-2.5">{l.success ? <StatusPill status="SUCCESS" /> : <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-danger">FAILED · {l.reason?.replace(/_/g, ' ').toLowerCase()}</span>}</td>
            <td className="px-4 py-2.5 font-mono text-xs">{l.ip ?? '—'}</td>
            <td className="px-4 py-2.5 text-xs text-muted">{ua(l.userAgent)}</td>
          </tr>
        ))}
      </Table>
      <Pager page={meta?.page ?? 1} totalPages={meta?.totalPages ?? 1} onPage={setPage} />
    </>
  );
}
