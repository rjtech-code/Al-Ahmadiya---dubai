'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { adminBtn, adminBtnOutline, adminInput, ErrorNote, PageHeader, Table } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

type College = { id: string; nameEn: string; nameAr: string };
type Department = { id: string; slug: string; nameEn: string; nameAr: string; collegeName: string; staffCount: number; courseCount: number; programCount: number };

export default function DepartmentsPage() {
  const { user } = useAdmin();
  const [colleges, setColleges] = useState<College[]>([]);
  const [rows, setRows] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ nameEn: '', nameAr: '', slug: '', collegeId: '', overviewEn: '', overviewAr: '' });
  const isSuperAdmin = user.roles.includes('SUPER_ADMIN');

  async function load() {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([
        apiFetch<{ data: College[] }>('/admin/departments/colleges'),
        apiFetch<{ data: Department[] }>('/admin/departments'),
      ]);
      setColleges(c.data); setRows(d.data);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not load departments.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (isSuperAdmin) void load(); }, [isSuperAdmin]);

  function updateName(value: string) {
    const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setForm((f) => ({ ...f, nameEn: value, slug }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      await apiFetch('/admin/departments', { method: 'POST', json: form });
      setSuccess('Department created successfully. It is now available in Staff & Users.');
      setForm({ nameEn: '', nameAr: '', slug: '', collegeId: '', overviewEn: '', overviewAr: '' });
      await load();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not create department.'); }
  }

  if (!isSuperAdmin) return <><PageHeader title="Departments" /><ErrorNote message="Only Super Admin can create and manage departments." /></>;
  return <>
    <PageHeader title="Department Management" crumbs={[{ label: 'Departments' }]} />
    <p className="mb-5 text-sm text-muted">Create academic departments under an existing college. Newly created departments will appear in the staff assignment dropdown.</p>
    <ErrorNote message={error} />
    {success && <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>}
    <form onSubmit={submit} className="mb-7 grid gap-3 rounded-xl border border-line bg-white p-5 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">Add new department</h2>
      <label className="text-xs font-semibold">Department name (English)<input required minLength={2} className={adminInput + ' mt-1'} value={form.nameEn} onChange={(e) => updateName(e.target.value)} placeholder="Business Administration" /></label>
      <label className="text-xs font-semibold">Department name (Arabic)<input required minLength={2} dir="rtl" className={adminInput + ' mt-1'} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="إدارة الأعمال" /></label>
      <label className="text-xs font-semibold">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className={adminInput + ' mt-1'} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} /></label>
      <label className="text-xs font-semibold">College<select required className={adminInput + ' mt-1'} value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value })}><option value="">Select college</option>{colleges.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}</select></label>
      <label className="text-xs font-semibold">Overview (English)<textarea className={adminInput + ' mt-1 min-h-20'} value={form.overviewEn} onChange={(e) => setForm({ ...form, overviewEn: e.target.value })} /></label>
      <label className="text-xs font-semibold">Overview (Arabic)<textarea dir="rtl" className={adminInput + ' mt-1 min-h-20'} value={form.overviewAr} onChange={(e) => setForm({ ...form, overviewAr: e.target.value })} /></label>
      {colleges.length === 0 && <p className="text-sm text-amber-700 sm:col-span-2">No colleges found. Create a college first in the academic catalogue before adding a department.</p>}
      <div className="flex gap-2 sm:col-span-2"><button className={adminBtn} disabled={!colleges.length}>Create department</button><button type="button" className={adminBtnOutline} onClick={() => setForm({ nameEn: '', nameAr: '', slug: '', collegeId: '', overviewEn: '', overviewAr: '' })}>Clear</button></div>
    </form>
    <h2 className="mb-3 font-semibold">Existing departments</h2>
    {loading ? <p className="text-sm text-muted">Loading departments…</p> : <Table head={['Department', 'College', 'Staff', 'Courses', 'Programmes']} empty={!rows.length}>{rows.map((d) => <tr key={d.id}><td className="px-4 py-3"><strong>{d.nameEn}</strong><div className="text-xs text-muted">{d.slug} · {d.nameAr}</div></td><td className="px-4 py-3">{d.collegeName}</td><td className="px-4 py-3">{d.staffCount}</td><td className="px-4 py-3">{d.courseCount}</td><td className="px-4 py-3">{d.programCount}</td></tr>)}</Table>}
  </>;
}
