'use client';

import { Download } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { adminBtn, adminBtnOutline, adminInput, ErrorNote, PageHeader, Panel, StatusPill } from '@/components/admin/ui';
import { apiFetch, ApiError, tokenStore } from '@/lib/client-api';

interface Detail {
  id: string; reference: string; status: string; submittedAt: string | null; decisionNote: string | null;
  personal: Record<string, unknown> | null; contact: Record<string, unknown> | null; academic: Record<string, unknown> | null;
  applicant: { fullName: string; email: string }; program: { nameEn: string } | null;
  documents: { id: string; docType: string; originalName: string; mimeType: string; sizeBytes: number; status: string }[];
  statusHistory: { id: string; fromStatus: string | null; toStatus: string; note: string | null; createdAt: string }[];
}
const NEXT: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'RETURNED_FOR_CORRECTION'],
  UNDER_REVIEW: ['DOCUMENTS_PENDING', 'RETURNED_FOR_CORRECTION', 'APPROVED', 'REJECTED'],
  DOCUMENTS_PENDING: ['UNDER_REVIEW', 'RETURNED_FOR_CORRECTION'],
};

function Kv({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <p className="text-sm text-muted">Not provided.</p>;
  return <dl className="grid gap-2 text-sm sm:grid-cols-2">{Object.entries(data).map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</dd></div>)}</dl>;
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdmin();
  const [d, setD] = useState<Detail | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let c = false;
    apiFetch<{ data: Detail }>(`/admin/applications/${id}`).then((r) => { if (!c) setD(r.data); }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed'); });
    return () => { c = true; };
  }, [id, reload]);

  const transition = async (to: string) => {
    if (['APPROVED', 'REJECTED'].includes(to) && !window.confirm(`Confirm decision: ${to}?`)) return;
    setError('');
    try { await apiFetch(`/admin/applications/${id}/transition`, { method: 'POST', json: { to, note: note || undefined } }); setNote(''); setReload((n) => n + 1); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed'); }
  };
  const download = async (docId: string, name: string) => {
    const res = await fetch(`/api/v1/admin/applications/${id}/documents/${docId}`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
    if (!res.ok) { setError('Download failed'); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  };

  if (!d) return <><ErrorNote message={error} /><p className="text-sm text-muted">Loading…</p></>;
  const options = (NEXT[d.status] ?? []).filter((s) => (['APPROVED', 'REJECTED'].includes(s) ? can('admissions.decide') : can('admissions.review')));

  return (
    <>
      <PageHeader title={d.reference} crumbs={[{ label: 'Admissions', href: '/admin/admissions' }, { label: d.reference }]} description={`${d.applicant.fullName} · ${d.applicant.email} · ${d.program?.nameEn ?? 'No programme'}`} actions={<StatusPill status={d.status} />} />
      <ErrorNote message={error} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Panel title="Personal information"><Kv data={d.personal} /></Panel>
          <Panel title="Contact information"><Kv data={d.contact} /></Panel>
          <Panel title="Academic information"><Kv data={d.academic} /></Panel>
          <Panel title={`Documents (${d.documents.length})`}>
            <ul className="divide-y divide-line text-sm">
              {d.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2 py-2">
                  <span>{doc.originalName} <span className="text-xs text-muted">· {doc.docType} · {(doc.sizeBytes / 1024).toFixed(0)} KB</span></span>
                  {can('admissions.review') && <button onClick={() => void download(doc.id, doc.originalName)} className={adminBtnOutline}><Download className="size-3.5" />Download</button>}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Review action">
            {options.length ? (
              <>
                <label htmlFor="note" className="mb-1 block text-xs font-semibold">Note (recorded in history)</label>
                <textarea id="note" rows={3} className={`${adminInput} h-auto py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="mt-3 flex flex-wrap gap-2">{options.map((s) => <button key={s} onClick={() => void transition(s)} className={s === 'APPROVED' ? adminBtn : adminBtnOutline}>{s.replace(/_/g, ' ')}</button>)}</div>
              </>
            ) : <p className="text-sm text-muted">No further actions available for this status with your permissions.</p>}
          </Panel>
          <Panel title="Status history">
            <ol className="space-y-3 text-sm">
              {d.statusHistory.map((h) => <li key={h.id}><StatusPill status={h.toStatus} /> <span className="text-xs text-muted">{new Date(h.createdAt).toLocaleString('en-GB')}</span>{h.note && <p className="mt-0.5 text-xs">{h.note}</p>}</li>)}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
