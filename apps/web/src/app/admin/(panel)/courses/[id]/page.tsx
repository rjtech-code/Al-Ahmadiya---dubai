'use client';
/* eslint-disable @next/next/no-img-element -- admin previews of uploaded images */

import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ChevronRight, Circle, Eye, FileText, Film, HelpCircle, ImageIcon, Plus, Radio, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { DropZone } from '@/components/admin/DropZone';
import { emptyQ, QuizBuilder, type QuizQ } from '@/components/admin/QuizBuilder';
import { Stepper } from '@/components/admin/Stepper';
import { adminBtn, adminBtnDanger, adminBtnOutline, adminInput, ErrorNote, PageHeader, Panel, StatusPill } from '@/components/admin/ui';
import { cn } from '@/components/ui/cn';
import { apiFetch, ApiError, formatMoney, uploadWithProgress, apiUrl } from '@/lib/client-api';

interface Lesson { id: string; titleEn: string; titleAr: string; descriptionEn: string | null; descriptionAr: string | null; status: string; isPreview: boolean; videoBytes: number | null; topicId: string | null; liveSessionId: string | null }
interface Note { id: string; titleEn: string; titleAr: string; bodyEn: string | null; fileName: string | null; lessonId: string | null }
interface Quiz { id: string; titleEn: string; passPercent: number; questions: QuizQ[]; lessonId: string | null }
interface Topic { id: string; titleEn: string; titleAr: string }
interface Slot { weekday: number; startTime: string; endTime: string }
interface Course {
  id: string; slug: string; code: string; titleEn: string; titleAr: string; descriptionEn: string | null; descriptionAr: string | null; outcomesEn: string[]; outcomesAr: string[];
  creditHours: number; priceFils: number | null; currency: string; imagePath: string | null; departmentId: string; teacherId: string | null; publishStatus: string; isFeatured: boolean;
  deliveryMode: 'RECORDED' | 'LIVE'; liveStartsOn: string | null; liveEndsOn: string | null; liveSlots: Slot[]; topics: Topic[]; lessons: Lesson[]; notes: Note[]; quizzes: Quiz[];
  liveSessions: { id: string; scheduledAt: string; status: string }[]; enrollments: { id: string; status: string }[];
}
interface Options { departments: { id: string; nameEn: string; college: { nameEn: string } }[]; teachers: { id: string; fullName: string; email: string }[] }
type Helpers = { c: Course; reload: () => Promise<void>; ok: (m: string) => void; fail: (e: unknown) => void };

const mb = (b: number | null) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : '');
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STEPS = ['Course details', 'Live classes', 'Topics & lectures', 'Review & publish'];

export default function CourseBuilder() {
  const { id: rawId } = useParams<{ id: string }>();
  const router = useRouter();
  const id = rawId === 'new' ? null : rawId;
  const [step, setStep] = useState(0);
  const [c, setC] = useState<Course | null>(null);
  const [opts, setOpts] = useState<Options | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async (cid: string) => { setC((await apiFetch<{ data: Course }>(`/admin/lms/courses/${cid}`)).data); }, []);
  useEffect(() => {
    let x = false;
    apiFetch<{ data: Options }>('/admin/lms/options').then((r) => { if (!x) setOpts(r.data); }).catch(() => undefined);
    if (id) apiFetch<{ data: Course }>(`/admin/lms/courses/${id}`).then((r) => { if (!x) setC(r.data); }).catch((e: unknown) => { if (!x) setError(e instanceof ApiError ? e.message : 'Failed to load'); });
    return () => { x = true; };
  }, [id]);
  const ok = (m: string) => { setMsg(m); setError(''); setTimeout(() => setMsg(''), 5000); };
  const fail = (e: unknown) => setError(e instanceof ApiError ? `${e.message}${Array.isArray(e.body.details) ? ` — ${(e.body.details as { path: string; message: string }[]).map((d) => d.message).join('; ')}` : ''}` : (e as Error).message);
  const reload = () => (c ? load(c.id) : Promise.resolve());

  return (
    <>
      <PageHeader title={c ? c.titleEn : 'New course'} crumbs={[{ label: 'Online courses', href: '/admin/courses' }, { label: c?.code ?? 'New' }]}
        actions={c && <div className="flex items-center gap-2"><StatusPill status={c.publishStatus} /><a href={`/en/courses/${c.slug}`} target="_blank" rel="noreferrer" className={adminBtnOutline}><Eye className="size-4" />View page</a></div>} />
      <Stepper steps={STEPS} current={step} onSelect={setStep} enabled={(i) => i === 0 || !!c} />
      <ErrorNote message={error} />
      {msg && <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success">{msg}</p>}

      {step === 0 && (opts && (!id || c) ? <DetailsStep c={c} opts={opts} fail={fail} onSaved={async (cid, created) => {
        if (created) router.replace(`/admin/courses/${cid}`);
        await load(cid); ok('Course details saved'); setStep(1);
      }} /> : <p className="text-sm text-muted">Loading…</p>)}
      {step === 1 && c && <LiveStep c={c} reload={reload} ok={(m) => { ok(m); setStep(2); }} fail={fail} />}
      {step === 2 && c && <ContentStep c={c} reload={reload} ok={ok} fail={fail} />}
      {step === 3 && c && <PublishStep c={c} reload={reload} ok={ok} fail={fail} goTo={setStep} />}
      {step === 2 && c && <div className="mt-6 flex justify-end"><button onClick={() => setStep(3)} className={adminBtn}>Next: review & publish</button></div>}
    </>
  );
}

