'use client';

import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/client-api';
import { useAdmin } from './AdminContext';
import { CMS_FIELDS, type FieldDef } from './cmsFields';
import { adminBtn, adminBtnDanger, adminBtnOutline, adminInput, ErrorNote, PageHeader, Pager, StatusPill, Table } from './ui';

type Row = Record<string, unknown> & { id: string };
interface Meta { page: number; totalPages: number; total: number }

/** Converts an API record into editable form values. */
export function toForm(fields: FieldDef[], row: Row | null): Record<string, string | boolean> {
  const v: Record<string, string | boolean> = {};
  for (const f of fields) {
    const raw = row?.[f.name];
    if (f.type === 'bool') v[f.name] = Boolean(raw);
    else if (f.type === 'list') v[f.name] = Array.isArray(raw) ? raw.join('\n') : '';
    else if (f.type === 'json') v[f.name] = raw ? JSON.stringify(raw, null, 2) : '';
    else if (f.type === 'relations') v[f.name] = Array.isArray(row?.departments) ? (row!.departments as { id: string }[]).map((d) => d.id).join(',') : '';
    else if (f.type === 'datetime') v[f.name] = raw ? new Date(String(raw)).toISOString().slice(0, 16) : '';
    else if (f.type === 'date') v[f.name] = raw ? String(raw).slice(0, 10) : '';
    else if (f.name === 'authors' && Array.isArray(row?.authors)) v[f.name] = JSON.stringify(row!.authors, null, 2);
    else v[f.name] = raw === null || raw === undefined ? '' : String(raw);
  }
  if (!row) { if ('publishStatus' in v) v.publishStatus = 'DRAFT'; if ('confirmation' in v) v.confirmation = 'CLIENT_CONFIRMATION_REQUIRED'; }
  return v;
}

export function toPayload(fields: FieldDef[], v: Record<string, string | boolean>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const x = v[f.name];
    if (f.type === 'bool') out[f.name] = Boolean(x);
    else if (f.type === 'number') out[f.name] = x === '' ? (f.required ? undefined : null) : Number(x);
    else if (f.type === 'list') out[f.name] = String(x).split('\n').map((s) => s.trim()).filter(Boolean);
    else if (f.type === 'json') {
      if (String(x).trim() === '') out[f.name] = f.required ? undefined : null;
      else {
        let parsed: unknown;
        try { parsed = JSON.parse(String(x)); } catch { throw new Error(`${f.label}: invalid JSON`); }
        if (f.name === 'authors' && Array.isArray(parsed)) parsed = parsed.map((a: Record<string, unknown>) => ({ name: a.name, affiliation: a.affiliation ?? null, facultyId: a.facultyId ?? null }));
        out[f.name] = parsed;
      }
    } else if (f.type === 'relations') out[f.name] = String(x).split(',').filter(Boolean);
    else if (f.type === 'datetime') out[f.name] = x ? new Date(String(x)).toISOString() : (f.required ? undefined : null);
    else if (f.type === 'date') out[f.name] = x ? String(x) : null;
    else out[f.name] = x === '' ? (f.required ? '' : null) : x;
  }
  return out;
}

