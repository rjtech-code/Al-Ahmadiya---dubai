'use client';

import { Fragment, useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { adminBtn, ErrorNote, PageHeader } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface Role { key: string; nameEn: string; userCount: number; permissions: string[] }

export default function RolesPage() {
  const { can } = useAdmin();
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalogue, setCatalogue] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  useEffect(() => {
    let c = false;
    apiFetch<{ data: Role[]; meta: { catalogue: Record<string, string> } }>('/admin/roles').then((r) => { if (!c) { setRoles(r.data); setCatalogue(r.meta.catalogue); } }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed'); });
    return () => { c = true; };
  }, []);
  const perms = (r: Role) => dirty[r.key] ?? r.permissions;
  const toggle = (r: Role, p: string) => setDirty((d) => ({ ...d, [r.key]: perms(r).includes(p) ? perms(r).filter((x) => x !== p) : [...perms(r), p] }));
  const save = async (r: Role) => {
    setError(''); setSaved('');
    try { await apiFetch(`/admin/roles/${r.key}/permissions`, { method: 'PUT', json: { permissionKeys: perms(r) } }); setRoles((rs) => rs.map((x) => (x.key === r.key ? { ...x, permissions: perms(r) } : x))); setDirty((d) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== r.key))); setSaved(`${r.nameEn} saved.`); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed'); }
  };
  const editable = can('roles.write');
  const groups = Object.keys(catalogue).reduce<Record<string, string[]>>((a, k) => { const g = k.split('.')[0]; (a[g] ??= []).push(k); return a; }, {});

  return (
    <>
      <PageHeader title="Roles & permissions" crumbs={[{ label: 'Roles' }]} description="Granular permissions per role. Changes take effect at the user’s next token refresh (≤15 minutes) and are audited. Super Admin is fixed." />
      <ErrorNote message={error} />
      {saved && <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-success">{saved}</p>}
      <div className="overflow-x-auto rounded-[1.5rem] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-cream-200/60">
            <tr><th className="px-3 py-2 text-left">Permission</th>{roles.map((r) => <th key={r.key} className="px-2 py-2 text-center font-semibold"><span className="block">{r.nameEn}</span><span className="font-normal text-muted">{r.userCount} users</span></th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {Object.entries(groups).map(([g, keys]) => (
              <Fragment key={g}>
                <tr className="bg-[#fbfbfd]"><td colSpan={roles.length + 1} className="px-3 py-1.5 font-semibold uppercase tracking-wide text-muted">{g}</td></tr>
                {keys.map((p) => (
                  <tr key={p}>
                    <td className="px-3 py-1.5"><code>{p}</code><span className="block text-muted">{catalogue[p]}</span></td>
                    {roles.map((r) => <td key={r.key} className="text-center"><input type="checkbox" aria-label={`${r.nameEn}: ${p}`} checked={perms(r).includes(p)} disabled={!editable || r.key === 'SUPER_ADMIN'} onChange={() => toggle(r, p)} /></td>)}
                  </tr>
                ))}
              </Fragment>
            ))}
            {editable && <tr><td />{roles.map((r) => <td key={r.key} className="py-2 text-center">{dirty[r.key] && <button onClick={() => void save(r)} className={`${adminBtn} h-7 px-2 text-xs`}>Save</button>}</td>)}</tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