// ───────────── Step 1: details + image ─────────────
function DetailsStep({ c, opts, onSaved, fail }: { c: Course | null; opts: Options; onSaved: (id: string, created: boolean) => Promise<void>; fail: (e: unknown) => void }) {
  const [f, setF] = useState({
    titleEn: c?.titleEn ?? '', titleAr: c?.titleAr ?? '', code: c?.code ?? '', departmentId: c?.departmentId ?? '', teacherId: c?.teacherId ?? '',
    descriptionEn: c?.descriptionEn ?? '', descriptionAr: c?.descriptionAr ?? '', outcomesEn: (c?.outcomesEn ?? []).join('\n'), outcomesAr: (c?.outcomesAr ?? []).join('\n'),
    creditHours: String(c?.creditHours ?? 3), priceAed: c?.priceFils ? String(c.priceFils / 100) : '0',
  });
  const [featured, setFeatured] = useState(c?.isFeatured ?? false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(c?.imagePath ? apiUrl(c.imagePath) : null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const lines = (v: string) => v.split('\n').map((s) => s.trim()).filter(Boolean);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...f, isFeatured: featured, teacherId: f.teacherId || null, outcomesEn: lines(f.outcomesEn), outcomesAr: lines(f.outcomesAr), creditHours: Number(f.creditHours), priceAed: Number(f.priceAed || 0) };
      const saved = c ? (await apiFetch<{ data: { id: string } }>(`/admin/lms/courses/${c.id}/details`, { method: 'PUT', json: body })).data
        : (await apiFetch<{ data: { id: string } }>('/admin/lms/courses', { method: 'POST', json: body })).data;
      if (image) { const fd = new FormData(); fd.append('image', image); await uploadWithProgress(`/admin/lms/courses/${saved.id}/image`, fd, () => undefined); }
      await onSaved(saved.id, !c);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <Panel title="Step 1 — Course details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Course title (English)"><input required minLength={2} className={adminInput} value={f.titleEn} onChange={set('titleEn')} placeholder="e.g. Introduction to Programming" /></Label>
          <Label text="عنوان المقرر (عربي)"><input required minLength={2} dir="rtl" className={adminInput} value={f.titleAr} onChange={set('titleAr')} /></Label>
          <Label text="Course code"><input required className={adminInput} value={f.code} onChange={set('code')} placeholder="CS101" /></Label>
          <Label text="Department">
            <select required className={adminInput} value={f.departmentId} onChange={set('departmentId')}>
              <option value="">Choose…</option>
              {opts.departments.map((d) => <option key={d.id} value={d.id}>{d.nameEn} — {d.college.nameEn}</option>)}
            </select>
          </Label>
          <Label text="Teacher" hint={opts.teachers.length ? 'The teacher sees this course on their dashboard and runs its live classes.' : 'No teacher accounts yet: give a staff user the Teacher role in Staff & users.'}>
            <select className={adminInput} value={f.teacherId} onChange={set('teacherId')}>
              <option value="">Not assigned yet</option>
              {opts.teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName} ({t.email})</option>)}
            </select>
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Label text="Price (AED)" hint="0 = free"><input type="number" min={0} step="0.01" className={adminInput} value={f.priceAed} onChange={set('priceAed')} /></Label>
            <Label text="Credit hours"><input type="number" min={0} max={30} className={adminInput} value={f.creditHours} onChange={set('creditHours')} /></Label>
          </div>
          <Label text="About the course (English)"><textarea rows={4} className={`${adminInput} h-auto py-2`} value={f.descriptionEn} onChange={set('descriptionEn')} /></Label>
          <Label text="نبذة عن المقرر (عربي)"><textarea rows={4} dir="rtl" className={`${adminInput} h-auto py-2`} value={f.descriptionAr} onChange={set('descriptionAr')} /></Label>
          <Label text="What students will learn (English)" hint="One point per line"><textarea rows={4} className={`${adminInput} h-auto py-2`} value={f.outcomesEn} onChange={set('outcomesEn')} /></Label>
          <Label text="ماذا سيتعلم الطالب (عربي)" hint="نقطة في كل سطر"><textarea rows={4} dir="rtl" className={`${adminInput} h-auto py-2`} value={f.outcomesAr} onChange={set('outcomesAr')} /></Label>
        </div>
        <label className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-cream-100 p-3 text-sm font-semibold text-brand-900">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-brand-900" />
          Feature this course on the website
        </label>
        <p className="mt-1 text-xs text-muted">Featured courses appear in the Courses carousel on public pages.</p>
      </Panel>
      <div className="space-y-4">
        <Panel title="Course image">
          <DropZone accept="image/jpeg,image/png,image/webp" label={preview ? 'Drop a new image to replace' : 'Drag an image here or click to choose'} hint="JPG, PNG or WebP · up to 8 MB · landscape works best"
            onFile={(file) => { setImage(file); setPreview(URL.createObjectURL(file)); }}>
            {preview ? <img src={preview} alt="" className="mb-2 aspect-video w-full rounded-xl object-cover" /> : <ImageIcon className="size-8 text-gold-600" aria-hidden />}
          </DropZone>
          {image && <p className="mt-2 text-xs text-muted">{image.name} will be uploaded when you save.</p>}
        </Panel>
        <button disabled={busy} className={`${adminBtn} w-full`}>{busy ? 'Saving…' : c ? 'Save & continue' : 'Create course & continue'}</button>
      </div>
    </form>
  );
}