export function RelationSelect({ f, value, onChange, multiple }: { f: FieldDef; value: string; onChange: (v: string) => void; multiple?: boolean }) {
  const [opts, setOpts] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    let c = false;
    apiFetch<{ data: Row[] }>(`/admin/cms/${f.resource}?pageSize=100`).then(({ data }) => { if (!c) setOpts(data.map((r) => ({ id: r.id, label: String(r[f.labelField ?? 'nameEn'] ?? r.id) }))); }).catch(() => undefined);
    return () => { c = true; };
  }, [f.resource, f.labelField]);
  if (multiple) {
    const sel = value.split(',').filter(Boolean);
    return <select multiple className={`${adminInput} h-28`} value={sel} onChange={(e) => onChange([...e.target.selectedOptions].map((o) => o.value).join(','))}>{opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>;
  }
  return <select className={adminInput} value={value} onChange={(e) => onChange(e.target.value)} required={f.required}><option value="">—</option>{opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>;
}

export function CmsEditor({ resource }: { resource: string }) {
  const def = CMS_FIELDS[resource];
  const { can } = useAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, totalPages: 1, total: 0 });
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const hasStatus = def?.fields.some((f) => f.name === 'publishStatus');

  const fetchRows = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page), pageSize: '20', ...(q ? { q } : {}), ...(status ? { status } : {}) });
    return apiFetch<{ data: Row[]; meta: Meta }>(`/admin/cms/${resource}?${qs}`);
  }, [resource, page, q, status]);

  useEffect(() => {
    let c = false;
    fetchRows().then((r) => { if (!c) { setRows(r.data); setMeta(r.meta); } }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed to load'); });
    return () => { c = true; };
  }, [fetchRows, reload]);

  if (!def) return <p>Unknown resource.</p>;

  const open = async (row: Row | 'new') => {
    setError(''); setFieldErrors({});
    if (row === 'new') { setForm(toForm(def.fields, null)); setEditing('new'); return; }
    try { const { data } = await apiFetch<{ data: Row }>(`/admin/cms/${resource}/${row.id}`); setForm(toForm(def.fields, data)); setEditing(data); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load record'); }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({});
    try {
      const payload = toPayload(def.fields, form);
      if (editing === 'new') await apiFetch(`/admin/cms/${resource}`, { method: 'POST', json: payload });
      else if (editing) await apiFetch(`/admin/cms/${resource}/${editing.id}`, { method: 'PUT', json: payload });
      setEditing(null); setReload((n) => n + 1);
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.body.details)) setFieldErrors(Object.fromEntries((err.body.details as { path: string; message: string }[]).map((d) => [d.path.split('.')[0], d.message])));
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally { setBusy(false); }
  };

  const setPublish = async (row: Row, s: string) => {
    try { await apiFetch(`/admin/cms/${resource}/${row.id}/status`, { method: 'POST', json: { status: s } }); setReload((n) => n + 1); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed'); }
  };
  const remove = async (row: Row) => {
    if (!window.confirm('Delete this record? Published content will be archived.')) return;
    try { await apiFetch(`/admin/cms/${resource}/${row.id}`, { method: 'DELETE' }); setEditing(null); setReload((n) => n + 1); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed'); }
  };

  if (editing) {
    return (
      <>
        <PageHeader title={editing === 'new' ? `New — ${def.title}` : `Edit — ${def.title}`} crumbs={[{ label: 'Content', href: '/admin/cms' }, { label: def.title }, { label: editing === 'new' ? 'New' : 'Edit' }]} />
        <ErrorNote message={error} />
        {!can('cms.publish') && hasStatus && <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-warning">You can save drafts. A user with publishing rights must publish them.</p>}
        <form onSubmit={save} className="grid gap-4 rounded-[1.25rem] border border-brand-900/[0.07] bg-white p-6 shadow-[0_1px_2px_rgb(11_58_60/0.04),0_10px_30px_-18px_rgb(11_58_60/0.25)] sm:grid-cols-2">
          {def.fields.map((f) => {
            const id = `f-${f.name}`;
            const val = form[f.name];
            const set = (v: string | boolean) => setForm((s) => ({ ...s, [f.name]: v }));
            const rtl = f.name.endsWith('Ar');
            return (
              <div key={f.name} className={f.full ? 'sm:col-span-2' : ''}>
                <label htmlFor={id} className="mb-1 block text-xs font-semibold text-brand-900">{f.label}{f.required && <span className="text-danger"> *</span>}</label>
                {f.type === 'bool' ? <input id={id} type="checkbox" checked={Boolean(val)} onChange={(e) => set(e.target.checked)} className="size-4" />
                  : f.type === 'select' ? <select id={id} className={adminInput} value={String(val)} onChange={(e) => set(e.target.value)} required={f.required}>{!f.required && <option value="">—</option>}{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
                  : f.type === 'relation' ? <RelationSelect f={f} value={String(val)} onChange={set} />
                  : f.type === 'relations' ? <RelationSelect f={f} value={String(val)} onChange={set} multiple />
                  : f.type === 'textarea' || f.type === 'list' || f.type === 'json' ? <textarea id={id} dir={rtl ? 'rtl' : undefined} rows={f.type === 'json' ? 6 : 4} className={`${adminInput} h-auto py-2 ${f.type === 'json' ? 'font-mono text-xs' : ''}`} value={String(val)} onChange={(e) => set(e.target.value)} required={f.required} />
                  : <input id={id} dir={rtl ? 'rtl' : undefined} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'datetime' ? 'datetime-local' : 'text'} step="any" className={adminInput} value={String(val)} onChange={(e) => set(e.target.value)} required={f.required} />}
                {fieldErrors[f.name] ? <p className="mt-1 text-xs text-danger">{fieldErrors[f.name]}</p> : f.hint && <p className="mt-1 text-[11px] text-muted">{f.hint}</p>}
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 border-t border-line pt-4 sm:col-span-2">
            <button type="submit" disabled={busy} className={adminBtn}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={() => setEditing(null)} className={adminBtnOutline}>Cancel</button>
            {editing !== 'new' && can('cms.publish') && <button type="button" onClick={() => void remove(editing)} className={`${adminBtnDanger} ms-auto`}>Delete</button>}
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader title={def.title} crumbs={[{ label: 'Content', href: '/admin/cms' }, { label: def.title }]} actions={can('cms.write') && <button onClick={() => void open('new')} className={adminBtn}><Plus className="size-4" />New</button>} />
      <ErrorNote message={error} />
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setReload((n) => n + 1); }} className="mb-3 flex flex-wrap gap-2">
        <label className="relative min-w-60 flex-1"><span className="sr-only">Search</span><Search className="absolute start-2.5 top-2.5 size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`${adminInput} ps-8`} /></label>
        {hasStatus && <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={`${adminInput} !w-40`}><option value="">All statuses</option><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select>}
        <button className={adminBtnOutline}>Search</button>
      </form>
      <Table head={[...def.columns, ...(hasStatus ? ['Status'] : []), 'Actions']} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-[#fafbfd]">
            {def.columns.map((c) => <td key={c} className="max-w-xs truncate px-4 py-2.5">{typeof r[c] === 'boolean' ? (r[c] ? 'Yes' : 'No') : c.endsWith('At') || c.endsWith('On') ? (r[c] ? new Date(String(r[c])).toLocaleDateString('en-GB') : '—') : String(r[c] ?? '—')}</td>)}
            {hasStatus && (
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1">
                  <StatusPill status={String(r.publishStatus)} />
                  {'confirmation' in r && <StatusPill status={String(r.confirmation)} />}
                  {r.isDemo === true && <StatusPill status="DEMO" />}
                  {r.publishStatus === 'PUBLISHED' && r.confirmation === 'CLIENT_CONFIRMATION_REQUIRED' && !r.isDemo && resource !== 'heritage' && (
                    <span title="Published records are only shown on the website once marked CONFIRMED." className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-danger">Hidden: awaiting confirmation</span>
                  )}
                </div>
              </td>
            )}
            <td className="px-4 py-2.5">
              <div className="flex gap-1.5">
                <button onClick={() => void open(r)} className="text-xs font-semibold text-brand-700 hover:underline">Edit</button>
                {hasStatus && can('cms.publish') && (r.publishStatus === 'PUBLISHED'
                  ? <button onClick={() => void setPublish(r, 'DRAFT')} className="text-xs font-semibold text-warning hover:underline">Unpublish</button>
                  : <button onClick={() => void setPublish(r, 'PUBLISHED')} className="text-xs font-semibold text-success hover:underline">Publish</button>)}
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <Pager page={meta.page} totalPages={meta.totalPages} onPage={setPage} />
    </>
  );
}
