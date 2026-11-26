'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NAV } from '@/components/admin/AdminShell';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { BookOpen, CalendarClock, CalendarDays, FileText, GraduationCap, LayoutGrid, Library, Shield, Users } from 'lucide-react';
import { BarChart, DashPanel, IconStat, monthLabel, QuickActions, ViewAll, WelcomeBanner } from '@/components/admin/dash';
import { ErrorNote } from '@/components/admin/ui';
import { apiFetch, ApiError, formatMoney } from '@/lib/client-api';
import { USE_BACKEND } from '@/lib/demo-session';

interface Summary {
  admissions: { byStatus: Record<string, number>; submittedLast30Days: number; pendingReview: number };
  users: { total: number; staff: number };
  content: { colleges: number; programs: number; news: number; events: number; faculty: number };
  engagement: { unhandledMessages: number; subscribers: number };
  settingsAwaitingConfirmation: number;
  learning: { onlineCourses: number; activeEnrollments: number; liveNow: number };
  payments: { count: number; amountFils: number };
  overview: { students: number; faculty: number; programs: number; applications: number; enrollmentTrend: { month: string; count: number }[]; operations: { pendingRegistrations: number; classesThisWeek: number; draftCourses: number; coursesWithoutTeacher: number } };
  recentStaffLogins: { id: string; email: string; success: boolean; reason: string | null; ip: string | null; createdAt: string; user: { fullName: string } | null }[];
}

const DEMO_SUMMARY: Summary = {
  admissions: { byStatus: { SUBMITTED: 18, UNDER_REVIEW: 12, APPROVED: 24, REJECTED: 4 }, submittedLast30Days: 18, pendingReview: 12 },
  users: { total: 386, staff: 42 },
  content: { colleges: 3, programs: 9, news: 8, events: 8, faculty: 24 },
  engagement: { unhandledMessages: 3, subscribers: 120 },
  settingsAwaitingConfirmation: 1,
  learning: { onlineCourses: 46, activeEnrollments: 2160, liveNow: 2 },
  payments: { count: 148, amountFils: 125000000 },
  overview: {
    students: 344, faculty: 24, programs: 9, applications: 345,
    enrollmentTrend: [
      { month: '2026-06', count: 28 }, { month: '2026-07', count: 34 },
      { month: '2026-08', count: 41 }, { month: '2026-09', count: 36 },
      { month: '2026-10', count: 52 }, { month: '2026-11', count: 47 },
    ],
    operations: { pendingRegistrations: 16, classesThisWeek: 28, draftCourses: 5, coursesWithoutTeacher: 2 },
  },
  recentStaffLogins: [],
};

const ROLE_TITLES: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrator',
  UNIVERSITY_ADMIN: 'University Administrator',
  ADMISSIONS_OFFICER: 'Admissions Officer',
  ADMISSIONS_REVIEWER: 'Admissions Reviewer',
  REGISTRAR: 'Registrar',
  LIBRARIAN: 'Librarian',
  PROCUREMENT_OFFICER: 'Procurement & Operations',
  ACADEMIC_ADMIN: 'Academic Administrator',
  FINANCE_MANAGER: 'Finance Manager',
  FINANCE_OFFICER: 'Finance Officer',
  HR_MANAGER: 'HR Manager',
  HEAD_OF_DEPARTMENT: 'Head of Department',
  CONTENT_EDITOR: 'Content Editor',
  FACULTY: 'Teacher',
};

