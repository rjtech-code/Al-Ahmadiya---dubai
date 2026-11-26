'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { adminBtn, adminInput, ErrorNote, PageHeader, StatusPill } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface Setting { key: string; valueEn: string | null; valueAr: string | null; confirmation: string; sourceUrl: string | null; note: string | null; updatedAt: string }

function Row({ s, canEdit, onSaved }: { s: Setting; canEdit: boolean; onSaved: (s: Setting) => void }) {
  const [v, setV] = useState({ valueEn: s.valueEn ?? '', valueAr: s.valueAr ?? '', confirmation: s.confirmation, sourceUrl: s.sourceUrl ?? '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const dirty = v.valueEn !== (s.valueEn ?? '') || v.valueAr !== (s.valueAr ?? '') || v.confirmation !== s.confirmation || v.sourceUrl !== (s.sourceUrl ?? '');
  const save = async () => {
    setBusy(true); setErr('');
    try {
      const { data } = await apiFetch<{ data: Setting }>(`/admin/settings/${encodeURIComponent(s.key)}`, { method: 'PUT', json: { valueEn: v.valueEn || null, valueAr: v.valueAr || null, confirmation: v.confirmation, sourceUrl: v.sourceUrl || null, note: s.note } });
      onSaved(data);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed'); } finally { setBusy(false); }
  };
  return (
    <tr className="align-top">
      <td className="px-4 py-3"><code className="text-xs font-semibold">{s.key}</code>{s.note && <p className="mt-1 max-w-xs text-[11px] text-muted">{s.note}</p>}</td>
      <td className="px-4 py-3"><textarea aria-label={`${s.key} English`} disabled={!canEdit} rows={2} className={`${adminInput} h-auto py-1.5`} value={v.valueEn} onChange={(e) => setV({ ...v, valueEn: e.target.value })} /></td>
      <td className="px-4 py-3"><textarea aria-label={`${s.key} Arabic`} disabled={!canEdit} dir="rtl" rows={2} className={`${adminInput} h-auto py-1.5`} value={v.valueAr} onChange={(e) => setV({ ...v, valueAr: e.target.value })} /></td>
      <td className="px-4 py-3">
        {canEdit ? <select aria-label={`${s.key} confirmation`} className={adminInput} value={v.confirmation} onChange={(e) => setV({ ...v, confirmation: e.target.value })}><option value="CLIENT_CONFIRMATION_REQUIRED">Confirmation required</option><option value="CONFIRMED">Confirmed</option></select> : <StatusPill status={s.confirmation} />}
        <input aria-label={`${s.key} source`} disabled={!canEdit} placeholder="Source / approval URL" className={`${adminInput} mt-1.5`} value={v.sourceUrl} onChange={(e) => setV({ ...v, sourceUrl: e.target.value })} />
        {err && <p className="mt-1 text-xs text-danger">{err}</p>}
      </td>
      <td className="px-4 py-3">{canEdit && <button disabled={!dirty || busy} onClick={() => void save()} className={adminBtn}>{busy ? '…' : 'Save'}</button>}</td>
    </tr>
  );
}

export default function SettingsPage() {
  const { can } = useAdmin();
  const [rows, setRows] = useState<Setting[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let c = false;
    apiFetch<{ data: Setting[] }>('/admin/settings').then((r) => { if (!c) setRows(r.data); }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed'); });
    return () => { c = true; };
  }, []);
  return (
    <>
      <PageHeader title="Site settings" crumbs={[{ label: 'Settings' }]} description="Institutional facts used across the website. Values are only shown publicly when marked Confirmed. Setting admissions.status to OPEN + Confirmed enables registration and online applications." />
      <ErrorNote message={error} />
      <div className="overflow-x-auto rounded-[1.25rem] border border-brand-900/[0.07] bg-white shadow-[0_1px_2px_rgb(11_58_60/0.04),0_10px_30px_-18px_rgb(11_58_60/0.25)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-line bg-cream-200/60 text-xs uppercase text-muted"><tr><th className="px-4 py-2.5">Key</th><th className="px-4 py-2.5">English</th><th className="px-4 py-2.5">Arabic</th><th className="px-4 py-2.5">Confirmation</th><th className="px-4 py-2.5" /></tr></thead>
          <tbody className="divide-y divide-line">{rows.map((s) => <Row key={s.key} s={s} canEdit={can('settings.write')} onSaved={(n) => setRows((r) => r.map((x) => (x.key === n.key ? n : x)))} />)}</tbody>
        </table>
      </div>
    </>
  );
}
