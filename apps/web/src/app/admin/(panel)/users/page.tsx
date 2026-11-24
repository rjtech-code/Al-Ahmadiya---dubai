'use client';

import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { adminBtn, adminBtnOutline, adminInput, ErrorNote, PageHeader, Pager, StatusPill, Table } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface U { id: string; email: string; fullName: string; isActive: boolean; lastLoginAt: string | null; departmentId: string | null; department: { nameEn: string } | null; roles: { role: { key: string; nameEn: string } }[] }
interface Role { key: string; nameEn: string }

export default function UsersPage() {
  const { can, user: me } = useAdmin();
  const [rows, setRows] = useState<U[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<U | 'new' | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', isActive: true, roleKeys: [] as string[], departmentId: '' });
  const [depts, setDepts] = useState<{ id: string; nameEn: string }[]>([]);
  useEffect(() => { apiFetch<{ data: { id: string; nameEn: string }[] }>('/admin/users-departments').then((r) => setDepts(r.data)).catch(() => undefined); }, []);

  const fetchRows = useCallback(() => apiFetch<{ data: U[]; meta: { page: number; totalPages: number } }>(`/admin/users?page=${page}&pageSize=20${q ? `&q=${encodeURIComponent(q)}` : ''}`), [page, q]);
  useEffect(() => {
    let c = false;
    fetchRows().then((r) => { if (!c) { setRows(r.data); setMeta(r.meta); } }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed'); });
    if (can('roles.read')) apiFetch<{ data: Role[] }>('/admin/roles').then((r) => { if (!c) setRoles(r.data); }).catch(() => undefined);
    return () => { c = true; };
  }, [fetchRows, reload, can]);

  const startEdit = (u: U | 'new') => {
    setError('');
    setForm(u === 'new' ? { fullName: '', email: '', password: '', isActive: true, roleKeys: [], departmentId: '' } : { fullName: u.fullName, email: u.email, password: '', isActive: u.isActive, roleKeys: u.roles.map((r) => r.role.key), departmentId: u.departmentId ?? '' });
    setEdit(u);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    try {
      if (edit === 'new') await apiFetch('/admin/users', { method: 'POST', json: { fullName: form.fullName, email: form.email, password: form.password, roleKeys: form.roleKeys, departmentId: form.departmentId || null } });
      else if (edit) await apiFetch(`/admin/users/${edit.id}`, { method: 'PUT', json: { fullName: form.fullName, isActive: form.isActive, roleKeys: form.roleKeys, departmentId: form.departmentId || null } });
      setEdit(null); setReload((n) => n + 1);
    } catch (err) {
      const d = err instanceof ApiError && Array.isArray(err.body.details) ? ` (${(err.body.details as { path: string; message: string }[]).map((x) => `${x.path}: ${x.message}`).join('; ')})` : '';
      setError(err instanceof ApiError ? err.message + d : 'Failed');
    }
  };
  const canWrite = can('users.write') && can('roles.write');

  return (
    <>
      <PageHeader title="Users" crumbs={[{ label: 'Users' }]} actions={canWrite && <button onClick={() => startEdit('new')} className={adminBtn}><Plus className="size-4" />New staff user</button>} />
      <ErrorNote message={error} />
      {edit && (
        <form onSubmit={save} className="mb-5 grid gap-3 rounded-lg border border-line bg-white p-4 sm:grid-cols-2">
          <label className="text-xs font-semibold">Full name<input required className={`${adminInput} mt-1`} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
          <label className="text-xs font-semibold">Email<input required type="email" disabled={edit !== 'new'} className={`${adminInput} mt-1`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          {edit === 'new' ? <label className="text-xs font-semibold">Initial password<input required type="password" minLength={10} className={`${adminInput} mt-1`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><span className="font-normal text-muted">10+ chars, upper, lower, number</span></label>
            : <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.isActive} disabled={edit.id === me.id} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Active</label>}
          <fieldset className="sm:col-span-2"><legend className="mb-1 text-xs font-semibold">Roles</legend>
            <label className="block text-xs font-semibold">Department (for Heads of Department and teaching staff)<select className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 text-sm" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><option value="">None</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}</select></label>
            <div className="flex flex-wrap gap-2">{roles.map((r) => <label key={r.key} className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-xs"><input type="checkbox" checked={form.roleKeys.includes(r.key)} onChange={(e) => setForm({ ...form, roleKeys: e.target.checked ? [...form.roleKeys, r.key] : form.roleKeys.filter((k) => k !== r.key) })} />{r.nameEn}</label>)}</div>
          </fieldset>
          <div className="flex gap-2 sm:col-span-2"><button className={adminBtn}>Save</button><button type="button" onClick={() => setEdit(null)} className={adminBtnOutline}>Cancel</button></div>
        </form>
      )}
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setReload((n) => n + 1); }} className="mb-3 flex gap-2"><input aria-label="Search users" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} className={`${adminInput} max-w-sm`} /><button className={adminBtnOutline}>Search</button></form>
      <Table head={['Name', 'Email', 'Roles', 'Status', 'Last login', '']} empty={!rows.length}>
        {rows.map((u) => (
          <tr key={u.id}>
            <td className="px-4 py-2.5 font-medium">{u.fullName}</td>
            <td className="px-4 py-2.5">{u.email}</td>
            <td className="px-4 py-2.5 text-xs">{u.roles.map((r) => r.role.nameEn).join(', ')}</td>
            <td className="px-4 py-2.5"><StatusPill status={u.isActive ? 'ACTIVE' : 'DISABLED'} /></td>
            <td className="px-4 py-2.5 text-xs text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-GB') : '—'}</td>
            <td className="px-4 py-2.5">{canWrite && <button onClick={() => startEdit(u)} className="text-xs font-semibold text-brand-700 hover:underline">Edit</button>}</td>
          </tr>
        ))}
      </Table>
      <Pager page={meta.page} totalPages={meta.totalPages} onPage={setPage} />
    </>
  );
}
