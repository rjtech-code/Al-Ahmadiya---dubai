'use client';

import { AlertTriangle, BarChart3, BookOpen, ClipboardCheck, GraduationCap, UserCog, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { BarChart, DashPanel, IconStat, QuickActions, WelcomeBanner } from '@/components/admin/dash';
import { adminInput, ErrorNote, Table } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface D {
  department: { id: string; nameEn: string; college: { nameEn: string } };
  totals: { faculty: number; students: number; courses: number; avgMarks: number | null };
  workload: { id: string; name: string; courses: string[]; students: number; weeklyHours: number }[];
  perCourse: { code: string; students: number; avgMarks: number | null }[];
  atRisk: { id: string; name: string; email: string; reasons: string[] }[]; atRiskCount: number;
  conflicts: { teacher: string; day: number; a: string; b: string; time: string }[];
  unassigned: { id: string; code: string; titleEn: string }[];
}
const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DepartmentOverview() {
  const { can } = useAdmin();
  const [depts, setDepts] = useState<{ id: string; nameEn: string }[] | null>(null);
  const [id, setId] = useState('');
  const [d, setD] = useState<D | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiFetch<{ data: { id: string; nameEn: string }[]; meta: { own: string | null } }>('/admin/overview/departments')
      .then((r) => { setDepts(r.data); setId(r.meta.own && r.data.some((x) => x.id === r.meta.own) ? r.meta.own : r.data[0]?.id ?? ''); })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to load'));
  }, []);
  useEffect(() => {
    if (!id) return;
    let x = false;
    apiFetch<{ data: D }>(`/admin/overview/departments/${id}`).then((r) => { if (!x) setD(r.data); }).catch((e: unknown) => { if (!x) setError(e instanceof ApiError ? e.message : 'Failed to load'); });
    return () => { x = true; };
  }, [id]);

  if (depts && !depts.length) return <p className="rounded-2xl bg-amber-50 p-4 text-sm text-warning">You are not assigned to a department yet. Ask an administrator to set your department in Staff &amp; users.</p>;
  const scored = d?.perCourse.filter((c) => c.avgMarks !== null) ?? [];
  return (
    <>
      <WelcomeBanner title={d ? `${d.department.nameEn} Department` : 'Department'} subtitle={d ? `${d.department.college.nameEn} · department overview` : 'Department overview'} image="/images/campus/research.jpg" />
      {depts && depts.length > 1 && (
        <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand-900">Department
          <select className={`${adminInput} max-w-xs`} value={id} onChange={(e) => { setD(null); setId(e.target.value); }}>{depts.map((x) => <option key={x.id} value={x.id}>{x.nameEn}</option>)}</select>
        </label>
      )}
      <ErrorNote message={error} />
      {!d ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <IconStat icon={Users} label="Faculty" value={d.totals.faculty} />
            <IconStat icon={GraduationCap} label="Students" value={d.totals.students} />
            <IconStat icon={BookOpen} label="Courses" value={d.totals.courses} hint={d.unassigned.length ? `${d.unassigned.length} without a teacher` : undefined} />
            <IconStat icon={BarChart3} label="Average result" value={d.totals.avgMarks === null ? '—' : `${d.totals.avgMarks}%`} hint={d.totals.avgMarks === null ? 'No results published yet' : 'Published final marks'} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <DashPanel title="Faculty workload & course allocation">
              {d.workload.length ? (
                <Table head={['Teacher', 'Courses', 'Students', 'Live hours / week']}>
                  {d.workload.map((w) => <tr key={w.id}><td className="px-4 py-2 font-semibold text-brand-900">{w.name}</td><td className="px-4 py-2 text-xs">{w.courses.join(', ') || '—'}</td><td className="px-4 py-2">{w.students}</td><td className="px-4 py-2">{w.weeklyHours}</td></tr>)}
                </Table>
              ) : <p className="text-sm text-muted">No teachers assigned to this department&apos;s courses yet.</p>}
              {d.unassigned.length > 0 && <p className="mt-3 text-xs text-warning">Without a teacher: {d.unassigned.map((c) => <Link key={c.id} href={`/admin/courses/${c.id}`} className="me-2 font-semibold underline">{c.code}</Link>)}</p>}
            </DashPanel>
            <DashPanel title="At-risk students" action={<span className="text-xs text-muted">Attendance &lt; 75% or failing grade</span>}>
              <p className="flex items-baseline gap-2"><span className="font-[family-name:var(--font-cormorant)] text-5xl font-semibold text-danger">{d.atRiskCount}</span>{d.atRiskCount > 0 && <span className="flex items-center gap-1 text-sm font-semibold text-danger"><AlertTriangle className="size-4" />need attention</span>}</p>
              {d.atRisk.length ? <ul className="mt-3 space-y-2 text-sm">{d.atRisk.slice(0, 6).map((s) => <li key={s.id}><span className="font-semibold text-brand-900">{s.name}</span><span className="block text-xs text-muted">{s.reasons.join(' · ')}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted">No student is at risk right now.</p>}
            </DashPanel>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <DashPanel title="Average final mark by course">
              {scored.length ? <BarChart label="Average published final mark by course (%)" data={scored.map((c) => ({ x: c.code, y: c.avgMarks ?? 0 }))} format={(v) => `${v}%`} /> : <p className="text-sm text-muted">Averages appear once teachers publish final results.</p>}
            </DashPanel>
            <DashPanel title="Timetable conflicts">
              {d.conflicts.length ? (
                <ul className="space-y-2 text-sm">{d.conflicts.map((c, i) => <li key={i} className="flex items-start gap-2"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-danger" /><span><strong className="text-brand-900">{c.a}</strong> and <strong className="text-brand-900">{c.b}</strong> overlap on {DAYS[c.day]} at {c.time}<span className="block text-xs text-muted">Both taught by {c.teacher}</span></span></li>)}</ul>
              ) : <p className="text-sm text-muted">No clashes in the weekly timetable.</p>}
            </DashPanel>
          </div>

          <DashPanel title="Quick actions">
            <QuickActions items={[
              ...(can('lms.manage') ? [{ href: '/admin/courses', label: 'Assign teachers', icon: UserCog }] : []),
              { href: '/admin/teach', label: 'Review results', icon: ClipboardCheck },
              ...(can('academics.manage') ? [{ href: '/admin/academics', label: 'Programmes', icon: BookOpen }] : []),
            ]} />
          </DashPanel>
        </div>
      )}
    </>
  );
}
