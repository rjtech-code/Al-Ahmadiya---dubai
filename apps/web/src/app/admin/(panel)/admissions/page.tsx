'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { adminBtnOutline, adminInput, ErrorNote, PageHeader, Pager, StatusPill, Table } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface A { id: string; reference: string; status: string; submittedAt: string | null; applicant: { fullName: string; email: string }; program: { nameEn: string } | null }
const STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_PENDING', 'RETURNED_FOR_CORRECTION', 'APPROVED', 'REJECTED', 'WITHDRAWN'];

export default function AdmissionsAdmin() {
  const [rows, setRows] = useState<A[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const fetchRows = useCallback(() => apiFetch<{ data: A[]; meta: typeof meta }>(`/admin/applications?page=${page}&pageSize=20${status ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`), [page, status, q]);
  useEffect(() => {
    let c = false;
    fetchRows().then((r) => { if (!c) { setRows(r.data); setMeta(r.meta); } }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed'); });
    return () => { c = true; };
  }, [fetchRows, reload]);

  const exportCsv = () => {
    const lines = [['Reference', 'Applicant', 'Email', 'Programme', 'Status', 'Submitted'], ...rows.map((r) => [r.reference, r.applicant.fullName, r.applicant.email, r.program?.nameEn ?? '', r.status, r.submittedAt ?? ''])];
    const csv = lines.map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `applications-page-${page}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Applications" crumbs={[{ label: 'Admissions' }]} description="Submitted applications. Drafts are not shown." actions={<button onClick={exportCsv} disabled={!rows.length} className={adminBtnOutline}>Export CSV</button>} />
      <ErrorNote message={error} />
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setReload((n) => n + 1); }} className="mb-3 flex flex-wrap gap-2">
        <input aria-label="Search" placeholder="Reference, name or email…" value={q} onChange={(e) => setQ(e.target.value)} className={`${adminInput} max-w-sm`} />
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={`${adminInput} !w-56`}><option value="">All (excluding drafts)</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <button className={adminBtnOutline}>Search</button>
      </form>
      <Table head={['Reference', 'Applicant', 'Programme', 'Status', 'Submitted']} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-[#fafbfd]">
            <td className="px-4 py-2.5"><Link href={`/admin/admissions/${r.id}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">{r.reference}</Link></td>
            <td className="px-4 py-2.5">{r.applicant.fullName}<span className="block text-xs text-muted">{r.applicant.email}</span></td>
            <td className="px-4 py-2.5">{r.program?.nameEn ?? '—'}</td>
            <td className="px-4 py-2.5"><StatusPill status={r.status} /></td>
            <td className="px-4 py-2.5 text-xs">{r.submittedAt ? new Date(r.submittedAt).toLocaleString('en-GB') : '—'}</td>
          </tr>
        ))}
      </Table>
      <Pager page={meta.page} totalPages={meta.totalPages} onPage={setPage} />
    </>
  );
}
