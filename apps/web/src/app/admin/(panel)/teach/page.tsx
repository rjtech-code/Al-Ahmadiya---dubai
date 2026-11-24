'use client';
/* eslint-disable @next/next/no-img-element -- course covers can be local or Cloudinary URLs */

import { BookOpen, CalendarClock, ClipboardCheck, Clock, FilePenLine, Radio, Timer, UserCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { DashPanel, IconStat, QuickActions, Ring, WelcomeBanner } from '@/components/admin/dash';
import { adminBtn, adminBtnOutline, ErrorNote } from '@/components/admin/ui';
import { apiFetch, ApiError, apiUrl } from '@/lib/client-api';

interface Overview {
  courses: { id: string; code: string; slug: string; titleEn: string; imagePath: string | null; publishStatus: string; students: number; lectures: number; quizzes: number }[];
  classes: { id: string; titleEn: string; scheduledAt: string; durationMin: number; status: string; course: { id: string; code: string; titleEn: string } }[];
  stats: { todayClasses: number; students: number; pendingGrading: number; teachingHoursWeek: number };
  attendance: { present: number | null; late: number | null; partial: number | null; absent: number | null; classes: number } | null;
  toGrade: { id: string; submittedAt: string; user: { fullName: string }; assignment: { id: string; titleEn: string; dueAt: string; course: { id: string; code: string } } }[];
  notifications: { id: string; titleEn: string; createdAt: string; link: string | null }[];
}
const tz = { timeZone: 'Asia/Dubai' } as const;
const time = (d: string) => new Date(d).toLocaleTimeString('en-GB', { ...tz, hour: '2-digit', minute: '2-digit' });
const when = (d: string) => new Date(d).toLocaleString('en-GB', { ...tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const ago = (d: string) => { const m = Math.round((Date.now() - new Date(d).getTime()) / 60_000); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

export default function TeachHome() {
  const router = useRouter();
  const { user } = useAdmin();
  const [d, setD] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    let x = false;
    apiFetch<{ data: Overview }>('/teach/overview').then((r) => { if (!x) setD(r.data); }).catch((e: unknown) => { if (!x) setError(e instanceof ApiError ? e.message : 'Failed to load'); });
    return () => { x = true; };
  }, []);

  const goLive = async (courseId: string) => {
    if (!window.confirm('Start a live class now? All enrolled students will be notified.')) return;
    setBusy(courseId);
    try { const r = await apiFetch<{ data: { id: string } }>(`/admin/live/courses/${courseId}/now`, { method: 'POST' }); router.push(`/admin/live/${r.data.id}`); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Could not start the class'); setBusy(null); }
  };

  const live = d?.classes.find((c) => c.status === 'LIVE');
  const next = live ?? d?.classes.find((c) => c.status === 'SCHEDULED');
  const today = (d?.classes ?? []).filter((c) => new Date(c.scheduledAt).toDateString() === new Date().toDateString());
  const first = d?.courses[0];

  return (
    <>
      <WelcomeBanner title={`Welcome back, ${user.fullName}`} subtitle="Here is your teaching overview for today." />
      <ErrorNote message={error} />
      {!d ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <IconStat icon={CalendarClock} label="Today's classes" value={d.stats.todayClasses} />
            <IconStat icon={Users} label="Total students" value={d.stats.students} />
            <IconStat icon={FilePenLine} label="Pending grading" value={d.stats.pendingGrading} hint="Submitted assignments to mark" />
            <IconStat icon={Clock} label="Teaching hours (7 days)" value={d.stats.teachingHoursWeek} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <section className="pattern-girih flex flex-col justify-between rounded-[1.5rem] bg-brand-900 p-6 text-white shadow-[var(--shadow-card)]">
              {next ? (
                <>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${next.status === 'LIVE' ? 'bg-success text-white' : 'bg-white/15 text-gold-300'}`}><span className="size-2 rounded-full bg-current" />{next.status === 'LIVE' ? 'Live now' : 'Next class'}</span>
                    <h2 className="mt-3 font-[family-name:var(--font-cormorant)] text-3xl font-semibold">{next.course.code} — {next.course.titleEn}</h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-white/80"><Timer className="size-4" />{when(next.scheduledAt)} · {next.durationMin} min</p>
                  </div>
                  <Link href={`/admin/live/${next.id}`} className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-cream-50 font-semibold text-brand-900 hover:bg-white">{next.status === 'LIVE' ? 'Join live class →' : 'Open class console →'}</Link>
                </>
              ) : (
                <div>
                  <p className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold">No class scheduled in the next 7 days</p>
                  {first && <button disabled={busy === first.id} onClick={() => void goLive(first.id)} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-cream-50 px-5 font-semibold text-brand-900"><Radio className="size-4" />Go live now · {first.code}</button>}
                </div>
              )}
            </section>
            <DashPanel title="Today's timetable">
              {today.length ? (
                <ol className="relative space-y-4 border-s-2 border-gold-300 ps-5">
                  {today.map((c) => (
                    <li key={c.id} className="relative">
                      <span className={`absolute -start-[1.65rem] top-1 size-3 rounded-full border-2 border-cream-50 ${c.status === 'LIVE' ? 'bg-danger' : 'bg-gold-500'}`} />
                      <Link href={`/admin/live/${c.id}`} className="flex justify-between gap-3 text-sm hover:text-brand-700"><span className="font-semibold text-gold-700">{time(c.scheduledAt)}</span><span className="flex-1 font-semibold text-brand-900">{c.course.titleEn}</span><span className="text-xs text-muted">{c.course.code}</span></Link>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-muted">No classes today.</p>}
            </DashPanel>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <DashPanel title="Attendance overview">
              {d.attendance ? (
                <div className="flex items-center gap-5">
                  <Ring value={d.attendance.present ?? 0} label="Present" />
                  <ul className="space-y-2 text-sm">
                    {[['Present', d.attendance.present, 'bg-success'], ['Late', d.attendance.late, 'bg-warning'], ['Partly attended', d.attendance.partial, 'bg-gold-500'], ['Absent', d.attendance.absent, 'bg-danger']].map(([l, v, c]) => (
                      <li key={l as string} className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${c}`} /><span className="w-28">{l}</span><strong className="text-brand-900">{v ?? 0}%</strong></li>
                    ))}
                    <li className="text-xs text-muted">Across {d.attendance.classes} class{d.attendance.classes === 1 ? '' : 'es'}</li>
                  </ul>
                </div>
              ) : <p className="text-sm text-muted">Attendance appears after your first live class.</p>}
            </DashPanel>
            <DashPanel title="To grade">
              {d.toGrade.length ? (
                <ul className="space-y-3 text-sm">
                  {d.toGrade.map((g) => (
                    <li key={g.id}><Link href={`/admin/teach/${g.assignment.course.id}?tab=assignments&a=${g.assignment.id}`} className="flex items-start gap-3 hover:text-brand-700"><ClipboardCheck className="mt-0.5 size-4 shrink-0 text-gold-600" /><span><span className="block font-semibold text-brand-900">{g.assignment.titleEn}</span><span className="text-xs text-muted">{g.user.fullName} · {g.assignment.course.code} · {ago(g.submittedAt)}</span></span></Link></li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">Nothing waiting to be graded.</p>}
            </DashPanel>
            <DashPanel title="Recent notifications">
              {d.notifications.length ? <ul className="space-y-3 text-sm">{d.notifications.map((n) => <li key={n.id}>{n.link ? <Link href={n.link} className="hover:text-brand-700">{n.titleEn}</Link> : n.titleEn}<span className="block text-xs text-muted">{ago(n.createdAt)}</span></li>)}</ul> : <p className="text-sm text-muted">No notifications.</p>}
            </DashPanel>
          </div>

          {first && (
            <DashPanel title="Quick actions">
              <QuickActions items={[
                { href: next ? `/admin/live/${next.id}` : `/admin/teach/${first.id}`, label: 'Take attendance', icon: UserCheck },
                { href: `/admin/teach/${first.id}?tab=assignments`, label: 'Create assignment', icon: FilePenLine },
                { href: `/admin/teach/${first.id}?tab=assignments`, label: 'Grade work', icon: ClipboardCheck },
                { href: `/admin/teach/${first.id}?tab=results`, label: 'Gradebook', icon: BookOpen },
                { href: `/admin/teach/${first.id}`, label: 'Student progress', icon: Users },
                { href: '/admin/teach#courses', label: 'My courses', icon: Radio },
              ]} />
            </DashPanel>
          )}

          <div id="courses" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {d.courses.map((c) => (
              <article key={c.id} className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)]">
                {c.imagePath ? <img src={apiUrl(c.imagePath)} alt="" className="aspect-[16/8] w-full object-cover" /> : <div className="pattern-girih aspect-[16/8] bg-brand-900" />}
                <div className="p-5">
                  <p className="text-xs font-semibold text-gold-700">{c.code}{c.publishStatus !== 'PUBLISHED' && ' · draft'}</p>
                  <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-brand-900">{c.titleEn}</h2>
                  <p className="mt-1 text-xs text-muted">{c.students} students · {c.lectures} lectures · {c.quizzes} quizzes</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/admin/teach/${c.id}`} className={adminBtn}><Users className="size-4" />Open</Link>
                    <button disabled={busy === c.id} onClick={() => void goLive(c.id)} className={adminBtnOutline}><Radio className="size-4" />{busy === c.id ? 'Starting…' : 'Go live now'}</button>
                  </div>
                </div>
              </article>
            ))}
            {!d.courses.length && <p className="text-sm text-muted">No courses are assigned to you yet. An administrator assigns the teacher in the course builder.</p>}
          </div>
        </div>
      )}
    </>
  );
}
