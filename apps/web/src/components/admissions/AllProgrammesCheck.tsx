'use client';

import { CheckCircle2, HelpCircle, Plus, Trash2, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Link } from '@/i18n/navigation';
import { apiFetch, ApiError } from '@/lib/client-api';
import { Field, FormAlert, Input, Select } from '../forms/Field';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

interface Row { program: { slug: string; nameEn: string; nameAr: string; degreeLevel: string; college: { nameEn: string; nameAr: string } }; status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NO_RULE'; unmet: { requirement: string; required: number; actual: number | null }[] }

/** "Which programmes can I apply for?" — evaluates the candidate against every programme's rules on the server. */
export function AllProgrammesCheck({ qualifications }: { qualifications: string[] }) {
  const t = useTranslations('eligibility');
  const ta = useTranslations('eligibilityAll');
  const tl = useTranslations('programs.levels');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [qualification, setQualification] = useState('');
  const [overall, setOverall] = useState('');
  const [subjects, setSubjects] = useState<{ subject: string; percent: string }[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState({ eligible: 0, total: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = Number(overall);
    if (!qualification || overall === '' || n < 0 || n > 100) { setError(t('selectQualification')); return; }
    setBusy(true); setError('');
    try {
      const r = await apiFetch<{ data: Row[]; meta: { eligible: number; total: number } }>('/public/admissions/eligibility/all', {
        method: 'POST', auth: false,
        json: { qualification, overallPercent: n, subjects: subjects.filter((s) => s.subject && s.percent !== '').map((s) => ({ subject: s.subject, percent: Number(s.percent) })) },
      });
      setRows(r.data); setMeta(r.meta);
    } catch (err) { setError(err instanceof ApiError && err.status !== 0 ? err.message : tc('networkError')); } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-muted">{ta('body')}</p>
        {error && <FormAlert>{error}</FormAlert>}
        <Field label={t('qualification')} htmlFor="ea-q" required>
          <Select id="ea-q" value={qualification} onChange={(e) => setQualification(e.target.value)}>
            <option value="">{t('selectQualification')}</option>
            {qualifications.map((q) => <option key={q} value={q}>{t(`q.${q}` as 'q.OTHER')}</option>)}
          </Select>
        </Field>
        <Field label={t('overall')} htmlFor="ea-o" required><Input id="ea-o" type="number" min={0} max={100} step="0.01" value={overall} onChange={(e) => setOverall(e.target.value)} /></Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-brand-900">{t('subjects')}</legend>
          <div className="space-y-2">
            {subjects.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input aria-label={t('subject')} placeholder={t('subject')} value={s.subject} onChange={(e) => setSubjects((a) => a.map((x, j) => (j === i ? { ...x, subject: e.target.value } : x)))} />
                <Input aria-label={t('percent')} type="number" min={0} max={100} placeholder="%" value={s.percent} onChange={(e) => setSubjects((a) => a.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)))} className="!w-24" />
                <button type="button" onClick={() => setSubjects((a) => a.filter((_, j) => j !== i))} aria-label={t('remove')} className="grid size-11 shrink-0 place-items-center rounded-xl border border-line text-muted hover:text-danger"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setSubjects((a) => [...a, { subject: '', percent: '' }])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><Plus className="size-4" />{t('addSubject')}</button>
        </fieldset>
        <Button type="submit" variant="brand" disabled={busy}>{busy ? tc('loading') : ta('check')}</Button>
      </form>

      <div aria-live="polite">
        {rows && (
          <>
            <p className="mb-4 font-display text-2xl font-semibold text-brand-900">{ta('results', meta)}</p>
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={r.program.slug} className={cn('glass flex flex-wrap items-start justify-between gap-3 rounded-3xl p-5', r.status === 'ELIGIBLE' && 'ring-2 ring-emerald-200')}>
                  <div>
                    <Link href={`/programs/${r.program.slug}`} className="font-semibold text-brand-900 hover:underline">{locale === 'ar' ? r.program.nameAr : r.program.nameEn}</Link>
                    <p className="text-xs text-muted">{tl(r.program.degreeLevel as 'BACHELOR')} · {locale === 'ar' ? r.program.college.nameAr : r.program.college.nameEn}</p>
                    {r.status === 'NOT_ELIGIBLE' && <ul className="mt-2 list-disc ps-5 text-xs text-muted">{r.unmet.map((u) => <li key={u.requirement}>{u.requirement === 'overall' ? t('unmetOverall', { required: u.required, actual: u.actual ?? 0 }) : t('unmetSubject', { subject: u.requirement, required: u.required })}</li>)}</ul>}
                  </div>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', r.status === 'ELIGIBLE' ? 'bg-emerald-50 text-success' : r.status === 'NOT_ELIGIBLE' ? 'bg-red-50 text-danger' : 'bg-cream-200 text-muted')}>
                    {r.status === 'ELIGIBLE' ? <CheckCircle2 className="size-3.5" /> : r.status === 'NOT_ELIGIBLE' ? <XCircle className="size-3.5" /> : <HelpCircle className="size-3.5" />}
                    {r.status === 'ELIGIBLE' ? ta('eligible') : r.status === 'NOT_ELIGIBLE' ? ta('notEligible') : ta('noRule')}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
