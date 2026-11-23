'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NAV } from '@/components/admin/AdminShell';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { ErrorNote, PageHeader, Panel, StatCard } from '@/components/admin/ui';
import { apiFetch, ApiError, formatMoney } from '@/lib/client-api';

interface Summary {
  admissions: { byStatus: Record<string, number>; submittedLast30Days: number; pendingReview: number };
  users: { total: number; staff: number };
  content: { colleges: number; programs: number; news: number; events: number; faculty: number };
  engagement: { unhandledMessages: number; subscribers: number };
  settingsAwaitingConfirmation: number;
  learning: { onlineCourses: number; activeEnrollments: number; liveNow: number };
  payments: { count: number; amountFils: number };
  recentStaffLogins: { id: string; email: string; success: boolean; reason: string | null; ip: string | null; createdAt: string; user: { fullName: string } | null }[];
}

export default function Dashboard() {
  const { can } = useAdmin();
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
  return (
    <>
      <PageHeader title="Dashboard" description="All figures are live counts from the database." />
      <ErrorNote message={error} />
      {!d ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-6">
          {d.settingsAwaitingConfirmation > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning">
              <span><strong>{d.settingsAwaitingConfirmation}</strong> institutional settings are awaiting client confirmation and are hidden or shown as “To be announced” on the website.</span>
              <Link href="/admin/settings" className="font-semibold underline">Review settings</Link>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Applications pending review" value={d.admissions.pendingReview} />
            <StatCard label="Submitted (last 30 days)" value={d.admissions.submittedLast30Days} />
            <StatCard label="Active course students" value={d.learning.activeEnrollments} hint={`${d.learning.onlineCourses} online courses`} />
            <StatCard label="Payments received" value={formatMoney(d.payments.amountFils)} hint={`${d.payments.count} payments`} />
          </div>
          {d.learning.liveNow > 0 && <p className="rounded-[1.5rem] bg-red-50 px-4 py-3 text-sm font-semibold text-danger">● {d.learning.liveNow} live class{d.learning.liveNow > 1 ? 'es' : ''} in progress — <Link href="/admin/live" className="underline">open live classes</Link></p>}
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Applications by status">
              {Object.keys(d.admissions.byStatus).length ? (
                <ul className="space-y-2 text-sm">{Object.entries(d.admissions.byStatus).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k.replace(/_/g, ' ')}</span><strong>{v}</strong></li>)}</ul>
              ) : <p className="text-sm text-muted">No applications yet. Admissions are closed until confirmed.</p>}
            </Panel>
            <Panel title="Published content">
              <ul className="space-y-2 text-sm">{Object.entries(d.content).map(([k, v]) => <li key={k} className="flex justify-between capitalize"><span>{k}</span><strong>{v}</strong></li>)}</ul>
            </Panel>
            <Panel title="Users">
              <ul className="space-y-2 text-sm"><li className="flex justify-between"><span>Total accounts</span><strong>{d.users.total}</strong></li><li className="flex justify-between"><span>Staff accounts</span><strong>{d.users.staff}</strong></li></ul>
            </Panel>
          </div>
          <Panel title="Recent staff sign-ins" actions={can('security.read') && <Link href="/admin/staff-logins" className="text-xs font-semibold text-brand-700 hover:underline">Staff login history</Link>}>
            <ul className="divide-y divide-line text-sm">
              {d.recentStaffLogins.length === 0 && <li className="py-2 text-muted">No staff sign-ins recorded yet.</li>}
              {d.recentStaffLogins.map((l) => <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{l.user?.fullName ?? l.email} {l.success ? <span className="text-success">signed in</span> : <span className="text-danger">failed ({l.reason?.replace(/_/g, ' ').toLowerCase()})</span>}</span><span className="text-xs text-muted">{new Date(l.createdAt).toLocaleString('en-GB')} · {l.ip}</span></li>)}
            </ul>
          </Panel>
        </div>
      )}
    </>
  );
}
