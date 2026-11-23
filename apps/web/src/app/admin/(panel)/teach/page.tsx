'use client';
/* eslint-disable @next/next/no-img-element -- admin previews of uploaded images */

import { BookOpen, CalendarClock, Radio, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminBtn, adminBtnDanger, adminBtnOutline, ErrorNote, PageHeader, Panel, StatCard } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface Overview {
  courses: { id: string; code: string; slug: string; titleEn: string; imagePath: string | null; deliveryMode: string; publishStatus: string; students: number; lectures: number; quizzes: number }[];
  classes: { id: string; titleEn: string; scheduledAt: string; durationMin: number; status: string; course: { id: string; code: string; titleEn: string } }[];
}
const when = (d: string) => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' });

export default function TeachHome() {
  const router = useRouter();
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

  const live = d?.classes.filter((c) => c.status === 'LIVE') ?? [];
  const upcoming = d?.classes.filter((c) => c.status === 'SCHEDULED') ?? [];
  return (
    <>
      <PageHeader title="My teaching" description="Your courses, this week’s classes and how each student is doing." />
      <ErrorNote message={error} />
      {!d ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-6">
          {live.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-red-50 px-5 py-4">
              <p className="font-semibold text-danger">● Live now: {s.course.titleEn}</p>
              <Link href={`/admin/live/${s.id}`} className={adminBtnDanger}><Radio className="size-4" />Join as teacher</Link>
            </div>
          ))}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="My courses" value={d.courses.length} />
            <StatCard label="Students" value={d.courses.reduce((s, c) => s + c.students, 0)} />
            <StatCard label="Classes this week" value={upcoming.length + live.length} />
          </div>

          <Panel title="Classes this week">
            {upcoming.length ? (
              <ul className="divide-y divide-line">
                {upcoming.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span className="flex items-center gap-3"><CalendarClock className="size-5 text-gold-600" /><span><strong className="text-brand-900">{when(s.scheduledAt)}</strong> · {s.durationMin} min<span className="block text-xs text-muted">{s.course.code} — {s.course.titleEn}</span></span></span>
                    <Link href={`/admin/live/${s.id}`} className={adminBtnOutline}>Open</Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No classes scheduled in the next 7 days. Classes appear here automatically from each course&apos;s weekly timetable.</p>}
          </Panel>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {d.courses.map((c) => (
              <article key={c.id} className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)]">
                {c.imagePath ? <img src={c.imagePath} alt="" className="aspect-[16/8] w-full object-cover" /> : <div className="pattern-girih aspect-[16/8] bg-brand-900" />}
                <div className="p-5">
                  <p className="text-xs font-semibold text-gold-700">{c.code}{c.publishStatus !== 'PUBLISHED' && ' · draft'}</p>
                  <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-brand-900">{c.titleEn}</h2>
                  <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted"><span className="inline-flex items-center gap-1"><Users className="size-3.5" />{c.students} students</span><span className="inline-flex items-center gap-1"><BookOpen className="size-3.5" />{c.lectures} lectures · {c.quizzes} quizzes</span></p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/admin/teach/${c.id}`} className={adminBtn}><Users className="size-4" />Students</Link>
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