export default function Dashboard() {
  const { can, user } = useAdmin();
  const router = useRouter();
  // Each role starts on its own work page (teacher → My teaching, finance → Finance, …).
  const home = NAV.find((n) => n.href !== '/admin' && n.show(can))?.href;
  useEffect(() => { if (!can('dashboard.read') && home) router.replace(home); }, [can, home, router]);
  const [d, setD] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!can('dashboard.read')) return;
    let c = false;
    apiFetch<{ data: Summary }>('/admin/dashboard').then((r) => { if (!c) setD(r.data); }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed to load'); });
    return () => { c = true; };
  }, [can]);

  if (!can('dashboard.read')) return <p className="text-sm text-muted">Opening your workspace…</p>;
  const o = d?.overview;\n  const roleTitle = ROLE_TITLES[user.roles[0]] ?? user.roles[0]?.replace(/_/g, ' ') ?? 'Staff';
  const alerts = d ? [
    d.admissions.pendingReview > 0 && { text: `${d.admissions.pendingReview} application${d.admissions.pendingReview === 1 ? '' : 's'} waiting for review`, href: '/admin/admissions', tone: 'bg-warning' },
    d.learning.liveNow > 0 && { text: `${d.learning.liveNow} live class${d.learning.liveNow === 1 ? '' : 'es'} in progress`, href: '/admin/live', tone: 'bg-danger' },
    d.engagement.unhandledMessages > 0 && { text: `${d.engagement.unhandledMessages} unanswered contact message${d.engagement.unhandledMessages === 1 ? '' : 's'}`, href: '/admin/messages', tone: 'bg-brand-700' },
    d.settingsAwaitingConfirmation > 0 && { text: `${d.settingsAwaitingConfirmation} site settings awaiting confirmation`, href: '/admin/settings', tone: 'bg-gold-500' },
    (o?.operations.coursesWithoutTeacher ?? 0) > 0 && { text: `${o!.operations.coursesWithoutTeacher} published course${o!.operations.coursesWithoutTeacher === 1 ? ' has' : 's have'} no teacher`, href: '/admin/courses', tone: 'bg-warning' },
  ].filter(Boolean) as { text: string; href: string; tone: string }[] : [];
  return (
    <>
      <WelcomeBanner title={`Welcome, ${roleTitle}`} subtitle={USE_BACKEND ? "University operations overview — live figures from the database." : "Demo dashboard overview — sample figures for preview only."} />
      <ErrorNote message={error} />
      {!d || !o ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <IconStat icon={Users} label="Active students" value={o.students} hint={`${d.users.total} accounts in total`} href="/admin/users" />
            <IconStat icon={GraduationCap} label="Teachers" value={o.faculty} href="/admin/users" />
            <IconStat icon={LayoutGrid} label="Published programmes" value={o.programs} href="/admin/academics" />
            <IconStat icon={FileText} label="Applications" value={o.applications} hint={`${d.admissions.submittedLast30Days} in the last 30 days`} href="/admin/admissions" />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <DashPanel title="New enrolments per month" action={<span className="text-xs text-muted">Last 6 months</span>}>
              <BarChart label="New course enrolments per month" data={o.enrollmentTrend.map((m) => ({ x: monthLabel(m.month), y: m.count }))} />
              <p className="mt-2 text-xs text-muted">{d.learning.activeEnrollments} active enrolments across {d.learning.onlineCourses} online courses · {formatMoney(d.payments.amountFils)} collected</p>
            </DashPanel>
            <DashPanel title="Alerts" action={<span className="text-xs text-muted">{alerts.length} open</span>}>
              {alerts.length ? <ul className="space-y-3">{alerts.map((a) => <li key={a.text}><Link href={a.href} className="flex items-start gap-3 text-sm hover:text-brand-700"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${a.tone}`} />{a.text}</Link></li>)}</ul> : <p className="text-sm text-muted">Nothing needs attention right now.</p>}
            </DashPanel>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <DashPanel title="Academic operations">
              <ul className="divide-y divide-line text-sm">
                {[
                  ['Course registrations awaiting payment', o.operations.pendingRegistrations, '/admin/finance'],
                  ['Applications pending review', d.admissions.pendingReview, '/admin/admissions'],
                  ['Live classes in the next 7 days', o.operations.classesThisWeek, '/admin/live'],
                  ['Draft online courses', o.operations.draftCourses, '/admin/courses'],
                ].map(([label, n, href]) => <li key={label as string}><Link href={href as string} className="flex justify-between py-2.5 hover:text-brand-700"><span>{label}</span><strong className="text-brand-900">{n}</strong></Link></li>)}
              </ul>
            </DashPanel>
            <DashPanel title="Quick actions">
              <QuickActions items={[
                { href: '/admin/users', label: 'Manage staff & students', icon: Users },
                { href: '/admin/courses/new', label: 'New course', icon: BookOpen },
                { href: '/admin/academics', label: 'Programmes', icon: Library },
                { href: '/admin/live', label: 'Timetable & live', icon: CalendarDays },
                { href: '/admin/cms/events', label: 'Events calendar', icon: CalendarClock },
                { href: '/admin/roles', label: 'Roles', icon: Shield },
              ]} />
            </DashPanel>
          </div>
          <DashPanel title="Recent staff sign-ins" action={can('security.read') && <ViewAll href="/admin/staff-logins" label="Staff login history" />}>
            <ul className="divide-y divide-line text-sm">
              {d.recentStaffLogins.length === 0 && <li className="py-2 text-muted">No staff sign-ins recorded yet.</li>}
              {d.recentStaffLogins.slice(0, 6).map((l) => <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{l.user?.fullName ?? l.email} {l.success ? <span className="text-success">signed in</span> : <span className="text-danger">failed ({l.reason?.replace(/_/g, ' ').toLowerCase()})</span>}</span><span className="text-xs text-muted">{new Date(l.createdAt).toLocaleString('en-GB')} · {l.ip}</span></li>)}
            </ul>
          </DashPanel>
        </div>
      )}
    </>
  );
}
