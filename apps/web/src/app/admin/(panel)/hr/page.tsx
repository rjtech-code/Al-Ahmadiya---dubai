'use client';

import { CalendarOff, KeyRound, UserCheck, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { DashPanel, HBars, IconStat, QuickActions, WelcomeBanner } from '@/components/admin/dash';
import { adminBtn, adminBtnDanger, ErrorNote, StatusPill, Table } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface Leave { id: string; type: string; startDate: string; endDate: string; reason: string | null; status: string; note: string | null; user: { fullName: string; email: string }; decidedBy?: { fullName: string } | null }
interface D {
  totals: { staff: number; active: number; inactive: number; newStaff: number; signedInToday: number; onLeaveToday: number; pendingLeave: number };
  byRole: { role: string; count: number }[]; byDepartment: { id: string; name: string; count: number }[];
  onLeave: { id: string; type: string; endDate: string; user: { fullName: string } }[];
  pending: Leave[];
}
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const LABEL: Record<string, string> = { ANNUAL: 'Annual', SICK: 'Sick', CASUAL: 'Casual', OTHER: 'Other' };

export default function HrOverview() {
  const { user } = useAdmin();
  const [d, setD] = useState<D | null>(null);
  const [all, setAll] = useState<Leave[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => Promise.all([
    apiFetch<{ data: D }>('/admin/overview/hr').then((r) => setD(r.data)),
    apiFetch<{ data: Leave[] }>('/admin/leave').then((r) => setAll(r.data)),
  ]).catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to load')), []);
  useEffect(() => { void load(); }, [load]);
  const decide = async (l: Leave, status: 'APPROVED' | 'REJECTED') => {
    const note = status === 'REJECTED' ? window.prompt('Reason for rejecting (shown to the staff member)') : null;
    if (status === 'REJECTED' && note === null) return;
    try { await apiFetch(`/admin/leave/${l.id}`, { method: 'PUT', json: { status, note: note || null } }); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed'); }
  };

  return (
    <>
      <WelcomeBanner title={`Welcome back, ${user.fullName.split(' ')[0]}`} subtitle="HR operations at a glance." />
      <ErrorNote message={error} />
      {!d ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <IconStat icon={Users} label="Total staff" value={d.totals.staff} hint={`${d.totals.inactive} deactivated`} href="/admin/users" />
            <IconStat icon={UserCheck} label="Signed in today" value={d.totals.signedInToday} />
            <IconStat icon={CalendarOff} label="On leave today" value={d.totals.onLeaveToday} hint={`${d.totals.pendingLeave} request${d.totals.pendingLeave === 1 ? '' : 's'} to decide`} />
            <IconStat icon={UserPlus} label="New staff (30 days)" value={d.totals.newStaff} />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <DashPanel title="Leave requests to decide">
              {d.pending.length ? (
                <ul className="divide-y divide-line text-sm">
                  {d.pending.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <span><span className="block font-semibold text-brand-900">{l.user.fullName}</span><span className="text-xs text-muted">{LABEL[l.type]} · {day(l.startDate)} – {day(l.endDate)}{l.reason ? ` · ${l.reason}` : ''}</span></span>
                      <span className="flex gap-2"><button onClick={() => void decide(l, 'APPROVED')} className={`${adminBtn} h-9 px-4`}>Approve</button><button onClick={() => void decide(l, 'REJECTED')} className={`${adminBtnDanger} h-9 px-4`}>Reject</button></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">No leave requests waiting.</p>}
            </DashPanel>
            <DashPanel title="On leave today">
              {d.onLeave.length ? <ul className="space-y-2 text-sm">{d.onLeave.map((l) => <li key={l.id} className="flex justify-between"><span>{l.user.fullName}</span><span className="text-xs text-muted">{LABEL[l.type]} · until {day(l.endDate)}</span></li>)}</ul> : <p className="text-sm text-muted">Everyone is in today.</p>}
            </DashPanel>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <DashPanel title="Staff by role"><HBars rows={d.byRole.map((r) => ({ label: r.role, value: r.count }))} /></DashPanel>
            <DashPanel title="Staff by department">
              {d.byDepartment.some((x) => x.count) ? <HBars rows={d.byDepartment.map((x) => ({ label: x.name, value: x.count }))} /> : <p className="text-sm text-muted">No staff are assigned to a department yet. Set it when editing a user in Staff &amp; users.</p>}
            </DashPanel>
          </div>
          <DashPanel title="All leave requests">
            {all && (
              <Table head={['Staff member', 'Type', 'Dates', 'Status', 'Decided by']} empty={!all.length}>
                {all.map((l) => <tr key={l.id}><td className="px-4 py-2">{l.user.fullName}</td><td className="px-4 py-2">{LABEL[l.type]}</td><td className="px-4 py-2 text-xs">{day(l.startDate)} – {day(l.endDate)}</td><td className="px-4 py-2"><StatusPill status={l.status} /></td><td className="px-4 py-2 text-xs">{l.decidedBy?.fullName ?? '—'}{l.note ? ` · ${l.note}` : ''}</td></tr>)}
              </Table>
            )}
          </DashPanel>
          <DashPanel title="Quick actions">
            <QuickActions items={[
              { href: '/admin/users', label: 'Add employee', icon: UserPlus },
              { href: '/admin/users', label: 'Staff directory', icon: Users },
              { href: '/admin/staff-logins', label: 'Sign-in history', icon: KeyRound },
              { href: '/admin/leave', label: 'My leave', icon: CalendarOff },
            ]} />
          </DashPanel>
        </div>
      )}
    </>
  );
}
