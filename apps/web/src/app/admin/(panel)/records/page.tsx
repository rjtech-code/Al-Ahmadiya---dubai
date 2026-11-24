'use client';

import { BadgeCheck, CalendarDays, ClipboardList, FileText, GraduationCap, Search, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { DashPanel, HBars, IconStat, QuickActions, Ring, WelcomeBanner } from '@/components/admin/dash';
import { adminInput, ErrorNote } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface D {
  totals: { students: number; registrations: number; thisMonth: number; onTrackPercent: number | null };
  registrations: { active: number; pending: number; cancelled: number };
  events: { id: string; titleEn: string; startsAt: string; category: string }[];
  audit: { name: string; programme: string; earned: number; required: number }[];
  prerequisiteIssues: { student: string; course: string; missing: string }[]; prerequisiteIssueCount: number;
  activity: { at: string; text: string }[];
}
type S = { id: string; fullName: string; email: string; _count: { enrollments: number; results: number } };

export default function Registrar() {
  const { user } = useAdmin();
  const [d, setD] = useState<D | null>(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<S[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<{ data: D }>('/admin/records/overview').then((r) => setD(r.data)).catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to load')); }, []);
  const search = async (e: FormEvent) => { e.preventDefault(); try { setFound((await apiFetch<{ data: S[] }>(`/admin/records/students?q=${encodeURIComponent(q)}`)).data); } catch (x) { setError(x instanceof ApiError ? x.message : 'Failed'); } };
  const reg = d?.registrations;
  const regTotal = reg ? reg.active + reg.pending + reg.cancelled : 0;

  return (
    <>
      <WelcomeBanner title={`Welcome, ${user.fullName.split(' ')[0]}`} subtitle="Academic services — registrations, records and transcripts." />
      <ErrorNote message={error} />
      {!d || !reg ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <IconStat icon={Users} label="Active students" value={d.totals.students} />
            <IconStat icon={ClipboardList} label="Course registrations" value={d.totals.registrations} hint={`${d.totals.thisMonth} this month`} />
            <IconStat icon={BadgeCheck} label="On track (GPA ≥ 2.0)" value={d.totals.onTrackPercent === null ? '—' : `${d.totals.onTrackPercent}%`} />
            <IconStat icon={ShieldCheck} label="Prerequisite issues" value={d.prerequisiteIssueCount} />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <DashPanel title="Registration overview">
              {regTotal ? (
                <div className="flex items-center gap-6">
                  <Ring value={Math.round((reg.active / regTotal) * 100)} label="Registered and paid" />
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-3"><span className="size-2.5 translate-y-1.5 rounded-full bg-success" /><span className="w-32">Registered</span><strong>{reg.active}</strong></li>
                    <li className="flex gap-3"><span className="size-2.5 translate-y-1.5 rounded-full bg-warning" /><span className="w-32">Awaiting payment</span><strong>{reg.pending}</strong></li>
                    <li className="flex gap-3"><span className="size-2.5 translate-y-1.5 rounded-full bg-danger" /><span className="w-32">Cancelled</span><strong>{reg.cancelled}</strong></li>
                  </ul>
                </div>
              ) : <p className="text-sm text-muted">No course registrations yet.</p>}
            </DashPanel>
            <DashPanel title="Academic calendar" action={<Link href="/admin/cms/events" className="text-xs font-semibold text-brand-700 hover:underline">Manage events →</Link>}>
              {d.events.length ? (
                <ul className="space-y-3">{d.events.map((e) => {
                  const dt = new Date(e.startsAt);
                  return <li key={e.id} className="flex items-center gap-4"><span className="grid w-14 shrink-0 place-items-center rounded-xl bg-gold-100 py-1 text-brand-900"><span className="text-[10px] font-semibold uppercase">{dt.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Asia/Dubai' })}</span><span className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold leading-none">{dt.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'Asia/Dubai' })}</span></span><span className="text-sm font-semibold text-brand-900">{e.titleEn}<span className="block text-xs font-normal capitalize text-muted">{e.category}</span></span></li>;
                })}</ul>
              ) : <p className="text-sm text-muted">No upcoming dates. Add them as events in Website content.</p>}
            </DashPanel>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <DashPanel title="Credit hour audit" action={<span className="text-xs text-muted">Admitted students</span>}>
              {d.audit.length ? <HBars rows={d.audit.map((a) => ({ label: a.name.split(' ')[0], value: a.earned }))} format={(v) => `${v}`} /> : <p className="text-sm text-muted">Appears once admitted students have published results.</p>}
              {d.audit.length > 0 && <p className="mt-2 text-xs text-muted">Credits passed · required: {[...new Set(d.audit.map((a) => `${a.programme} ${a.required}`))].join(' · ')}</p>}
            </DashPanel>
            <DashPanel title="Prerequisite validation">
              {d.prerequisiteIssues.length ? (
                <ul className="space-y-2 text-sm">{d.prerequisiteIssues.map((p, i) => <li key={i} className="flex items-start gap-2"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-warning" /><span><strong className="text-brand-900">{p.student}</strong> is taking {p.course} without passing {p.missing}</span></li>)}</ul>
              ) : <p className="flex items-center gap-2 text-sm font-semibold text-success"><BadgeCheck className="size-5" />All clear — no prerequisite issues.</p>}
            </DashPanel>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <DashPanel id="transcripts" title="Transcripts" className="scroll-mt-24">
              <form onSubmit={search} className="flex gap-2"><div className="relative flex-1"><Search className="absolute start-3 top-3 size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a student by name or email" className={`${adminInput} ps-9`} /></div><button className="rounded-full bg-brand-900 px-4 text-sm font-semibold text-white">Search</button></form>
              {found && (found.length ? <ul className="mt-3 divide-y divide-line text-sm">{found.map((s) => <li key={s.id}><Link href={`/admin/records/${s.id}`} className="flex justify-between py-2 hover:text-brand-700"><span><strong className="text-brand-900">{s.fullName}</strong><span className="block text-xs text-muted">{s.email}</span></span><span className="text-xs text-muted">{s._count.results} results →</span></Link></li>)}</ul> : <p className="mt-3 text-sm text-muted">No matching students.</p>)}
            </DashPanel>
            <DashPanel title="Recent activity">
              {d.activity.length ? <ul className="space-y-2 text-sm">{d.activity.map((a, i) => <li key={i} className="flex justify-between gap-3"><span>{a.text}</span><span className="shrink-0 text-xs text-muted">{new Date(a.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></li>)}</ul> : <p className="text-sm text-muted">No activity yet.</p>}
            </DashPanel>
          </div>
          <DashPanel title="Quick actions">
            <QuickActions items={[
              { href: '/admin/finance#students', label: 'Student registrations', icon: Users },
              { href: '/admin/teach', label: 'Grade processing', icon: GraduationCap },
              { href: '/admin/records#transcripts', label: 'Transcripts', icon: FileText },
              { href: '/admin/cms/events', label: 'Academic calendar', icon: CalendarDays },
            ]} />
          </DashPanel>
        </div>
      )}
    </>
  );
}
