'use client';

import { CheckCircle2, HelpCircle, Plus, Trash2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { adminBtn, adminInput, ErrorNote, PageHeader, Panel } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

const QUALS = ['UAE_SECONDARY_GENERAL', 'UAE_SECONDARY_ADVANCED', 'IGCSE_A_LEVEL', 'IB_DIPLOMA', 'AMERICAN_HIGH_SCHOOL', 'BACHELOR', 'MASTER', 'OTHER'];
interface R { program: { id: string; nameEn: string; degreeLevel: string; publishStatus: string; college: { nameEn: string } }; status: string; unmet: { requirement: string; required: number; actual: number | null }[]; ruleConfirmation?: string }

/** Staff tool: enter a candidate's qualification and marks → which programmes they can join (includes drafts). */
export default function EligibilityChecker() {
  const [q, setQ] = useState('UAE_SECONDARY_ADVANCED');
  const [overall, setOverall] = useState('');
  const [subjects, setSubjects] = useState<{ subject: string; percent: string }[]>([]);
  const [res, setRes] = useState<R[] | null>(null);
  const [error, setError] = useState('');
  const run = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    try { setRes((await apiFetch<{ data: R[] }>('/admin/academics/eligibility-check', { method: 'POST', json: { qualification: q, overallPercent: Number(overall), subjects: subjects.filter((s) => s.subject).map((s) => ({ subject: s.subject, percent: Number(s.percent) })) } })).data); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Failed'); }
  };
  return (
    <>
      <PageHeader title="Eligibility checker" crumbs={[{ label: 'Programmes', href: '/admin/academics' }, { label: 'Eligibility checker' }]} description="Check which programmes a candidate qualifies for, using the same rules the public site and the application form use. Includes draft programmes." />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <Panel title="Candidate">
          <form onSubmit={run} className="space-y-3">
            <label className="block text-xs font-semibold">Qualification<select className={`${adminInput} mt-1`} value={q} onChange={(e) => setQ(e.target.value)}>{QUALS.map((x) => <option key={x} value={x}>{x.replace(/_/g, ' ')}</option>)}</select></label>
            <label className="block text-xs font-semibold">Overall %<input required type="number" min={0} max={100} step="0.01" className={`${adminInput} mt-1`} value={overall} onChange={(e) => setOverall(e.target.value)} /></label>
            {subjects.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_auto] gap-2">
                <input aria-label="Subject" className={adminInput} placeholder="Subject" value={s.subject} onChange={(e) => setSubjects((a) => a.map((x, j) => (j === i ? { ...x, subject: e.target.value } : x)))} />
                <input aria-label="%" type="number" className={adminInput} placeholder="%" value={s.percent} onChange={(e) => setSubjects((a) => a.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)))} />
                <button type="button" aria-label="Remove" onClick={() => setSubjects((a) => a.filter((_, j) => j !== i))} className="text-muted hover:text-danger"><Trash2 className="size-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setSubjects((a) => [...a, { subject: '', percent: '' }])} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"><Plus className="size-3.5" />Add subject mark</button>
            <button className={`${adminBtn} w-full`}>Check all programmes</button>
          </form>
        </Panel>
        <div>
          <ErrorNote message={error} />
          {res && (
            <ul className="space-y-2">
              {res.map((r) => (
                <li key={r.program.id} className="flex flex-wrap items-start justify-between gap-3 rounded-[1.25rem] border border-brand-900/[0.07] bg-white p-4 shadow-[0_1px_2px_rgb(11_58_60/0.04),0_10px_30px_-18px_rgb(11_58_60/0.25)]">
                  <div>
                    <Link href={`/admin/academics/${r.program.id}`} className="font-semibold text-brand-900 hover:underline">{r.program.nameEn}</Link>
                    <p className="text-xs text-muted">{r.program.degreeLevel} · {r.program.college.nameEn} · {r.program.publishStatus}{r.ruleConfirmation === 'CLIENT_CONFIRMATION_REQUIRED' ? ' · provisional rule' : ''}</p>
                    {r.unmet.length > 0 && <ul className="mt-1 list-disc ps-5 text-xs text-muted">{r.unmet.map((u) => <li key={u.requirement}>{u.requirement}: needs {u.required}%, has {u.actual ?? 'none'}</li>)}</ul>}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${r.status === 'ELIGIBLE' ? 'bg-emerald-50 text-success' : r.status === 'NOT_ELIGIBLE' ? 'bg-red-50 text-danger' : 'bg-cream-200 text-muted'}`}>
                    {r.status === 'ELIGIBLE' ? <CheckCircle2 className="size-3.5" /> : r.status === 'NOT_ELIGIBLE' ? <XCircle className="size-3.5" /> : <HelpCircle className="size-3.5" />}{r.status.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