// ───────────── Step 2: weekly live timetable ─────────────
function LiveStep({ c, reload, ok, fail }: Helpers) {
  const [enabled, setEnabled] = useState(c.deliveryMode === 'LIVE');
  const [startsOn, setStartsOn] = useState(c.liveStartsOn?.slice(0, 10) ?? '');
  const [endsOn, setEndsOn] = useState(c.liveEndsOn?.slice(0, 10) ?? '');
  const [days, setDays] = useState(() => DAYS.map((_, i) => {
    const s = c.liveSlots.find((x) => x.weekday === i + 1);
    return { on: !!s, start: s?.startTime ?? '18:00', end: s?.endTime ?? '19:00' };
  }));
  const [busy, setBusy] = useState(false);
  const setDay = (i: number, patch: Partial<(typeof days)[number]>) => setDays(days.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch(`/admin/lms/courses/${c.id}/live-plan`, {
        method: 'PUT',
        json: { enabled, startsOn: startsOn || null, endsOn: endsOn || null, slots: days.flatMap((d, i) => (d.on ? [{ weekday: i + 1, startTime: d.start, endTime: d.end }] : [])) },
      });
      await reload();
      ok(enabled ? 'Timetable saved. Classes are created automatically and everyone is notified at class time.' : 'Saved: recorded lectures only, no live classes.');
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save}>
      <Panel title="Step 2 — Will this course have live classes?">
        <div className="grid gap-3 sm:grid-cols-2">
          {[{ v: false, t: 'No — recorded lectures only', d: 'Students watch videos at their own pace.' }, { v: true, t: 'Yes — regular live classes', d: 'Classes run every week on the days and times you set below.' }].map((o) => (
            <button type="button" key={String(o.v)} onClick={() => setEnabled(o.v)} aria-pressed={enabled === o.v}
              className={cn('rounded-2xl border-2 p-4 text-start transition', enabled === o.v ? 'border-brand-900 bg-brand-50' : 'border-line bg-white hover:border-gold-400')}>
              <span className="flex items-center gap-2 font-semibold text-brand-900">{enabled === o.v ? <CheckCircle2 className="size-5 text-brand-900" /> : <Circle className="size-5 text-muted" />}{o.t}</span>
              <span className="mt-1 block text-sm text-muted">{o.d}</span>
            </button>
          ))}
        </div>

        {enabled && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
              <Label text="Classes start on"><input type="date" required className={adminInput} value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></Label>
              <Label text="Classes end on"><input type="date" required min={startsOn} className={adminInput} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} /></Label>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              <table className="w-full text-sm">
                <thead className="bg-cream-200/60 text-xs uppercase text-brand-800"><tr><th className="px-4 py-2 text-start">Day</th><th className="px-4 py-2 text-start">Class</th><th className="px-4 py-2 text-start">From</th><th className="px-4 py-2 text-start">To</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {DAYS.map((d, i) => (
                    <tr key={d} className={cn(!days[i].on && 'text-muted')}>
                      <td className="px-4 py-2 font-semibold">{d}</td>
                      <td className="px-4 py-2"><label className="inline-flex items-center gap-2"><input type="checkbox" className="size-4" checked={days[i].on} onChange={(e) => setDay(i, { on: e.target.checked })} />{days[i].on ? 'Class' : 'No class'}</label></td>
                      <td className="px-4 py-2"><input type="time" disabled={!days[i].on} className={`${adminInput} max-w-36`} value={days[i].start} onChange={(e) => setDay(i, { start: e.target.value })} /></td>
                      <td className="px-4 py-2"><input type="time" disabled={!days[i].on} className={`${adminInput} max-w-36`} value={days[i].end} onChange={(e) => setDay(i, { end: e.target.value })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-1 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
              <li>• Times are Dubai time.</li>
              <li>• At each class time the class opens by itself, and every enrolled student and the teacher get a notification.</li>
              <li>• The teacher joins from their dashboard; students join from theirs. Attendance is taken automatically.</li>
            </ul>
          </div>
        )}
        <div className="mt-6 flex justify-end"><button disabled={busy} className={adminBtn}>{busy ? 'Saving…' : 'Save & continue'}</button></div>
      </Panel>
    </form>
  );
}

// ───────────── Step 3: topics → lectures → notes / quiz ─────────────
function ContentStep(h: Helpers) {
  const { c, reload, ok, fail } = h;
  const [topic, setTopic] = useState({ en: '', ar: '' });
  const addTopic = async (e: FormEvent) => {
    e.preventDefault();
    try { await apiFetch(`/admin/lms/courses/${c.id}/topics`, { method: 'POST', json: { titleEn: topic.en, titleAr: topic.ar } }); setTopic({ en: '', ar: '' }); await reload(); ok('Topic added'); } catch (err) { fail(err); }
  };
  const moveTopic = async (i: number, d: -1 | 1) => {
    const ids = c.topics.map((t) => t.id); const j = i + d; if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await apiFetch(`/admin/lms/courses/${c.id}/topics/reorder`, { method: 'POST', json: { ids } }); await reload(); } catch (err) { fail(err); }
  };
  const loose = c.lessons.filter((l) => !l.topicId || !c.topics.some((t) => t.id === l.topicId));

  return (
    <div className="space-y-4">
      <Panel title="Step 3 — Topics & lectures">
        <p className="mb-4 text-sm text-muted">Add a topic (for example “Week 1: Getting started”), then add lecture videos inside it. Each lecture can have its own notes and quiz.</p>
        <form onSubmit={addTopic} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input required className={adminInput} placeholder="New topic title (English)" value={topic.en} onChange={(e) => setTopic({ ...topic, en: e.target.value })} />
          <input required dir="rtl" className={adminInput} placeholder="عنوان الموضوع (عربي)" value={topic.ar} onChange={(e) => setTopic({ ...topic, ar: e.target.value })} />
          <button className={adminBtn}><Plus className="size-4" />Add topic</button>
        </form>
      </Panel>
      {c.topics.map((t, i) => <TopicCard key={t.id} h={h} topic={t} index={i} count={c.topics.length} move={moveTopic} lessons={c.lessons.filter((l) => l.topicId === t.id)} />)}
      {loose.length > 0 && <TopicCard h={h} topic={null} index={-1} count={0} move={moveTopic} lessons={loose} />}
      {!c.topics.length && !loose.length && <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">No topics yet. Add the first topic above.</p>}
    </div>
  );
}

function TopicCard({ h, topic, index, count, move, lessons }: { h: Helpers; topic: Topic | null; index: number; count: number; move: (i: number, d: -1 | 1) => Promise<void>; lessons: Lesson[] }) {
  const { c, reload, ok, fail } = h;
  const [adding, setAdding] = useState(false);
  const del = async () => {
    if (!topic || !window.confirm(`Delete topic "${topic.titleEn}"?`)) return;
    try { await apiFetch(`/admin/lms/topics/${topic.id}`, { method: 'DELETE' }); await reload(); ok('Topic deleted'); } catch (err) { fail(err); }
  };
  const rename = async () => {
    if (!topic) return;
    const en = window.prompt('Topic title (English)', topic.titleEn); if (en === null) return;
    const ar = window.prompt('عنوان الموضوع (عربي)', topic.titleAr); if (ar === null) return;
    try { await apiFetch(`/admin/lms/topics/${topic.id}`, { method: 'PUT', json: { titleEn: en, titleAr: ar } }); await reload(); } catch (err) { fail(err); }
  };
  return (
    <section className="rounded-[1.5rem] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <span className="grid size-8 place-items-center rounded-full bg-gold-400 text-sm font-bold text-brand-950">{topic ? index + 1 : '–'}</span>
        <div className="min-w-0 flex-1"><p className="font-semibold text-brand-900">{topic ? topic.titleEn : 'Lectures without a topic'}</p>{topic && <p className="text-xs text-muted" dir="rtl">{topic.titleAr}</p>}</div>
        <span className="text-xs text-muted">{lessons.length} lecture{lessons.length === 1 ? '' : 's'}</span>
        {topic && (
          <div className="flex items-center gap-1">
            <IconBtn label="Move topic up" onClick={() => void move(index, -1)} disabled={index === 0}><ArrowUp className="size-4" /></IconBtn>
            <IconBtn label="Move topic down" onClick={() => void move(index, 1)} disabled={index === count - 1}><ArrowDown className="size-4" /></IconBtn>
            <button onClick={() => void rename()} className="rounded-full px-2 text-xs font-semibold text-brand-700 hover:underline">Rename</button>
            <IconBtn label="Delete topic" onClick={() => void del()}><Trash2 className="size-4" /></IconBtn>
          </div>
        )}
      </header>
      <div className="space-y-2 p-4">
        {lessons.map((l, i) => <LectureRow key={l.id} h={h} lesson={l} number={i + 1} siblings={lessons} />)}
        {topic && (adding ? <AddLecture c={c} topicId={topic.id} done={async (msg) => { setAdding(false); if (msg) { await reload(); ok(msg); } }} fail={fail} />
          : <button onClick={() => setAdding(true)} className={adminBtnOutline}><Film className="size-4" />Add lecture video</button>)}
      </div>
    </section>
  );
}

function AddLecture({ c, topicId, done, fail }: { c: Course; topicId: string; done: (msg?: string) => Promise<void>; fail: (e: unknown) => void }) {
  const [f, setF] = useState({ titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '' });
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    Object.entries({ ...f, topicId, status: 'PUBLISHED' }).forEach(([k, v]) => fd.append(k, v));
    fd.append('video', file);
    try { setPct(0); await uploadWithProgress(`/admin/lms/courses/${c.id}/lessons`, fd, setPct); await done('Lecture uploaded'); } catch (err) { fail(err); } finally { setPct(null); }
  };
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-gold-300 bg-white p-4 lg:grid-cols-[18rem_1fr]">
      <DropZone accept="video/mp4,video/webm,video/quicktime" onFile={setFile} label={file ? file.name : 'Drag the lecture video here'} hint={file ? mb(file.size) : 'MP4, WebM or MOV'} disabled={pct !== null}>
        <Film className="size-7 text-gold-600" aria-hidden />
      </DropZone>
      <div className="grid gap-2 sm:grid-cols-2">
        <input required className={adminInput} placeholder="Lecture title (English)" value={f.titleEn} onChange={(e) => setF({ ...f, titleEn: e.target.value })} />
        <input required dir="rtl" className={adminInput} placeholder="عنوان المحاضرة (عربي)" value={f.titleAr} onChange={(e) => setF({ ...f, titleAr: e.target.value })} />
        <textarea rows={2} className={`${adminInput} h-auto py-2`} placeholder="Short description (English, optional)" value={f.descriptionEn} onChange={(e) => setF({ ...f, descriptionEn: e.target.value })} />
        <textarea rows={2} dir="rtl" className={`${adminInput} h-auto py-2`} placeholder="وصف قصير (اختياري)" value={f.descriptionAr} onChange={(e) => setF({ ...f, descriptionAr: e.target.value })} />
        {pct !== null && <div className="h-2 overflow-hidden rounded-full bg-cream-200 sm:col-span-2"><div className="h-full bg-brand-900 transition-all" style={{ width: `${pct}%` }} /></div>}
        <div className="flex gap-2 sm:col-span-2">
          <button disabled={!file || pct !== null} className={adminBtn}>{pct !== null ? `Uploading ${pct}%` : 'Upload lecture'}</button>
          <button type="button" disabled={pct !== null} onClick={() => void done()} className={adminBtnOutline}>Cancel</button>
        </div>
      </div>
    </form>
  );
}

