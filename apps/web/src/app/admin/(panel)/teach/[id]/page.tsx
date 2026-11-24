'use client';

import { CheckCircle2, Circle, X } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { AssignmentsTab, GradebookTab } from './tabs';
import { useEffect, useState } from 'react';
import { ErrorNote, PageHeader, Panel, Table } from '@/components/admin/ui';
import { cn } from '@/components/ui/cn';
import { apiFetch, ApiError } from '@/lib/client-api';

interface Row { userId: string; name: string; email: string; lecturesDone: number; lecturesTotal: number; quizzesPassed: number; quizzesTried: number; quizzesTotal: number; classesAttended: number; classesHeld: number; attendancePercent: number | null; lastActive: string | null }
interface Detail {
  student: { fullName: string; email: string; enrolledAt: string | null };
  lectures: { id: string; titleEn: string; completedAt: string | null; watchedSec: number }[];
  quizzes: { id: string; titleEn: string; attempts: number; best: { score: number; total: number } | null; passed: boolean }[];
  classes: { id: string; titleEn: string; scheduledAt: string; attended: boolean; minutes: number }[];
}
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Dubai' }) : '—');

function Bar({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="min-w-28">
      <p className="text-xs"><strong className="text-brand-900">{value}</strong> / {total}</p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-200"><div className={cn('h-full rounded-full', pct >= 75 ? 'bg-success' : pct >= 40 ? 'bg-gold-500' : 'bg-danger')} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function StudentsTab({ id }: { id: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [course, setCourse] = useState<{ code: string; titleEn: string } | null>(null);
  const [open, setOpen] = useState<{ row: Row; detail: Detail | null } | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let x = false;
    apiFetch<{ data: Row[]; meta: { course: { code: string; titleEn: string } } }>(`/teach/courses/${id}/students`)
      .then((r) => { if (!x) { setRows(r.data); setCourse(r.meta.course); } })
      .catch((e: unknown) => { if (!x) setError(e instanceof ApiError ? e.message : 'Failed to load'); });
    return () => { x = true; };
  }, [id]);
  const show = async (row: Row) => {
    setOpen({ row, detail: null });
    try { const r = await apiFetch<{ data: Detail }>(`/teach/courses/${id}/students/${row.userId}`); setOpen({ row, detail: r.data }); } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load'); }
  };
  const list = (rows ?? []).filter((r) => !q || `${r.name} ${r.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <p className="mb-4 text-sm text-muted">What each student has watched, which quizzes they passed and how many live classes they attended{course ? ` in ${course.code}` : ''}. Click a student for details.</p>
      <ErrorNote message={error} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="mb-4 h-10 w-full max-w-sm rounded-xl border border-line bg-white px-3.5 text-sm" />
      {!rows ? <p className="text-sm text-muted">Loading…</p> : (
        <Table head={['Student', 'Lectures watched', 'Quizzes passed', 'Live classes attended', 'Last active']} empty={!list.length}>
          {list.map((r) => (
            <tr key={r.userId} onClick={() => void show(r)} className="cursor-pointer hover:bg-cream-100">
              <td className="px-4 py-3"><span className="font-semibold text-brand-900">{r.name}</span><span className="block text-xs text-muted">{r.email}</span></td>
              <td className="px-4 py-3"><Bar value={r.lecturesDone} total={r.lecturesTotal} /></td>
              <td className="px-4 py-3"><Bar value={r.quizzesPassed} total={r.quizzesTotal} /></td>
              <td className="px-4 py-3">{r.classesHeld ? <Bar value={r.classesAttended} total={r.classesHeld} /> : <span className="text-xs text-muted">No classes yet</span>}</td>
              <td className="px-4 py-3 text-xs">{date(r.lastActive)}</td>
            </tr>
          ))}
        </Table>
      )}

      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-brand-950/40" onClick={() => setOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-xl overflow-y-auto bg-cream-100 p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div><h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-brand-900">{open.row.name}</h2><p className="text-sm text-muted">{open.row.email}</p></div>
              <button onClick={() => setOpen(null)} aria-label="Close" className="rounded-full p-2 hover:bg-cream-200"><X className="size-5" /></button>
            </div>
            {!open.detail ? <p className="text-sm text-muted">Loading…</p> : (
              <div className="space-y-4">
                <Panel title={`Lectures (${open.detail.lectures.filter((l) => l.completedAt).length}/${open.detail.lectures.length})`}>
                  <ul className="space-y-1 text-sm">{open.detail.lectures.map((l) => <li key={l.id} className="flex items-center justify-between gap-2"><span className="flex items-center gap-2">{l.completedAt ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted" />}{l.titleEn}</span><span className="text-xs text-muted">{l.completedAt ? date(l.completedAt) : l.watchedSec ? `${Math.round(l.watchedSec / 60)} min watched` : 'Not started'}</span></li>)}</ul>
                </Panel>
                <Panel title="Quizzes">
                  {open.detail.quizzes.length ? <ul className="space-y-1 text-sm">{open.detail.quizzes.map((z) => <li key={z.id} className="flex justify-between gap-2"><span>{z.titleEn}</span><span className={cn('text-xs font-semibold', z.passed ? 'text-success' : z.attempts ? 'text-warning' : 'text-muted')}>{z.best ? `${z.best.score}/${z.best.total} · ${z.attempts} tr${z.attempts === 1 ? 'y' : 'ies'}` : 'Not taken'}</span></li>)}</ul> : <p className="text-sm text-muted">No quizzes.</p>}
                </Panel>
                <Panel title="Live classes">
                  {open.detail.classes.length ? <ul className="space-y-1 text-sm">{open.detail.classes.map((s) => <li key={s.id} className="flex justify-between gap-2"><span>{date(s.scheduledAt)}</span><span className={cn('text-xs font-semibold', s.attended ? 'text-success' : 'text-danger')}>{s.attended ? `Present · ${s.minutes} min` : 'Absent'}</span></li>)}</ul> : <p className="text-sm text-muted">No live classes held yet.</p>}
                </Panel>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function TeachCourse() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const [tab, setTab] = useState<'students' | 'assignments' | 'results'>((sp.get('tab') as 'assignments' | 'results' | null) ?? 'students');
  const [course, setCourse] = useState<{ code: string; titleEn: string; creditHours?: number } | null>(null);
  useEffect(() => {
    apiFetch<{ data: Row[]; meta: { course: { code: string; titleEn: string } } }>(`/teach/courses/${id}/students`).then((r) => setCourse(r.meta.course)).catch(() => undefined);
  }, [id]);
  return (
    <>
      <PageHeader title={course ? `${course.code} — ${course.titleEn}` : 'Course'} crumbs={[{ label: 'My teaching', href: '/admin/teach' }, { label: course?.code ?? '…' }]} />
      <div role="tablist" className="mb-5 inline-flex gap-1 rounded-full bg-cream-200 p-1">
        {([['students', 'Students & progress'], ['assignments', 'Assignments & grading'], ['results', 'Gradebook']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('rounded-full px-4 py-2 text-sm font-semibold', tab === k ? 'bg-brand-900 text-white' : 'text-brand-900')}>{l}</button>
        ))}
      </div>
      {tab === 'students' && <StudentsTab id={id} />}
      {tab === 'assignments' && <AssignmentsTab courseId={id} openId={sp.get('a')} />}
      {tab === 'results' && <GradebookTab courseId={id} />}
    </>
  );
}
