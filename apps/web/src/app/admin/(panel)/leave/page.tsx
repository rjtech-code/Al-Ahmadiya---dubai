'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adminBtn, adminInput, ErrorNote, PageHeader, Panel, StatusPill, Table } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface Leave { id: string; type: string; startDate: string; endDate: string; reason: string | null; status: string; note: string | null }
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Any staff member: request leave and follow its status. */
export default function MyLeave() {
  const [rows, setRows] = useState<Leave[] | null>(null);
  const [f, setF] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const load = useCallback(() => apiFetch<{ data: Leave[] }>('/me/leave').then((r) => setRows(r.data)).catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed')), []);
  useEffect(() => { void load(); }, [load]);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setOk('');
    try { await apiFetch('/me/leave', { method: 'POST', json: { ...f, reason: f.reason || null } }); setOk('Request sent to HR.'); setF({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' }); await load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Failed'); }
  };
  return (
    <>
      <PageHeader title="My leave" description="Request leave; HR approves or rejects it and you are notified." />
      <ErrorNote message={error} />
      {ok && <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success">{ok}</p>}
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div>{rows && (
          <Table head={['Type', 'Dates', 'Status', 'Note', '']} empty={!rows.length}>
            {rows.map((l) => <tr key={l.id}><td className="px-4 py-2 capitalize">{l.type.toLowerCase()}</td><td className="px-4 py-2 text-xs">{day(l.startDate)} – {day(l.endDate)}</td><td className="px-4 py-2"><StatusPill status={l.status} /></td><td className="px-4 py-2 text-xs">{l.note ?? l.reason ?? '—'}</td>
              <td className="px-4 py-2 text-end">{l.status === 'PENDING' && <button onClick={async () => { await apiFetch(`/me/leave/${l.id}/cancel`, { method: 'POST' }); await load(); }} className="text-xs font-semibold text-danger">Cancel</button>}</td></tr>)}
          </Table>
        )}</div>
        <Panel title="Request leave">
          <form onSubmit={submit} className="space-y-3">
            <select className={adminInput} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="ANNUAL">Annual leave</option><option value="SICK">Sick leave</option><option value="CASUAL">Casual leave</option><option value="OTHER">Other</option></select>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold">From<input required type="date" className={`${adminInput} mt-1`} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></label>
              <label className="text-xs font-semibold">To<input required type="date" min={f.startDate} className={`${adminInput} mt-1`} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></label>
            </div>
            <textarea rows={3} maxLength={1000} className={`${adminInput} h-auto py-2`} placeholder="Reason (optional)" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
            <button className={`${adminBtn} w-full`}>Send request</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