function LectureRow({ h, lesson: l, number, siblings }: { h: Helpers; lesson: Lesson; number: number; siblings: Lesson[] }) {
  const { c, reload, ok, fail } = h;
  const [open, setOpen] = useState<'notes' | 'quiz' | 'video' | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const notes = c.notes.filter((n) => n.lessonId === l.id);
  const quizzes = c.quizzes.filter((q) => q.lessonId === l.id);
  const put = (patch: Partial<Lesson>) => apiFetch(`/admin/lms/lessons/${l.id}`, { method: 'PUT', json: { titleEn: l.titleEn, titleAr: l.titleAr, descriptionEn: l.descriptionEn, descriptionAr: l.descriptionAr, isPreview: l.isPreview, status: l.status, topicId: l.topicId, ...patch } });
  const move = async (d: -1 | 1) => {
    const all = c.lessons.map((x) => x.id); const ids = siblings.map((x) => x.id); const i = ids.indexOf(l.id); const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const order = [...all.filter((x) => !ids.includes(x)), ...ids];
    try { await apiFetch(`/admin/lms/courses/${c.id}/lessons/reorder`, { method: 'POST', json: { ids: order } }); await reload(); } catch (err) { fail(err); }
  };
  const del = async () => { if (!window.confirm(`Delete lecture "${l.titleEn}" and its video?`)) return; try { await apiFetch(`/admin/lms/lessons/${l.id}`, { method: 'DELETE' }); await reload(); ok('Lecture deleted'); } catch (err) { fail(err); } };
  const watch = async () => { if (open === 'video') return setOpen(null); try { setVideo(apiUrl((await apiFetch<{ data: { url: string } }>(`/admin/lms/lessons/${l.id}/preview`)).data.url)); setOpen('video'); } catch (err) { fail(err); } };

  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <span className="grid size-7 place-items-center rounded-full bg-brand-900 text-xs font-semibold text-white">{number}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-900">{l.titleEn}{l.liveSessionId && <span className="ms-2 text-xs text-danger">● class recording</span>}</p>
          <p className="text-xs text-muted">{mb(l.videoBytes)} · {notes.length} note{notes.length === 1 ? '' : 's'} · {quizzes.length} quiz{quizzes.length === 1 ? '' : 'zes'}</p>
        </div>
        {l.status !== 'PUBLISHED' && <StatusPill status={l.status} />}
        {!l.topicId && c.topics.length > 0 && (
          <select aria-label="Move to topic" className={`${adminInput} h-8 max-w-44 text-xs`} defaultValue="" onChange={async (e) => { try { await put({ topicId: e.target.value }); await reload(); } catch (err) { fail(err); } }}>
            <option value="" disabled>Move to topic…</option>{c.topics.map((t) => <option key={t.id} value={t.id}>{t.titleEn}</option>)}
          </select>
        )}
        <div className="flex flex-wrap items-center gap-1">
          <Tab active={open === 'video'} onClick={() => void watch()}><Eye className="size-3.5" />Watch</Tab>
          <Tab active={open === 'notes'} onClick={() => setOpen(open === 'notes' ? null : 'notes')}><FileText className="size-3.5" />Notes</Tab>
          <Tab active={open === 'quiz'} onClick={() => setOpen(open === 'quiz' ? null : 'quiz')}><HelpCircle className="size-3.5" />Quiz</Tab>
          <IconBtn label="Move up" onClick={() => void move(-1)}><ArrowUp className="size-4" /></IconBtn>
          <IconBtn label="Move down" onClick={() => void move(1)}><ArrowDown className="size-4" /></IconBtn>
          <IconBtn label="Delete lecture" onClick={() => void del()}><Trash2 className="size-4" /></IconBtn>
        </div>
      </div>
      {open === 'video' && video && <video src={video} controls className="aspect-video w-full bg-black" />}
      {open === 'notes' && <LectureNotes c={c} lesson={l} notes={notes} reload={reload} ok={ok} fail={fail} />}
      {open === 'quiz' && <LectureQuiz c={c} lesson={l} quizzes={quizzes} reload={reload} ok={ok} fail={fail} />}
    </div>
  );
}

