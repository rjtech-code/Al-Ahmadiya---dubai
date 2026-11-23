'use client';

import { Eye, Film, Plus, Radio, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { emptyQ, QuizBuilder, type QuizQ } from '@/components/admin/QuizBuilder';
import { RecordForm } from '@/components/admin/RecordForm';
import { Stepper } from '@/components/admin/Stepper';
import { adminBtn, adminBtnDanger, adminBtnOutline, adminInput, ErrorNote, PageHeader, Panel, StatusPill } from '@/components/admin/ui';
import { apiFetch, ApiError, formatMoney, uploadWithProgress } from '@/lib/client-api';

interface Lesson { id: string; titleEn: string; titleAr: string; descriptionEn: string | null; descriptionAr: string | null; status: string; isPreview: boolean; videoBytes: number | null; durationSec: number | null; liveSessionId: string | null }
interface Note { id: string; titleEn: string; titleAr: string; bodyEn: string | null; fileName: string | null; status: string }
interface Quiz { id: string; titleEn: string; titleAr: string; passPercent: number; status: string; questions: QuizQ[] }
interface Session { id: string; titleEn: string; scheduledAt: string; status: string; recordingStatus: string }
interface Course { id: string; slug: string; code: string; titleEn: string; publishStatus: string; confirmation: string; onlineEnabled: boolean; deliveryMode: 'RECORDED' | 'LIVE'; priceFils: number | null; currency: string; lessons: Lesson[]; notes: Note[]; quizzes: Quiz[]; liveSessions: Session[]; enrollments: { id: string; status: string; activatedAt: string | null; user: { fullName: string; email: string } }[] }

const mb = (b: number | null) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : '—');

