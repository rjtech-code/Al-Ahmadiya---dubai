'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/client-api';
import { RelationSelect, toForm, toPayload } from './CmsEditor';
import { CMS_FIELDS, type FieldDef } from './cmsFields';
import { adminBtn, adminInput, ErrorNote } from './ui';

type Row = Record<string, unknown> & { id: string };

/** Create/edit form for one CMS record (reused as "Step 1" of the programme and course builders). */
export function RecordForm({ resource, id, onSaved, exclude = [], submitLabel = 'Save & continue' }: {
  resource: string; id: string | null; onSaved: (row: Row) => void; exclude?: string[]; submitLabel?: string;
}) {
  const def = CMS_FIELDS[resource];
  const fields = def.fields.filter((f) => !exclude.includes(f.name));
  const [form, setForm] = useState<Record<string, string | boolean> | null>(id ? null : toForm(def.fields, null));
  const [original, setOriginal] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let c = false;
    apiFetch<{ data: Row }>(`/admin/cms/${resource}/${id}`).then(({ data }) => { if (!c) { setOriginal(data); setForm(toForm(def.fields, data)); } }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed to load'); });
    return () => { c = true; };
  }, [id, resource, def.fields]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true); setError(''); setFieldErrors({});
    try {
      // Excluded fields keep their stored values (PUT needs the full record).
      const payload = toPayload(def.fields, { ...(original ? toForm(def.fields, original) : {}), ...form });
      const r = id ? await apiFetch<{ data: Row }>(`/admin/cms/${resource}/${id}`, { method: 'PUT', json: payload }) : await apiFetch<{ data: Row }>(`/admin/cms/${resource}`, { method: 'POST', json: payload });
      onSaved(r.data);
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.body.details)) setFieldErrors(Object.fromEntries((err.body.details as { path: string; message: string }[]).map((d) => [d.path.split('.')[0], d.message])));
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally { setBusy(false); }
  };

  if (!form) return <><ErrorNote message={error} /><p className="text-sm text-muted">Loading…</p></>;
  const renderField = (f: FieldDef) => {
    const fid = `rf-${f.name}`;
    const val = form[f.name];
    const set = (v: string | boolean) => setForm((s) => ({ ...s!, [f.name]: v }));
    const rtl = f.name.endsWith('Ar');
    return (
      <div key={f.name} className={f.full ? 'sm:col-span-2' : ''}>
        <label htmlFor={fid} className="mb-1 block text-xs font-semibold text-brand-900">{f.label}{f.required && <span className="text-danger"> *</span>}</label>
        {f.type === 'bool' ? <input id={fid} type="checkbox" checked={Boolean(val)} onChange={(e) => set(e.target.checked)} className="size-4" />
          : f.type === 'select' ? <select id={fid} className={adminInput} value={String(val)} onChange={(e) => set(e.target.value)} required={f.required}>{!f.required && <option value="">—</option>}{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
          : f.type === 'relation' ? <RelationSelect f={f} value={String(val)} onChange={set} />
          : f.type === 'relations' ? <RelationSelect f={f} value={String(val)} onChange={set} multiple />
          : f.type === 'textarea' || f.type === 'list' || f.type === 'json' ? <textarea id={fid} dir={rtl ? 'rtl' : undefined} rows={f.type === 'json' ? 5 : 3} className={`${adminInput} h-auto py-2 ${f.type === 'json' ? 'font-mono text-xs' : ''}`} value={String(val)} onChange={(e) => set(e.target.value)} required={f.required} />
          : <input id={fid} dir={rtl ? 'rtl' : undefined} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'datetime' ? 'datetime-local' : 'text'} step="any" className={adminInput} value={String(val)} onChange={(e) => set(e.target.value)} required={f.required} />}
        {fieldErrors[f.name] ? <p className="mt-1 text-xs text-danger">{fieldErrors[f.name]}</p> : f.hint && <p className="mt-1 text-[11px] text-muted">{f.hint}</p>}
      </div>
    );
  };
  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><ErrorNote message={error} /></div>
      {fields.map(renderField)}
      <div className="border-t border-line pt-4 sm:col-span-2"><button disabled={busy} className={adminBtn}>{busy ? 'Saving…' : submitLabel}</button></div>
    </form>
  );
}