function LectureNotes({ c, lesson, notes, reload, ok, fail }: Helpers & { lesson: Lesson; notes: Note[] }) {
  const [f, setF] = useState({ bodyEn: '', bodyAr: '' });
  const [file, setFile] = useState<File | null>(null);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('titleEn', `Notes: ${lesson.titleEn}`); fd.append('titleAr', `ملاحظات: ${lesson.titleAr}`); fd.append('lessonId', lesson.id);
    if (f.bodyEn) fd.append('bodyEn', f.bodyEn);
    if (f.bodyAr) fd.append('bodyAr', f.bodyAr);
    if (file) fd.append('file', file);
    try { await uploadWithProgress(`/admin/lms/courses/${c.id}/notes`, fd, () => undefined); setF({ bodyEn: '', bodyAr: '' }); setFile(null); await reload(); ok('Notes added'); } catch (err) { fail(err); }
  };
  return (
    <div className="border-t border-line bg-cream-50/60 p-4">
      {notes.map((n) => (
        <p key={n.id} className="mb-2 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
          <span><FileText className="me-1 inline size-4 text-gold-600" />{n.fileName ? `PDF: ${n.fileName}` : 'Text notes'}{n.bodyEn ? ' + text' : ''}</span>
          <button onClick={async () => { try { await apiFetch(`/admin/lms/notes/${n.id}`, { method: 'DELETE' }); await reload(); } catch (err) { fail(err); } }} className="text-muted hover:text-danger" aria-label="Delete notes"><Trash2 className="size-4" /></button>
        </p>
      ))}
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[14rem_1fr]">
        <DropZone accept="application/pdf" onFile={setFile} label={file ? file.name : 'PDF notes (optional)'} hint="Drag a PDF here" />
        <div className="grid gap-2">
          <textarea rows={3} className={`${adminInput} h-auto py-2`} placeholder="Or write the notes here (English)" value={f.bodyEn} onChange={(e) => setF({ ...f, bodyEn: e.target.value })} />
          <textarea rows={2} dir="rtl" className={`${adminInput} h-auto py-2`} placeholder="الملاحظات (عربي، اختياري)" value={f.bodyAr} onChange={(e) => setF({ ...f, bodyAr: e.target.value })} />
          <button disabled={!file && !f.bodyEn && !f.bodyAr} className={`${adminBtn} justify-self-start`}><Plus className="size-4" />Add notes</button>
        </div>
      </form>
    </div>
  );
}

