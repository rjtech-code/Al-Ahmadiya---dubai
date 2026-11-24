'use client';

import { FileText, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adminBtn, adminBtnOutline, adminInput, ErrorNote, Panel, StatusPill, Table } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface Assignment { id: string; titleEn: string; titleAr: string; dueAt: string; maxMarks: number; allowResubmit: boolean; submitted: number; graded: number; students: number }
interface Submission { id: string; student: { fullName: string; email: string }; text: string | null; fileName: string | null; fileUrl: string | null; submittedAt: string; attempts: number; marks: number | null; feedback: string | null; gradedAt: string | null; late: boolean }
const when = (d: string) => new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const msg = (e: unknown) => (e instanceof ApiError ? `${e.message}${Array.isArray(e.body.details) ? ` — ${(e.body.details as { message: string }[]).map((d) => d.message).join('; ')}` : ''}` : 'Something went wrong');

/** Teacher: set assignments and mark submissions. */
export function AssignmentsTab({ courseId, openId }: { courseId: string; openId: string | null }) {
  const [rows, setRows] = useState<Assignment[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(openId);
  const [f, setF] = useState({ titleEn: '', titleAr: '', instructionsEn: '', instructionsAr: '', dueAt: '', maxMarks: '10', allowResubmit: true });
  const load = useCallback(() => apiFetch<{ data: Assignment[] }>(`/teach/courses/${courseId}/assignments`).then((r) => setRows(r.data)).catch((e: unknown) => setError(msg(e))), [courseId]);
  useEffect(() => { void load(); }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    try {
      await apiFetch(`/teach/courses/${courseId}/assignments`, { method: 'POST', json: { ...f, maxMarks: Number(f.maxMarks), dueAt: new Date(f.dueAt).toISOString(), instructionsEn: f.instructionsEn || null, instructionsAr: f.instructionsAr || null } });
      setF({ titleEn: '', titleAr: '', instructionsEn: '', instructionsAr: '', dueAt: '', maxMarks: '10', allowResubmit: true }); await load();
    } catch (err) { setError(msg(err)); }
  };
  const del = async (a: Assignment) => {
    if (!window.confirm(`Delete "${a.titleEn}" and all its submissions?`)) return;
    try { await apiFetch(`/teach/assignments/${a.id}`, { method: 'DELETE' }); await load(); } catch (err) { setError(msg(err)); }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <div>
        <ErrorNote message={error} />
        {!rows ? <p className="text-sm text-muted">Loading…</p> : (
          <Table head={['Assignment', 'Due', 'Submitted', 'Graded', '']} empty={!rows.length}>
            {rows.map((a) => (
              <tr key={a.id} className="hover:bg-cream-100">
                <td className="px-4 py-3"><button onClick={() => setOpen(a.id)} className="text-start font-semibold text-brand-900 hover:underline">{a.titleEn}</button><span className="block text-xs text-muted">{a.maxMarks} marks</span></td>
                <td className="px-4 py-3 text-xs">{when(a.dueAt)}{new Date(a.dueAt) < new Date() && <span className="ms-1 text-danger">· closed</span>}</td>
                <td className="px-4 py-3">{a.submitted}/{a.students}</td>
                <td className="px-4 py-3">{a.graded}/{a.submitted}</td>
                <td className="px-4 py-3 text-end"><button onClick={() => setOpen(a.id)} className="me-2 text-xs font-semibold text-brand-700">Grade</button><button onClick={() => void del(a)} aria-label="Delete" className="text-muted hover:text-danger"><Trash2 className="inline size-4" /></button></td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      <Panel title="New assignment">
        <form onSubmit={create} className="space-y-3">
          <input required minLength={2} className={adminInput} placeholder="Title (English)" value={f.titleEn} onChange={(e) => setF({ ...f, titleEn: e.target.value })} />
          <input required minLength={2} dir="rtl" className={adminInput} placeholder="العنوان (عربي)" value={f.titleAr} onChange={(e) => setF({ ...f, titleAr: e.target.value })} />
          <textarea rows={3} className={`${adminInput} h-auto py-2`} placeholder="Instructions (English)" value={f.instructionsEn} onChange={(e) => setF({ ...f, instructionsEn: e.target.value })} />
          <textarea rows={2} dir="rtl" className={`${adminInput} h-auto py-2`} placeholder="التعليمات (عربي)" value={f.instructionsAr} onChange={(e) => setF({ ...f, instructionsAr: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold">Due (Dubai time)<input required type="datetime-local" className={`${adminInput} mt-1`} value={f.dueAt} onChange={(e) => setF({ ...f, dueAt: e.target.value })} /></label>
            <label className="text-xs font-semibold">Marks<input required type="number" min={1} max={1000} className={`${adminInput} mt-1`} value={f.maxMarks} onChange={(e) => setF({ ...f, maxMarks: e.target.value })} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={f.allowResubmit} onChange={(e) => setF({ ...f, allowResubmit: e.target.checked })} />Students may resubmit before the deadline</label>
          <button className={`${adminBtn} w-full`}><Plus className="size-4" />Publish & notify students</button>
        </form>
      </Panel>
      {open && <SubmissionsDrawer assignmentId={open} onClose={() => { setOpen(null); void load(); }} />}
    </div>
  );
}

function SubmissionsDrawer({ assignmentId, onClose }: { assignmentId: string; onClose: () => void }) {
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [a, setA] = useState<{ titleEn: string; maxMarks: number } | null>(null);
  const [error, setError] = useState('');
  const [marks, setMarks] = useState<Record<string, { marks: string; feedback: string }>>({});
  const load = useCallback(() => apiFetch<{ data: Submission[]; meta: { assignment: { titleEn: string; maxMarks: number } } }>(`/teach/assignments/${assignmentId}/submissions`)
    .then((r) => { setRows(r.data); setA(r.meta.assignment); }).catch((e: unknown) => setError(msg(e))), [assignmentId]);
  useEffect(() => { void load(); }, [load]);
  const save = async (s: Submission) => {
    const v = marks[s.id] ?? { marks: String(s.marks ?? ''), feedback: s.feedback ?? '' };
    try { await apiFetch(`/teach/submissions/${s.id}/grade`, { method: 'PUT', json: { marks: Number(v.marks), feedback: v.feedback || null } }); await load(); } catch (err) { setError(msg(err)); }
  };
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-brand-950/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-2xl overflow-y-auto bg-cream-100 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between"><div><h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-brand-900">{a?.titleEn ?? 'Submissions'}</h2>{a && <p className="text-sm text-muted">Out of {a.maxMarks} marks · students are notified when you save a grade</p>}</div><button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-cream-200"><X className="size-5" /></button></div>
        <ErrorNote message={error} />
        {!rows ? <p className="text-sm text-muted">Loading…</p> : rows.length ? (
          <ul className="space-y-3">
            {rows.map((s) => {
              const v = marks[s.id] ?? { marks: s.marks === null ? '' : String(s.marks), feedback: s.feedback ?? '' };
              return (
                <li key={s.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-brand-900">{s.student.fullName}<span className="ms-2 text-xs font-normal text-muted">{s.student.email}</span></p><span className="flex items-center gap-2 text-xs text-muted">{when(s.submittedAt)}{s.late && <span className="text-danger">late</span>}{s.gradedAt ? <StatusPill status="APPROVED" /> : <StatusPill status="SUBMITTED" />}</span></div>
                  {s.text && <p className="mt-2 whitespace-pre-line rounded-xl bg-cream-50 p-3 text-sm">{s.text}</p>}
                  {s.fileUrl && <a href={s.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><FileText className="size-4" />{s.fileName}</a>}
                  <div className="mt-3 grid gap-2 sm:grid-cols-[7rem_1fr_auto]">
                    <input type="number" min={0} max={a?.maxMarks} aria-label="Marks" placeholder="Marks" className={adminInput} value={v.marks} onChange={(e) => setMarks({ ...marks, [s.id]: { ...v, marks: e.target.value } })} />
                    <input aria-label="Feedback" placeholder="Feedback for the student (optional)" className={adminInput} value={v.feedback} onChange={(e) => setMarks({ ...marks, [s.id]: { ...v, feedback: e.target.value } })} />
                    <button disabled={v.marks === ''} onClick={() => void save(s)} className={adminBtn}>{s.gradedAt ? 'Update' : 'Save grade'}</button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-muted">No submissions yet.</p>}
      </div>
    </div>
  );
}

/** Teacher: enter final marks for a term; grades and points come from the grading scale; publishing releases them to students. */
export function GradebookTab({ courseId }: { courseId: string }) {
  const [term, setTerm] = useState(`${new Date().getFullYear()} Term 1`);
  const [rows, setRows] = useState<{ student: { id: string; fullName: string; email: string }; result: { marks: number | null; grade: string; gradePoints: number; publishedAt: string | null } | null }[] | null>(null);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const load = useCallback(() => apiFetch<{ data: NonNullable<typeof rows> }>(`/teach/courses/${courseId}/results?term=${encodeURIComponent(term)}`)
    .then((r) => { setRows(r.data); setMarks(Object.fromEntries(r.data.map((x) => [x.student.id, x.result?.marks?.toString() ?? '']))); }).catch((e: unknown) => setError(msg(e))), [courseId, term]);
  useEffect(() => { void load(); }, [load]);
  const save = async (publish: boolean) => {
    if (publish && !window.confirm('Publish these results? Students will see them and be notified.')) return;
    setError(''); setOk('');
    const entries = Object.entries(marks).filter(([, v]) => v !== '').map(([userId, v]) => ({ userId, marks: Number(v) }));
    try { await apiFetch(`/teach/courses/${courseId}/results`, { method: 'PUT', json: { term, publish, entries } }); setOk(publish ? 'Results published.' : 'Draft saved (not visible to students).'); await load(); } catch (err) { setError(msg(err)); }
  };
  return (
    <Panel title="Gradebook" actions={<input aria-label="Term" className={`${adminInput} max-w-48`} value={term} onChange={(e) => setTerm(e.target.value)} />}>
      <p className="mb-3 text-sm text-muted">Enter each student’s final mark out of 100. The letter grade and grade points come from the 4.0 scale (A ≥ 90, A- ≥ 85, B+ ≥ 80 … F &lt; 50) and count towards the student’s CGPA once published.</p>
      <ErrorNote message={error} />
      {ok && <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success">{ok}</p>}
      {!rows ? <p className="text-sm text-muted">Loading…</p> : rows.length ? (
        <>
          <Table head={['Student', 'Marks (0–100)', 'Grade', 'Status']}>
            {rows.map((r) => (
              <tr key={r.student.id}>
                <td className="px-4 py-2"><span className="font-semibold text-brand-900">{r.student.fullName}</span><span className="block text-xs text-muted">{r.student.email}</span></td>
                <td className="px-4 py-2"><input type="number" min={0} max={100} aria-label={`Marks for ${r.student.fullName}`} className={`${adminInput} w-28`} value={marks[r.student.id] ?? ''} onChange={(e) => setMarks({ ...marks, [r.student.id]: e.target.value })} /></td>
                <td className="px-4 py-2 font-semibold">{r.result ? `${r.result.grade} (${r.result.gradePoints.toFixed(1)})` : '—'}</td>
                <td className="px-4 py-2">{r.result?.publishedAt ? <StatusPill status="PUBLISHED" /> : r.result ? <StatusPill status="DRAFT" /> : <span className="text-xs text-muted">Not entered</span>}</td>
              </tr>
            ))}
          </Table>
          <div className="mt-4 flex gap-2"><button onClick={() => void save(false)} className={adminBtnOutline}>Save draft</button><button onClick={() => void save(true)} className={adminBtn}>Publish results</button></div>
        </>
      ) : <p className="text-sm text-muted">No enrolled students yet.</p>}
    </Panel>
  );
}
