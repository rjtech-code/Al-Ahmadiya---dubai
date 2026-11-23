'use client';

import { Check, Pencil, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { adminBtn, adminBtnOutline, ErrorNote, PageHeader } from '@/components/admin/ui';
import { cn } from '@/components/ui/cn';
import { apiFetch, ApiError } from '@/lib/client-api';

interface Role { key: string; nameEn: string; userCount: number; permissions: string[] }

/** Plain-language abilities. Each one switches on the technical permissions it needs. */
const ABILITIES: { label: string; detail: string; perms: string[] }[] = [
  { label: 'See the overview dashboard', detail: 'Figures for the whole institution', perms: ['dashboard.read'] },
  { label: 'Teach', detail: 'Own courses, students’ progress and live classes', perms: ['teach.own', 'live.host'] },
  { label: 'Build online courses', detail: 'Create courses, lectures, notes, quizzes and timetables for any teacher', perms: ['lms.manage'] },
  { label: 'Manage programmes', detail: 'Degree programmes and entry requirements', perms: ['academics.manage'] },
  { label: 'View applications', detail: 'See admission applications', perms: ['admissions.read'] },
  { label: 'Review applications', detail: 'Check documents and ask for corrections', perms: ['admissions.review'] },
  { label: 'Accept or reject applications', detail: 'Make the final admission decision', perms: ['admissions.decide'] },
  { label: 'Finance', detail: 'Payments, fees due and receipts', perms: ['payments.read'] },
  { label: 'Edit website content', detail: 'News, events, pages and other content (as drafts)', perms: ['cms.read', 'cms.write'] },
  { label: 'Publish website content', detail: 'Make content visible on the website', perms: ['cms.publish'] },
  { label: 'Change site settings', detail: 'Contact details, admissions status, fees', perms: ['settings.write'] },
  { label: 'Read messages', detail: 'Contact-form messages and newsletter list', perms: ['engagement.read'] },
  { label: 'View staff accounts', detail: 'See who has an account', perms: ['users.read'] },
  { label: 'Manage staff accounts', detail: 'Add staff, give roles, deactivate accounts', perms: ['users.write'] },
  { label: 'Change roles', detail: 'Edit what each role can do (this page)', perms: ['roles.read', 'roles.write'] },
  { label: 'Security records', detail: 'Staff sign-in history and action trail', perms: ['security.read', 'audit.read'] },
];
const has = (perms: string[], a: (typeof ABILITIES)[number]) => a.perms.every((p) => perms.includes(p));

export default function RolesPage() {
  const { can } = useAdmin();
  const [roles, setRoles] = useState<Role[]>([]);
  const [editing, setEditing] = useState<{ key: string; perms: string[] } | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  useEffect(() => {
    let c = false;
    apiFetch<{ data: Role[] }>('/admin/roles').then((r) => { if (!c) setRoles(r.data); }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed to load'); });
    return () => { c = true; };
  }, []);
  const editable = can('roles.write');

  const toggle = (a: (typeof ABILITIES)[number]) => setEditing((e) => e && ({
    ...e, perms: has(e.perms, a) ? e.perms.filter((p) => !a.perms.includes(p)) : [...new Set([...e.perms, ...a.perms])],
  }));
  const save = async () => {
    if (!editing) return;
    setError(''); setSaved('');
    try {
      await apiFetch(`/admin/roles/${editing.key}/permissions`, { method: 'PUT', json: { permissionKeys: editing.perms } });
      setRoles((rs) => rs.map((r) => (r.key === editing.key ? { ...r, permissions: editing.perms } : r)));
      setSaved(`${roles.find((r) => r.key === editing.key)?.nameEn} updated.`); setEditing(null);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to save'); }
  };

  return (
    <>
      <PageHeader title="Roles" description="A role decides what a staff member can do. Give people a role in Staff & users; change what a role can do here." />
      <ErrorNote message={error} />
      {saved && <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success">{saved}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => {
          const isEditing = editing?.key === r.key;
          const perms = isEditing ? editing.perms : r.permissions;
          const abilities = ABILITIES.filter((a) => has(perms, a));
          const locked = r.key === 'SUPER_ADMIN';
          return (
            <article key={r.key} className={cn('flex flex-col rounded-[1.5rem] border bg-cream-50 p-5 shadow-[var(--shadow-card)]', isEditing ? 'border-brand-700 md:col-span-2 xl:col-span-3' : 'border-white/80')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-brand-900">{r.nameEn}</h2>
                  <Link href="/admin/users" className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand-900"><Users className="size-3.5" />{r.userCount} {r.userCount === 1 ? 'person' : 'people'}</Link>
                </div>
                {editable && !locked && !isEditing && <button onClick={() => setEditing({ key: r.key, perms: r.permissions })} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-cream-200"><Pencil className="size-3.5" />Change</button>}
              </div>

              {!isEditing ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {locked ? <li className="text-brand-900">Can do everything</li>
                    : abilities.length ? abilities.map((a) => <li key={a.label} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{a.label}</li>)
                      : <li className="text-muted">{r.key === 'STUDENT' || r.key === 'APPLICANT' ? 'Website account only (no staff access)' : 'Nothing yet'}</li>}
                </ul>
              ) : (
                <>
                  <p className="mt-3 text-sm text-muted">Tick what people with this role can do:</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {ABILITIES.map((a) => (
                      <label key={a.label} className={cn('flex cursor-pointer gap-3 rounded-2xl border p-3 text-sm', has(perms, a) ? 'border-brand-700 bg-brand-50' : 'border-line bg-white')}>
                        <input type="checkbox" className="mt-0.5 size-4" checked={has(perms, a)} onChange={() => toggle(a)} />
                        <span><span className="block font-semibold text-brand-900">{a.label}</span><span className="text-xs text-muted">{a.detail}</span></span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2"><button onClick={() => void save()} className={adminBtn}>Save</button><button onClick={() => setEditing(null)} className={adminBtnOutline}>Cancel</button></div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