function LectureQuiz({ c, lesson, quizzes, reload, ok, fail }: Helpers & { lesson: Lesson; quizzes: Quiz[] }) {
  const [qs, setQs] = useState<QuizQ[]>([emptyQ()]);
  const [pass, setPass] = useState(60);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    try { await apiFetch(`/admin/lms/courses/${c.id}/quizzes`, { method: 'POST', json: { titleEn: `Quiz: ${lesson.titleEn}`, titleAr: `اختبار: ${lesson.titleAr}`, lessonId: lesson.id, passPercent: pass, questions: qs } }); setQs([emptyQ()]); await reload(); ok('Quiz saved'); } catch (err) { fail(err); }
  };
  return (
    <div className="border-t border-line bg-cream-50/60 p-4">
      {quizzes.map((q) => (
        <p key={q.id} className="mb-2 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
          <span><HelpCircle className="me-1 inline size-4 text-gold-600" />{q.questions.length} question{q.questions.length === 1 ? '' : 's'} · pass mark {q.passPercent}%</span>
          <button onClick={async () => { if (!window.confirm('Delete this quiz?')) return; try { await apiFetch(`/admin/lms/quizzes/${q.id}`, { method: 'DELETE' }); await reload(); } catch (err) { fail(err); } }} className="text-muted hover:text-danger" aria-label="Delete quiz"><Trash2 className="size-4" /></button>
        </p>
      ))}
      <form onSubmit={add} className="space-y-3">
        <QuizBuilder questions={qs} onChange={setQs} />
        <div className="flex items-end gap-3">
          <label className="text-xs font-semibold">Pass mark %<input type="number" min={0} max={100} className={`${adminInput} mt-1 w-28`} value={pass} onChange={(e) => setPass(Number(e.target.value))} /></label>
          <button disabled={!qs.length} className={adminBtn}>Save quiz</button>
        </div>
      </form>
    </div>
  );
}

