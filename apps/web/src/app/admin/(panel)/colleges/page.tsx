'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { adminBtn, adminBtnOutline, adminInput, ErrorNote, PageHeader, Table } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

type College = {
  id: string; slug: string; nameEn: string; nameAr: string;
  summaryEn: string | null; summaryAr: string | null;
  overviewEn: string | null; overviewAr: string | null;
  publishStatus: string; departmentCount: number;
};

const emptyForm = { nameEn: '', nameAr: '', slug: '', summaryEn: '', summaryAr: '', overviewEn: '', overviewAr: '' };

export default function CollegesPage() {
  const { user } = useAdmin();
  const [rows, setRows] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(emptyForm);
  const isSuperAdmin = user.roles.includes('SUPER_ADMIN');

  async function load() {
    setLoading(true);
    try {
      const result = await apiFetch<{ data: College[] }>('/admin/colleges');
      setRows(result.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load colleges.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (isSuperAdmin) void load(); }, [isSuperAdmin]);

  function updateName(value: string) {
    const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setForm((current) => ({ ...current, nameEn: value, slug }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await apiFetch('/admin/colleges', { method: 'POST', json: form });
      setSuccess('College created successfully. You can now add departments under this college.');
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create college.');
    } finally {
      setSaving(false);
    }
  }

  if (!isSuperAdmin) return <><PageHeader title="Colleges" /><ErrorNote message="Only Super Admin can create and manage colleges." /></>;

  return <>
    <PageHeader title="College Management" crumbs={[{ label: 'Colleges' }]} />
    <p className="mb-5 text-sm text-muted">Create the parent academic college first. You can then add its departments from the Departments page.</p>
    <ErrorNote message={error} />
    {success && <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>}

    <form onSubmit={submit} className="mb-7 grid gap-3 rounded-xl border border-line bg-white p-5 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">Add new college</h2>
      <label className="text-xs font-semibold">College name (English)
        <input required minLength={2} className={adminInput + ' mt-1'} value={form.nameEn} onChange={(e) => updateName(e.target.value)} placeholder="College of Business Administration" />
      </label>
      <label className="text-xs font-semibold">College name (Arabic)
        <input required minLength={2} dir="rtl" className={adminInput + ' mt-1'} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="كلية إدارة الأعمال" />
      </label>
      <label className="text-xs font-semibold">Slug
        <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className={adminInput + ' mt-1'} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} placeholder="college-of-business" />
      </label>
      <label className="text-xs font-semibold">Short summary (English)
        <input className={adminInput + ' mt-1'} maxLength={500} value={form.summaryEn} onChange={(e) => setForm({ ...form, summaryEn: e.target.value })} />
      </label>
      <label className="text-xs font-semibold">Short summary (Arabic)
        <input dir="rtl" className={adminInput + ' mt-1'} maxLength={500} value={form.summaryAr} onChange={(e) => setForm({ ...form, summaryAr: e.target.value })} />
      </label>
      <div className="hidden sm:block" />
      <label className="text-xs font-semibold">Overview (English)
        <textarea className={adminInput + ' mt-1 min-h-24'} maxLength={2000} value={form.overviewEn} onChange={(e) => setForm({ ...form, overviewEn: e.target.value })} />
      </label>
      <label className="text-xs font-semibold">Overview (Arabic)
        <textarea dir="rtl" className={adminInput + ' mt-1 min-h-24'} maxLength={2000} value={form.overviewAr} onChange={(e) => setForm({ ...form, overviewAr: e.target.value })} />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button className={adminBtn} disabled={saving}>{saving ? 'Creating…' : 'Create college'}</button>
        <button type="button" className={adminBtnOutline} onClick={() => setForm(emptyForm)}>Clear</button>
      </div>
    </form>

    <h2 className="mb-3 font-semibold">Existing colleges</h2>
    {loading ? <p className="text-sm text-muted">Loading colleges…</p> : <Table head={['College', 'Departments', 'Status']} empty={!rows.length}>
      {rows.map((college) => <tr key={college.id}>
        <td className="px-4 py-3"><strong>{college.nameEn}</strong><div className="text-xs text-muted">{college.slug} · {college.nameAr}</div></td>
        <td className="px-4 py-3">{college.departmentCount}</td>
        <td className="px-4 py-3">{college.publishStatus}</td>
      </tr>)}
    </Table>}
  </>;
}
