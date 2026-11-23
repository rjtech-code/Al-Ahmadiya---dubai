'use client';

import { CheckCircle2, Info, Plus, Trash2, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Link } from '@/i18n/navigation';
import { apiFetch, ApiError } from '@/lib/client-api';
import { Field, FormAlert, Input, Select } from '../forms/Field';
import { Button, buttonClass } from '../ui/Button';

interface ProgramOption { slug: string; nameEn: string; nameAr: string; eligibilityRules: { qualification: string }[] }
type Result =
  | { status: 'ELIGIBLE' | 'NOT_ELIGIBLE'; unmet: { requirement: string; required: number; actual: number | null }[]; confirmation: string }
  | { status: 'NO_RULE'; confirmation: string };

export function EligibilityForm({ programs, qualifications, initialProgram }: { programs: ProgramOption[]; qualifications: string[]; initialProgram?: string }) {
  const t = useTranslations('eligibility');
  const tc = useTranslations('common');
  const tl = useTranslations('admissions.links');
  const locale = useLocale();
  const [program, setProgram] = useState(programs.some((p) => p.slug === initialProgram) ? initialProgram! : '');
  const [qualification, setQualification] = useState('');
  const [overall, setOverall] = useState('');
  const [subjects, setSubjects] = useState<{ subject: string; percent: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [serverError, setServerError] = useState('');

  const quals = programs.find((p) => p.slug === program)?.eligibilityRules.map((r) => r.qualification) ?? qualifications;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!program) errs.program = t('selectProgram');
    if (!qualification) errs.qualification = t('selectQualification');
    const n = Number(overall);
    if (overall === '' || Number.isNaN(n) || n < 0 || n > 100) errs.overall = '0–100';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setServerError(''); setResult(null);
    try {
      const { data } = await apiFetch<{ data: Result }>('/public/admissions/eligibility', {
        method: 'POST', auth: false,
        json: { programSlug: program, qualification, overallPercent: n, subjects: subjects.filter((s) => s.subject && s.percent !== '').map((s) => ({ subject: s.subject, percent: Number(s.percent) })) },
      });
      setResult(data);
    } catch (err) {
      setServerError(err instanceof ApiError && err.status !== 0 ? err.message : tc('networkError'));
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <form onSubmit={submit} noValidate className="space-y-4" aria-describedby="elig-note">
        {serverError && <FormAlert>{serverError}</FormAlert>}
        <Field label={t('program')} htmlFor="el-program" required error={errors.program}>
          <Select id="el-program" value={program} onChange={(e) => { setProgram(e.target.value); setQualification(''); setResult(null); }} aria-invalid={!!errors.program}>
            <option value="">{t('selectProgram')}</option>
            {programs.map((p) => <option key={p.slug} value={p.slug}>{locale === 'ar' ? p.nameAr : p.nameEn}</option>)}
          </Select>
        </Field>
        <Field label={t('qualification')} htmlFor="el-qual" required error={errors.qualification}>
          <Select id="el-qual" value={qualification} onChange={(e) => { setQualification(e.target.value); setResult(null); }} aria-invalid={!!errors.qualification}>
            <option value="">{t('selectQualification')}</option>
            {quals.map((q) => <option key={q} value={q}>{t(`q.${q}` as 'q.OTHER')}</option>)}
          </Select>
        </Field>
        <Field label={t('overall')} htmlFor="el-overall" required error={errors.overall}>
          <Input id="el-overall" type="number" inputMode="decimal" min={0} max={100} step="0.01" value={overall} onChange={(e) => setOverall(e.target.value)} aria-invalid={!!errors.overall} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-brand-900">{t('subjects')}</legend>
          <div className="space-y-2">
            {subjects.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input aria-label={t('subject')} placeholder={t('subject')} value={s.subject} onChange={(e) => setSubjects((a) => a.map((x, j) => (j === i ? { ...x, subject: e.target.value } : x)))} />
                <Input aria-label={t('percent')} type="number" min={0} max={100} placeholder={t('percent')} value={s.percent} onChange={(e) => setSubjects((a) => a.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)))} className="!w-24" />
                <button type="button" onClick={() => setSubjects((a) => a.filter((_, j) => j !== i))} aria-label={t('remove')} className="grid size-11 shrink-0 place-items-center rounded-md border border-line text-muted hover:text-danger"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
          {subjects.length < 10 && <button type="button" onClick={() => setSubjects((a) => [...a, { subject: '', percent: '' }])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-gold-700"><Plus className="size-4" />{t('addSubject')}</button>}
        </fieldset>
        <Button type="submit" disabled={busy}>{busy ? tc('loading') : t('check')}</Button>
      </form>

      <div aria-live="polite">
        {result && (
          <div className={`rounded-[var(--radius-card)] border p-6 ${result.status === 'ELIGIBLE' ? 'border-emerald-200 bg-emerald-50' : result.status === 'NOT_ELIGIBLE' ? 'border-red-200 bg-red-50' : 'border-gold-200 bg-gold-100/50'}`}>
            {result.status === 'ELIGIBLE' && <><CheckCircle2 className="size-10 text-success" aria-hidden /><h3 className="mt-2 font-display text-xl font-semibold text-brand-900">{t('eligible')}</h3><p className="mt-1 text-sm text-muted">{t('eligibleBody')}</p></>}
            {result.status === 'NOT_ELIGIBLE' && (
              <>
                <XCircle className="size-10 text-danger" aria-hidden />
                <h3 className="mt-2 font-display text-xl font-semibold text-brand-900">{t('notEligible')}</h3>
                <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted">
                  {result.unmet.map((u) => <li key={u.requirement}>{u.requirement === 'overall' ? t('unmetOverall', { required: u.required, actual: u.actual ?? 0 }) : t('unmetSubject', { subject: u.requirement, required: u.required })}</li>)}
                </ul>
              </>
            )}
            {result.status === 'NO_RULE' && <><Info className="size-10 text-gold-700" aria-hidden /><h3 className="mt-2 font-display text-xl font-semibold text-brand-900">{t('noRule')}</h3><p className="mt-1 text-sm text-muted">{t('noRuleBody')}</p></>}
            {result.confirmation !== 'CONFIRMED' && result.status !== 'NO_RULE' && <p className="mt-3 text-xs font-semibold text-warning">{t('unconfirmed')}</p>}
            {result.status === 'ELIGIBLE' && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-brand-900">{t('nextSteps')}</p>
                <div className="mt-2 flex flex-wrap gap-2"><Link href="/register" className={buttonClass('gold', 'sm')}>{tl('register')}</Link><Link href="/admissions/apply" className={buttonClass('outline', 'sm')}>{tl('apply')}</Link></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