// ───────────── Step 4: review & publish ─────────────
function PublishStep({ c, reload, ok, fail, goTo }: Helpers & { goTo: (s: number) => void }) {
  const [busy, setBusy] = useState(false);
  const published = c.publishStatus === 'PUBLISHED';
  const checks = [
    { done: !!c.titleEn && !!c.descriptionEn, label: 'Title and description', step: 0 },
    { done: !!c.imagePath, label: 'Course image', step: 0 },
    { done: !!c.teacherId, label: 'Teacher assigned', step: 0 },
    { done: c.deliveryMode === 'RECORDED' || c.liveSlots.length > 0, label: c.deliveryMode === 'LIVE' ? `Live timetable (${c.liveSlots.length} day${c.liveSlots.length === 1 ? '' : 's'} a week)` : 'Recorded course (no live classes)', step: 1 },
    { done: c.lessons.length > 0 || c.liveSlots.length > 0, label: `${c.topics.length} topics · ${c.lessons.length} lectures · ${c.notes.length} notes · ${c.quizzes.length} quizzes`, step: 2 },
  ];
  const toggle = async () => {
    setBusy(true);
    try { await apiFetch(`/admin/lms/courses/${c.id}/publish`, { method: 'POST', json: { publish: !published } }); await reload(); ok(published ? 'Course hidden from the website' : 'Course published — it is now on the website and students can join'); } catch (err) { fail(err); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <Panel title="Step 4 — Review & publish">
        <ul className="space-y-2">
          {checks.map((k) => (
            <li key={k.label} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
              <span className="flex items-center gap-2">{k.done ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-warning" />}{k.label}</span>
              <button onClick={() => goTo(k.step)} className="text-xs font-semibold text-brand-700 hover:underline">Edit</button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">Price: <strong className="text-brand-900">{c.priceFils ? formatMoney(c.priceFils, c.currency) : 'Free'}</strong></p>
      </Panel>
      <Panel title={published ? 'Course is live' : 'Ready?'}>
        <p className="text-sm text-muted">{published ? 'Students can find and join this course on the website.' : 'Publishing puts the course on the website with a join form. Live classes from the timetable start appearing for enrolled students.'}</p>
        <button disabled={busy} onClick={() => void toggle()} className={`${published ? adminBtnDanger : adminBtn} mt-4 w-full`}>{busy ? 'Saving…' : published ? 'Unpublish' : 'Publish course'}</button>
        <div className="mt-4 grid gap-2">
          <Link href={`/admin/teach/${c.id}`} className={adminBtnOutline}><Users className="size-4" />Students & progress ({c.enrollments.filter((e) => e.status === 'ACTIVE').length})</Link>
          {c.deliveryMode === 'LIVE' && <Link href={`/admin/teach`} className={adminBtnOutline}><Radio className="size-4" />Upcoming live classes</Link>}
        </div>
      </Panel>
    </div>
  );
}

// ───────────── small pieces ─────────────
function Label({ text, hint, children }: { text: string; hint?: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-brand-900">{text}<div className="mt-1">{children}</div>{hint && <span className="mt-1 block font-normal text-muted">{hint}</span>}</label>;
}
function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid size-8 place-items-center rounded-full text-muted hover:bg-cream-200 hover:text-brand-900 disabled:opacity-30">{children}</button>;
}
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold', active ? 'bg-brand-900 text-white' : 'bg-cream-200 text-brand-900 hover:bg-cream-300')}>{children}{active ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}</button>;
}