export default function CourseBuilder() {
  const { id: rawId } = useParams<{ id: string }>();
  const router = useRouter();
  const [id, setId] = useState<string | null>(rawId === 'new' ? null : rawId);
  const [step, setStep] = useState(0);
  const [c, setC] = useState<Course | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback((cid: string) => apiFetch<{ data: Course }>(`/admin/lms/courses/${cid}`).then((r) => setC(r.data)), []);
  useEffect(() => {
    if (!id) return;
    let x = false;
    apiFetch<{ data: Course }>(`/admin/lms/courses/${id}`).then((r) => { if (!x) setC(r.data); }).catch((e: unknown) => { if (!x) setError(e instanceof ApiError ? e.message : 'Failed'); });
    return () => { x = true; };
  }, [id]);
  const ok = (m: string) => { setMsg(m); setError(''); setTimeout(() => setMsg(''), 6000); };
  const fail = (e: unknown) => setError(e instanceof ApiError ? `${e.message}${Array.isArray(e.body.details) ? ` — ${(e.body.details as { path: string; message: string }[]).map((d) => `${d.path}: ${d.message}`).join('; ')}` : ''}` : (e as Error).message);

  const steps = ['Details', 'Online & price', 'Lectures', 'Notes', 'Quizzes', 'Live classes', 'Students'];
  return (
    <>
      <PageHeader title={c ? `${c.code} — ${c.titleEn}` : 'New course'} crumbs={[{ label: 'Online courses', href: '/admin/courses' }, { label: c?.code ?? 'New' }]}
        actions={c && <div className="flex items-center gap-2"><StatusPill status={c.publishStatus} /><a href={`/en/courses/${c.slug}`} target="_blank" rel="noreferrer" className={adminBtnOutline}><Eye className="size-4" />View page</a></div>} />
      <Stepper steps={steps} current={step} onSelect={setStep} enabled={(i) => i === 0 || !!id} />
      <ErrorNote message={error} />
      {msg && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success">{msg}</p>}

      {step === 0 && <Panel title="Step 1 — Course details (English & Arabic)"><RecordForm resource="courses" id={id} onSaved={(row) => { if (!id) { setId(row.id); router.replace(`/admin/courses/${row.id}`); } void load(row.id); ok('Details saved'); setStep(1); }} /></Panel>}
      {step === 1 && c && <OnlineStep c={c} onSaved={() => { void load(c.id); ok('Online settings saved'); setStep(2); }} onError={fail} />}
      {step === 2 && c && <LecturesStep c={c} reload={() => load(c.id)} ok={ok} fail={fail} />}
      {step === 3 && c && <NotesStep c={c} reload={() => load(c.id)} ok={ok} fail={fail} />}
      {step === 4 && c && <QuizzesStep c={c} reload={() => load(c.id)} ok={ok} fail={fail} />}
      {step === 5 && c && <LiveStep c={c} reload={() => load(c.id)} ok={ok} fail={fail} />}
      {step === 6 && c && (
        <Panel title={`Step 7 — Students (${c.enrollments.filter((e) => e.status === 'ACTIVE').length} active)`}>
          {c.enrollments.length ? (
            <table className="w-full text-sm"><thead className="text-xs uppercase text-muted"><tr><th className="py-2 text-start">Student</th><th className="text-start">Status</th><th className="text-start">Activated</th></tr></thead>
              <tbody className="divide-y divide-line">{c.enrollments.map((e) => <tr key={e.id}><td className="py-2">{e.user.fullName}<span className="block text-xs text-muted">{e.user.email}</span></td><td><StatusPill status={e.status} /></td><td className="text-xs">{e.activatedAt ? new Date(e.activatedAt).toLocaleString('en-GB') : '—'}</td></tr>)}</tbody></table>
          ) : <p className="text-sm text-muted">No students yet. Students appear here after they pay for the course.</p>}
        </Panel>
      )}
    </>
  );
}

function OnlineStep({ c, onSaved, onError }: { c: Course; onSaved: () => void; onError: (e: unknown) => void }) {
  const [enabled, setEnabled] = useState(c.onlineEnabled);
  const [mode, setMode] = useState(c.deliveryMode);
  const [price, setPrice] = useState(c.priceFils ? String(c.priceFils / 100) : '');
  const save = async (e: FormEvent) => { e.preventDefault(); try { await apiFetch(`/admin/lms/courses/${c.id}/online`, { method: 'PUT', json: { onlineEnabled: enabled, deliveryMode: mode, priceAed: price === '' ? null : Number(price) } }); onSaved(); } catch (err) { onError(err); } };
  return (
    <Panel title="Step 2 — Online access & price">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-3"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-4" />Sell this course online (students can enrol and pay)</label>
        <label className="text-xs font-semibold">Course type<select className={`${adminInput} mt-1`} value={mode} onChange={(e) => setMode(e.target.value as 'LIVE')}><option value="RECORDED">Recorded — self-paced videos</option><option value="LIVE">Current course — live classes + recordings</option></select></label>
        <label className="text-xs font-semibold">Price (AED, blank or 0 = free)<input type="number" min={0} step="0.01" className={`${adminInput} mt-1`} value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <div className="flex items-end"><button className={adminBtn}>Save & continue</button></div>
      </form>
      <p className="mt-3 text-xs text-muted">The course page shows the price and an Enrol button. After the payment is verified by the gateway, the course is activated in the student’s dashboard automatically.</p>
    </Panel>
  );
}

function LecturesStep({ c, reload, ok, fail }: { c: Course; reload: () => Promise<void>; ok: (m: string) => void; fail: (e: unknown) => void }) {
  const [form, setForm] = useState({ titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', status: 'PUBLISHED' });
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const upload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('video', file);
    try { setPct(0); await uploadWithProgress(`/admin/lms/courses/${c.id}/lessons`, fd, setPct); setForm({ titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', status: 'PUBLISHED' }); setFile(null); (e.target as HTMLFormElement).reset(); await reload(); ok('Lecture uploaded'); }
    catch (err) { fail(err); } finally { setPct(null); }
  };
  const move = async (i: number, d: -1 | 1) => { const ids = c.lessons.map((l) => l.id); const j = i + d; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; try { await apiFetch(`/admin/lms/courses/${c.id}/lessons/reorder`, { method: 'POST', json: { ids } }); await reload(); } catch (err) { fail(err); } };
  const toggle = async (l: Lesson) => { try { await apiFetch(`/admin/lms/lessons/${l.id}`, { method: 'PUT', json: { titleEn: l.titleEn, titleAr: l.titleAr, descriptionEn: l.descriptionEn, descriptionAr: l.descriptionAr, isPreview: l.isPreview, status: l.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' } }); await reload(); } catch (err) { fail(err); } };
  const del = async (l: Lesson) => { if (!window.confirm(`Delete "${l.titleEn}" and its video?`)) return; try { await apiFetch(`/admin/lms/lessons/${l.id}`, { method: 'DELETE' }); await reload(); ok('Lecture deleted'); } catch (err) { fail(err); } };
  const watch = async (l: Lesson) => { try { setPreview((await apiFetch<{ data: { url: string } }>(`/admin/lms/lessons/${l.id}/preview`)).data.url); } catch (err) { fail(err); } };
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <Panel title={`Step 3 — Lectures (${c.lessons.length})`}>
        {preview && <video src={preview} controls className="mb-4 aspect-video w-full rounded-2xl bg-black" />}
        {c.lessons.length ? (
          <ol className="space-y-2">
            {c.lessons.map((l, i) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3">
                <span className="grid size-8 place-items-center rounded-full bg-brand-900 text-xs font-semibold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1"><p className="font-semibold text-brand-900">{l.titleEn}{l.liveSessionId && <span className="ms-2 text-xs text-danger">● from live class</span>}</p><p className="text-xs text-muted" dir="rtl">{l.titleAr}</p><p className="text-xs text-muted">{mb(l.videoBytes)}</p></div>
                <StatusPill status={l.status} />
                <div className="flex gap-1">
                  <button onClick={() => void move(i, -1)} className="rounded-full px-2 text-xs hover:bg-cream-200" aria-label="Move up">↑</button>
                  <button onClick={() => void move(i, 1)} className="rounded-full px-2 text-xs hover:bg-cream-200" aria-label="Move down">↓</button>
                  <button onClick={() => void watch(l)} className="rounded-full px-2 text-xs font-semibold text-brand-700 hover:underline">Preview</button>
                  <button onClick={() => void toggle(l)} className="rounded-full px-2 text-xs font-semibold text-brand-700 hover:underline">{l.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</button>
                  <button onClick={() => void del(l)} aria-label="Delete" className="rounded-full px-2 text-muted hover:text-danger"><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-muted">No lectures yet. Upload the first video on the right.</p>}
      </Panel>
      <Panel title="Upload a lecture video">
        <form onSubmit={upload} className="space-y-3">
          <input required className={adminInput} placeholder="Title (English)" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
          <input required dir="rtl" className={adminInput} placeholder="العنوان (عربي)" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
          <textarea rows={3} className={`${adminInput} h-auto py-2`} placeholder="Description (English)" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
          <textarea rows={3} dir="rtl" className={`${adminInput} h-auto py-2`} placeholder="الوصف (عربي)" value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} />
          <select className={adminInput} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="PUBLISHED">Publish immediately (students are notified)</option><option value="DRAFT">Save as draft</option></select>
          <label className="block rounded-2xl border-2 border-dashed border-gold-300 p-4 text-center text-sm"><Film className="mx-auto size-6 text-gold-600" /><span className="mt-1 block">{file ? `${file.name} (${mb(file.size)})` : 'Choose MP4, WebM or MOV'}</span><input required type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          {pct !== null && <div className="h-2 overflow-hidden rounded-full bg-cream-200"><div className="h-full bg-brand-900 transition-all" style={{ width: `${pct}%` }} /></div>}
          <button disabled={!file || pct !== null} className={`${adminBtn} w-full`}><Upload className="size-4" />{pct !== null ? `Uploading ${pct}%` : 'Upload lecture'}</button>
        </form>
      </Panel>
    </div>
  );
}

function NotesStep({ c, reload, ok, fail }: { c: Course; reload: () => Promise<void>; ok: (m: string) => void; fail: (e: unknown) => void }) {
  const [form, setForm] = useState({ titleEn: '', titleAr: '', bodyEn: '', bodyAr: '', lessonId: '' });
  const [file, setFile] = useState<File | null>(null);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    if (file) fd.append('file', file);
    try { await uploadWithProgress(`/admin/lms/courses/${c.id}/notes`, fd, () => undefined); setForm({ titleEn: '', titleAr: '', bodyEn: '', bodyAr: '', lessonId: '' }); setFile(null); (e.target as HTMLFormElement).reset(); await reload(); ok('Note added'); } catch (err) { fail(err); }
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <Panel title={`Step 4 — Notes (${c.notes.length})`}>
        {c.notes.length ? <ul className="space-y-2">{c.notes.map((n) => (
          <li key={n.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-3">
            <div><p className="font-semibold text-brand-900">{n.titleEn}</p><p className="text-xs text-muted">{n.fileName ? `PDF: ${n.fileName}` : 'Text note'}{n.bodyEn ? ' · has text' : ''}</p></div>
            <button onClick={async () => { if (!window.confirm('Delete this note?')) return; try { await apiFetch(`/admin/lms/notes/${n.id}`, { method: 'DELETE' }); await reload(); } catch (err) { fail(err); } }} className="text-muted hover:text-danger" aria-label="Delete"><Trash2 className="size-4" /></button>
          </li>))}</ul> : <p className="text-sm text-muted">No notes yet. Students can read notes online or download PDFs once enrolled.</p>}
      </Panel>
      <Panel title="Add notes">
        <form onSubmit={add} className="space-y-3">
          <input required className={adminInput} placeholder="Title (English)" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
          <input required dir="rtl" className={adminInput} placeholder="العنوان (عربي)" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
          <select className={adminInput} value={form.lessonId} onChange={(e) => setForm({ ...form, lessonId: e.target.value })}><option value="">Whole course</option>{c.lessons.map((l) => <option key={l.id} value={l.id}>Lecture: {l.titleEn}</option>)}</select>
          <textarea rows={4} className={`${adminInput} h-auto py-2`} placeholder="Note text (English, Markdown allowed)" value={form.bodyEn} onChange={(e) => setForm({ ...form, bodyEn: e.target.value })} />
          <textarea rows={4} dir="rtl" className={`${adminInput} h-auto py-2`} placeholder="نص الملاحظة (عربي)" value={form.bodyAr} onChange={(e) => setForm({ ...form, bodyAr: e.target.value })} />
          <label className="block text-xs font-semibold">PDF (optional)<input type="file" accept="application/pdf" className="mt-1 block w-full text-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          <button className={`${adminBtn} w-full`}><Plus className="size-4" />Add note</button>
        </form>
      </Panel>
    </div>
  );
}

function QuizzesStep({ c, reload, ok, fail }: { c: Course; reload: () => Promise<void>; ok: (m: string) => void; fail: (e: unknown) => void }) {
  const [title, setTitle] = useState({ en: '', ar: '' });
  const [pass, setPass] = useState(60);
  const [qs, setQs] = useState<QuizQ[]>([emptyQ()]);
  const add = async (e: FormEvent) => { e.preventDefault(); try { await apiFetch(`/admin/lms/courses/${c.id}/quizzes`, { method: 'POST', json: { titleEn: title.en, titleAr: title.ar, passPercent: pass, questions: qs } }); setTitle({ en: '', ar: '' }); setQs([emptyQ()]); await reload(); ok('Quiz added'); } catch (err) { fail(err); } };
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_30rem]">
      <Panel title={`Step 5 — Quizzes (${c.quizzes.length})`}>
        {c.quizzes.length ? <ul className="space-y-2">{c.quizzes.map((q) => (
          <li key={q.id} className="flex items-center justify-between rounded-2xl border border-line bg-white p-3">
            <div><p className="font-semibold text-brand-900">{q.titleEn}</p><p className="text-xs text-muted">{q.questions.length} questions · pass {q.passPercent}%</p></div>
            <button onClick={async () => { if (!window.confirm('Delete this quiz?')) return; try { await apiFetch(`/admin/lms/quizzes/${q.id}`, { method: 'DELETE' }); await reload(); } catch (err) { fail(err); } }} className="text-muted hover:text-danger" aria-label="Delete"><Trash2 className="size-4" /></button>
          </li>))}</ul> : <p className="text-sm text-muted">No quizzes yet.</p>}
      </Panel>
      <Panel title="New quiz">
        <form onSubmit={add} className="space-y-3">
          <input required className={adminInput} placeholder="Quiz title (English)" value={title.en} onChange={(e) => setTitle({ ...title, en: e.target.value })} />
          <input required dir="rtl" className={adminInput} placeholder="عنوان الاختبار (عربي)" value={title.ar} onChange={(e) => setTitle({ ...title, ar: e.target.value })} />
          <label className="block text-xs font-semibold">Pass mark %<input type="number" min={0} max={100} className={`${adminInput} mt-1`} value={pass} onChange={(e) => setPass(Number(e.target.value))} /></label>
          <QuizBuilder questions={qs} onChange={setQs} />
          <button className={`${adminBtn} w-full`}>Save quiz</button>
        </form>
      </Panel>
    </div>
  );
}

function LiveStep({ c, reload, ok, fail }: { c: Course; reload: () => Promise<void>; ok: (m: string) => void; fail: (e: unknown) => void }) {
  const [f, setF] = useState({ titleEn: '', titleAr: '', scheduledAt: '', durationMin: 60 });
  const add = async (e: FormEvent) => { e.preventDefault(); try { await apiFetch('/admin/live/sessions', { method: 'POST', json: { courseId: c.id, ...f, scheduledAt: new Date(f.scheduledAt).toISOString() } }); setF({ titleEn: '', titleAr: '', scheduledAt: '', durationMin: 60 }); await reload(); ok('Live class scheduled — enrolled students notified'); } catch (err) { fail(err); } };
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <Panel title="Step 6 — Live classes">
        {!c.onlineEnabled && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-warning">Enable online selling in Step 2 before scheduling live classes.</p>}
        {c.liveSessions.length ? <ul className="space-y-2">{c.liveSessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white p-3">
            <div><p className="font-semibold text-brand-900">{s.titleEn}</p><p className="text-xs text-muted">{new Date(s.scheduledAt).toLocaleString('en-GB')} · recording: {s.recordingStatus.toLowerCase()}</p></div>
            <div className="flex items-center gap-2"><StatusPill status={s.status} /><Link href={`/admin/live/${s.id}`} className={s.status === 'LIVE' ? adminBtnDanger : adminBtnOutline}><Radio className="size-4" />{s.status === 'SCHEDULED' ? 'Open class console' : 'Open'}</Link></div>
          </li>))}</ul> : <p className="text-sm text-muted">No live classes yet.</p>}
      </Panel>
      <Panel title="Schedule a live class">
        <form onSubmit={add} className="space-y-3">
          <input required className={adminInput} placeholder="Title (English)" value={f.titleEn} onChange={(e) => setF({ ...f, titleEn: e.target.value })} />
          <input required dir="rtl" className={adminInput} placeholder="العنوان (عربي)" value={f.titleAr} onChange={(e) => setF({ ...f, titleAr: e.target.value })} />
          <input required type="datetime-local" className={adminInput} value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} />
          <label className="block text-xs font-semibold">Duration (minutes)<input type="number" min={10} max={600} className={`${adminInput} mt-1`} value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: Number(e.target.value) })} /></label>
          <button disabled={!c.onlineEnabled} className={`${adminBtn} w-full`}>Schedule & notify students</button>
        </form>
        <p className="mt-2 text-xs text-muted">Price: {c.priceFils ? formatMoney(c.priceFils, c.currency) : 'Free'}</p>
      </Panel>
    </div>
  );
}
