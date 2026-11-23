'use client';

import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RecordForm } from '@/components/admin/RecordForm';
import { Stepper } from '@/components/admin/Stepper';
import { adminBtn, adminBtnOutline, adminInput, ErrorNote, PageHeader, Panel, StatusPill } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

const QUALS = ['UAE_SECONDARY_GENERAL', 'UAE_SECONDARY_ADVANCED', 'IGCSE_A_LEVEL', 'IB_DIPLOMA', 'AMERICAN_HIGH_SCHOOL', 'BACHELOR', 'MASTER', 'OTHER'];
interface Rule { qualification: string; minOverallPercent: number | null; subjectMinimums: { subject: string; minPercent: number }[]; englishRequirementEn?: string | null; notesEn?: string | null; isActive: boolean; confirmation: string }
interface Program { id: string; nameEn: string; slug: string; publishStatus: string; confirmation: string; curriculum: { year: number; term: number | null; course: { id: string; code: string; titleEn: string; creditHours: number } }[]; eligibilityRules: (Omit<Rule, 'minOverallPercent'> & { minOverallPercent: string | null })[] }
interface CourseOpt { id: string; code: string; titleEn: string }

export default function ProgramBuilder() {
  const { id: rawId } = useParams<{ id: string }>();
  const router = useRouter();
  const [id, setId] = useState<string | null>(rawId === 'new' ? null : rawId);
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Program | null>(null);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [curr, setCurr] = useState<{ courseId: string; year: number; term: number }[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const apply = useCallback((data: Program) => {
    setP(data);
    setCurr(data.curriculum.map((c) => ({ courseId: c.course.id, year: c.year, term: c.term ?? 1 })));
    setRules(data.eligibilityRules.map((x) => ({ ...x, minOverallPercent: x.minOverallPercent === null ? null : Number(x.minOverallPercent), subjectMinimums: x.subjectMinimums ?? [] })));
  }, []);
  const load = useCallback((pid: string) => apiFetch<{ data: Program }>(`/admin/academics/programs/${pid}`).then((r) => apply(r.data)), [apply]);

  useEffect(() => {
    let c = false;
    if (id) apiFetch<{ data: Program }>(`/admin/academics/programs/${id}`).then((r) => { if (!c) apply(r.data); }).catch((e: unknown) => { if (!c) setError(e instanceof ApiError ? e.message : 'Failed'); });
    apiFetch<{ data: CourseOpt[] }>('/admin/cms/courses?pageSize=100').then((r) => { if (!c) setCourses(r.data); }).catch(() => undefined);
    return () => { c = true; };
  }, [id, apply]);

  const ok = (m: string) => { setSaved(m); setError(''); setTimeout(() => setSaved(''), 6000); };
  const fail = (e: unknown) => setError(e instanceof ApiError ? `${e.message}${Array.isArray(e.body.details) ? ` — ${(e.body.details as { path: string; message: string }[]).map((d) => `${d.path}: ${d.message}`).join('; ')}` : ''}` : 'Failed');

  const saveCurriculum = async () => { try { await apiFetch(`/admin/academics/programs/${id}/curriculum`, { method: 'PUT', json: { items: curr.filter((c) => c.courseId) } }); await load(id!); ok('Curriculum saved'); setStep(2); } catch (e) { fail(e); } };
  const saveRules = async () => { try { await apiFetch(`/admin/academics/programs/${id}/eligibility`, { method: 'PUT', json: { rules } }); await load(id!); ok('Eligibility rules saved'); setStep(3); } catch (e) { fail(e); } };
  const setStatus = async (s: string) => { try { await apiFetch(`/admin/cms/programs/${id}/status`, { method: 'POST', json: { status: s } }); await load(id!); ok(`Programme ${s.toLowerCase()}`); } catch (e) { fail(e); } };

  const steps = ['Details', 'Curriculum', 'Eligibility rules', 'Review & publish'];
  return (
    <>
      <PageHeader title={p ? p.nameEn : 'New programme'} crumbs={[{ label: 'Programmes', href: '/admin/academics' }, { label: p?.nameEn ?? 'New' }]} actions={p && <div className="flex gap-1"><StatusPill status={p.publishStatus} /><StatusPill status={p.confirmation} /></div>} />
      <Stepper steps={steps} current={step} onSelect={setStep} enabled={(i) => i === 0 || !!id} />
      <ErrorNote message={error} />
      {saved && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success">{saved}</p>}

      {step === 0 && <Panel title="Step 1 — Programme details (English & Arabic)"><RecordForm resource="programs" id={id} exclude={['publishStatus']} onSaved={(row) => { if (!id) { setId(row.id); router.replace(`/admin/academics/${row.id}`); } void load(row.id); ok('Details saved'); setStep(1); }} /></Panel>}

      {step === 1 && (
        <Panel title="Step 2 — Curriculum (courses by year and term)">
          <div className="space-y-2">
            {curr.map((c, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_7rem_7rem_auto]">
                <select aria-label="Course" className={adminInput} value={c.courseId} onChange={(e) => setCurr((x) => x.map((y, j) => (j === i ? { ...y, courseId: e.target.value } : y)))}><option value="">Select course…</option>{courses.map((o) => <option key={o.id} value={o.id}>{o.code} — {o.titleEn}</option>)}</select>
                <input aria-label="Year" type="number" min={1} max={8} className={adminInput} value={c.year} onChange={(e) => setCurr((x) => x.map((y, j) => (j === i ? { ...y, year: Number(e.target.value) } : y)))} />
                <input aria-label="Term" type="number" min={1} max={4} className={adminInput} value={c.term} onChange={(e) => setCurr((x) => x.map((y, j) => (j === i ? { ...y, term: Number(e.target.value) } : y)))} />
                <button aria-label="Remove" onClick={() => setCurr((x) => x.filter((_, j) => j !== i))} className="grid size-10 place-items-center rounded-full text-muted hover:text-danger"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setCurr((x) => [...x, { courseId: '', year: x.at(-1)?.year ?? 1, term: 1 }])} className={adminBtnOutline}><Plus className="size-4" />Add course</button>
            <button onClick={() => void saveCurriculum()} className={adminBtn}>Save & continue</button>
          </div>
          <p className="mt-3 text-xs text-muted">Need a new course? Create it under <Link className="underline" href="/admin/courses/new">Online courses → New course</Link>.</p>
        </Panel>
      )}

      {step === 2 && (
        <Panel title="Step 3 — Eligibility rules (evaluated by the backend for every applicant)">
          <div className="space-y-4">
            {rules.map((r, i) => {
              const upd = (patch: Partial<Rule>) => setRules((x) => x.map((y, j) => (j === i ? { ...y, ...patch } : y)));
              return (
                <div key={i} className="rounded-2xl border border-line bg-white p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_10rem_12rem_auto]">
                    <label className="text-xs font-semibold">Qualification<select className={`${adminInput} mt-1`} value={r.qualification} onChange={(e) => upd({ qualification: e.target.value })}>{QUALS.map((q) => <option key={q} value={q}>{q.replace(/_/g, ' ')}</option>)}</select></label>
                    <label className="text-xs font-semibold">Min overall %<input type="number" min={0} max={100} className={`${adminInput} mt-1`} value={r.minOverallPercent ?? ''} onChange={(e) => upd({ minOverallPercent: e.target.value === '' ? null : Number(e.target.value) })} /></label>
                    <label className="text-xs font-semibold">Confirmation<select className={`${adminInput} mt-1`} value={r.confirmation} onChange={(e) => upd({ confirmation: e.target.value })}><option value="CLIENT_CONFIRMATION_REQUIRED">Provisional</option><option value="CONFIRMED">Confirmed</option></select></label>
                    <button aria-label="Remove rule" onClick={() => setRules((x) => x.filter((_, j) => j !== i))} className="mt-5 grid size-10 place-items-center rounded-full text-muted hover:text-danger"><Trash2 className="size-4" /></button>
                  </div>
                  <p className="mb-1 mt-3 text-xs font-semibold">Subject minimums</p>
                  {r.subjectMinimums.map((s, k) => (
                    <div key={k} className="mb-2 grid grid-cols-[1fr_7rem_auto] gap-2">
                      <input aria-label="Subject" className={adminInput} value={s.subject} placeholder="e.g. Mathematics" onChange={(e) => upd({ subjectMinimums: r.subjectMinimums.map((z, m) => (m === k ? { ...z, subject: e.target.value } : z)) })} />
                      <input aria-label="Minimum %" type="number" min={0} max={100} className={adminInput} value={s.minPercent} onChange={(e) => upd({ subjectMinimums: r.subjectMinimums.map((z, m) => (m === k ? { ...z, minPercent: Number(e.target.value) } : z)) })} />
                      <button aria-label="Remove subject" onClick={() => upd({ subjectMinimums: r.subjectMinimums.filter((_, m) => m !== k) })} className="grid size-10 place-items-center rounded-full text-muted hover:text-danger"><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => upd({ subjectMinimums: [...r.subjectMinimums, { subject: '', minPercent: 60 }] })} className="text-xs font-semibold text-brand-700">+ Add subject requirement</button>
                  <label className="mt-3 block text-xs font-semibold">English requirement (shown to applicants)<input className={`${adminInput} mt-1`} value={r.englishRequirementEn ?? ''} onChange={(e) => upd({ englishRequirementEn: e.target.value })} placeholder="e.g. IELTS 6.0" /></label>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setRules((x) => [...x, { qualification: QUALS.find((q) => !x.some((r) => r.qualification === q)) ?? 'OTHER', minOverallPercent: 60, subjectMinimums: [], isActive: true, confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }])} className={adminBtnOutline}><Plus className="size-4" />Add qualification rule</button>
            <button onClick={() => void saveRules()} className={adminBtn}>Save & continue</button>
          </div>
        </Panel>
      )}

      {step === 3 && p && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt>Curriculum</dt><dd className="font-semibold">{p.curriculum.length} courses</dd></div>
              <div className="flex justify-between"><dt>Eligibility rules</dt><dd className="font-semibold">{p.eligibilityRules.length}</dd></div>
              <div className="flex justify-between"><dt>Public page</dt><dd><a className="text-brand-700 underline" href={`/en/programs/${p.slug}`} target="_blank" rel="noreferrer">/programs/{p.slug}</a></dd></div>
            </dl>
            {p.confirmation !== 'CONFIRMED' && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-warning">This programme is not client-confirmed, so it stays hidden from the public site even when published. Mark it CONFIRMED in Step 1 once approved.</p>}
          </Panel>
          <Panel title="Publishing">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void setStatus('PUBLISHED')} className={adminBtn}>Publish</button>
              <button onClick={() => void setStatus('DRAFT')} className={adminBtnOutline}>Move to draft</button>
              <button onClick={() => void setStatus('ARCHIVED')} className={adminBtnOutline}>Archive</button>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
