'use client';

import { Check, CheckCircle2, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useCheckout, type Checkout } from '@/lib/checkout';
import { apiFetch, ApiError, formatMoney } from '@/lib/client-api';
import { useSession } from '@/lib/session';
import { Field, FormAlert, Input, Select } from '../forms/Field';
import { Button, buttonClass } from '../ui/Button';
import { cn } from '../ui/cn';

type Json = Record<string, unknown>;
interface Doc { id: string; docType: string; originalName: string; sizeBytes: number; status: string }
interface Application {
  id: string; reference: string; status: string; currentStep: number; programId: string | null;
  personal: Json | null; contact: Json | null; academic: Json | null; program?: { slug: string; nameEn: string; nameAr: string } | null; documents: Doc[];
}
interface ProgramOption { slug: string; nameEn: string; nameAr: string }

const DOC_TYPES = ['passport', 'emirates-id', 'transcript', 'certificate', 'photo', 'other'] as const;
const EDITABLE = ['DRAFT', 'RETURNED_FOR_CORRECTION'];

export function ApplicationWizard({ open, programs, qualifications, initialProgram }: { open: boolean; programs: ProgramOption[]; qualifications: string[]; initialProgram?: string }) {
  const preselect = initialProgram && programs.some((p) => p.slug === initialProgram) ? initialProgram : '';
  const t = useTranslations('apply');
  const tc = useTranslations('common');
  const tq = useTranslations('eligibility.q');
  const ta = useTranslations('admissions');
  const ts = useTranslations('status.statuses');
  const locale = useLocale();
  const { state } = useSession();
  const [app, setApp] = useState<Application | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<number, Json>>({ 4: { programSlug: preselect } });
  const [feeFils, setFeeFils] = useState<number | null>(null);
  const router = useRouter();
  useEffect(() => { if (state.status === 'anon') router.replace(`/login?next=${encodeURIComponent(preselect ? `/admissions/apply?program=${preselect}` : '/admissions/apply')}`); }, [state.status, router, preselect]);

  const errMsg = (e: unknown) => (e instanceof ApiError && e.status !== 0 ? e.message : tc('networkError'));

  const hydrate = useCallback((a: Application) => {
    setApp(a);
    setForm({ 1: a.personal ?? {}, 2: a.contact ?? {}, 3: a.academic ?? {}, 4: { programSlug: a.program?.slug ?? preselect } });
    setStep(EDITABLE.includes(a.status) ? Math.min(Math.max(a.currentStep, 1), 7) : 8);
  }, [preselect]);

  useEffect(() => {
    if (state.status !== 'authed') return;
    let cancelled = false;
    apiFetch<{ data: Application[]; meta: { applicationFeeFils: number | null } }>('/applications/mine')
      .then(({ data, meta }) => {
        if (cancelled) return;
        setFeeFils(meta.applicationFeeFils);
        const current = data.find((a) => EDITABLE.includes(a.status)) ?? data[0];
        if (current) hydrate(current);
      })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof ApiError && e.status !== 0 ? e.message : tc('networkError')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [state.status, hydrate, tc]);


  if (state.status === 'loading' || (state.status === 'authed' && loading)) return <p className="flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin" />{tc('loading')}</p>;
  if (state.status === 'anon') {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-white p-6 text-center">
        <p className="text-brand-900">{t('loginRedirect')}</p>
        <div className="mt-4 flex justify-center gap-2"><Link href="/login" className={buttonClass('gold')}>{tc('continue')}</Link><Link href="/register" className={buttonClass('outline')}>{t('steps.1')}</Link></div>
      </div>
    );
  }

  const start = async () => {
    setBusy(true); setError('');
    try { const { data } = await apiFetch<{ data: Application }>('/applications', { method: 'POST' }); hydrate({ ...data, documents: [] }); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  if (!app) {
    return (
      <div className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}
        {!open ? <FormAlert tone="info"><strong>{ta('closedTitle')}.</strong> {ta('closedBody')}</FormAlert> : <Button onClick={start} disabled={busy}>{busy ? tc('loading') : tc('continue')}</Button>}
      </div>
    );
  }

  const set = (s: number, k: string, v: unknown) => setForm((f) => ({ ...f, [s]: { ...f[s], [k]: v } }));
  const val = (s: number, k: string) => (form[s]?.[k] ?? '') as string;

  const saveStep = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({});
    try {
      const body = { ...form[step] };
      if (step === 3 && !Array.isArray(body.subjects)) body.subjects = [];
      const { data } = await apiFetch<{ data: Application }>(`/applications/${app.id}/steps/${step}`, { method: 'PUT', json: body });
      setApp((a) => (a ? { ...a, ...data, documents: a.documents } : a));
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.body.details)) {
        setFieldErrors(Object.fromEntries((err.body.details as { path: string; message: string }[]).map((d) => [d.path, d.message])));
      }
      setError(errMsg(err));
    } finally { setBusy(false); }
  };

  const steps = [1, 2, 3, 4, 5, 6, 7, 8];
  const text = (s: number, k: string, label: string, opts: { required?: boolean; type?: string; ltr?: boolean; placeholder?: string; autoComplete?: string } = {}) => (
    <Field label={label} htmlFor={`a-${k}`} required={opts.required} error={fieldErrors[k]}>
      <Input id={`a-${k}`} type={opts.type ?? 'text'} value={val(s, k)} onChange={(e) => set(s, k, opts.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} required={opts.required} dir={opts.ltr ? 'ltr' : undefined} placeholder={opts.placeholder} autoComplete={opts.autoComplete} aria-invalid={!!fieldErrors[k]} />
    </Field>
  );

  const stepForm = (children: ReactNode) => (
    <form onSubmit={saveStep} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      <div className="flex justify-between gap-3 border-t border-line pt-5">
        <Button type="button" variant="outline" disabled={step === 1 || busy} onClick={() => setStep(step - 1)}>{tc('back')}</Button>
        <Button type="submit" disabled={busy}>{busy ? tc('loading') : t('saveContinue')}</Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <ol className="flex items-center gap-1 overflow-x-auto pb-1" aria-label={t('title')}>
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-1">
            <button
              type="button"
              disabled={!EDITABLE.includes(app.status) || s > Math.max(app.currentStep, step) || s === 8}
              onClick={() => setStep(s)}
              aria-current={step === s ? 'step' : undefined}
              className="flex flex-col items-center gap-1 disabled:cursor-default"
            >
              <span className={cn('grid size-8 place-items-center rounded-full border-2 text-xs font-bold', step === s ? 'border-brand-900 bg-brand-900 text-white' : s < step || (s < app.currentStep) ? 'border-gold-500 bg-gold-500 text-brand-950' : 'border-line bg-white text-muted')}>
                {s < step ? <Check className="size-4" /> : s}
              </span>
              <span className="whitespace-nowrap text-[11px] font-medium text-brand-900">{t(`steps.${s}` as 'steps.1')}</span>
            </button>
            {i < steps.length - 1 && <span aria-hidden className={cn('mb-5 h-0.5 min-w-3 flex-1', s < step ? 'bg-gold-500' : 'bg-line')} />}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-cream-200 px-4 py-2 text-sm">
        <span>{t('reference')}: <strong dir="ltr">{app.reference}</strong></span>
        {app.status === 'RETURNED_FOR_CORRECTION' && <span className="font-semibold text-warning">{ts(app.status as 'DRAFT')}</span>}
      </div>

      {error && <FormAlert>{error}</FormAlert>}

      <div className="rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="mb-5 font-display text-xl font-semibold text-brand-900">{t(`steps.${step}` as 'steps.1')}</h2>

        {step === 1 && stepForm(<>
            {text(1, 'firstName', t('firstName'), { required: true, autoComplete: 'given-name' })}
            {text(1, 'lastName', t('lastName'), { required: true, autoComplete: 'family-name' })}
            {text(1, 'firstNameAr', t('firstNameAr'))}
            {text(1, 'lastNameAr', t('lastNameAr'))}
            {text(1, 'dateOfBirth', t('dob'), { required: true, type: 'date', autoComplete: 'bday' })}
            <Field label={t('gender')} htmlFor="a-gender" required error={fieldErrors.gender}>
              <Select id="a-gender" value={val(1, 'gender')} onChange={(e) => set(1, 'gender', e.target.value)} aria-invalid={!!fieldErrors.gender}><option value="" /><option value="male">{t('male')}</option><option value="female">{t('female')}</option></Select>
            </Field>
            {text(1, 'nationality', t('nationality'), { required: true, autoComplete: 'country-name' })}
            {text(1, 'emiratesId', t('emiratesId'), { ltr: true, placeholder: '784-XXXX-XXXXXXX-X' })}
            {text(1, 'passportNumber', t('passport'), { ltr: true })}
          </>)}

        {step === 2 && stepForm(<>
            {text(2, 'phone', t('phone'), { required: true, type: 'tel', ltr: true, autoComplete: 'tel' })}
            {text(2, 'addressLine', t('address'), { required: true, autoComplete: 'street-address' })}
            {text(2, 'city', t('city'), { required: true, autoComplete: 'address-level2' })}
            {text(2, 'country', t('country'), { required: true, autoComplete: 'country-name' })}
            {text(2, 'guardianName', t('guardianName'))}
            {text(2, 'guardianPhone', t('guardianPhone'), { type: 'tel', ltr: true })}
          </>)}

        {step === 3 && stepForm(<>
            <Field label={t('qualification')} htmlFor="a-qualification" required error={fieldErrors.qualification}>
              <Select id="a-qualification" value={val(3, 'qualification')} onChange={(e) => set(3, 'qualification', e.target.value)} aria-invalid={!!fieldErrors.qualification}>
                <option value="" />{qualifications.map((q) => <option key={q} value={q}>{tq(q as 'OTHER')}</option>)}
              </Select>
            </Field>
            {text(3, 'institution', t('institution'), { required: true })}
            {text(3, 'graduationYear', t('gradYear'), { required: true, type: 'number' })}
            {text(3, 'overallPercent', t('overall'), { required: true, type: 'number' })}
          </>)}

        {step === 4 && stepForm(<>
            <Field label={t('program')} htmlFor="a-program" required error={fieldErrors.programSlug} className="sm:col-span-2">
              <Select id="a-program" value={val(4, 'programSlug')} onChange={(e) => set(4, 'programSlug', e.target.value)} aria-invalid={!!fieldErrors.programSlug}>
                <option value="" />{programs.map((p) => <option key={p.slug} value={p.slug}>{locale === 'ar' ? p.nameAr : p.nameEn}</option>)}
              </Select>
            </Field>
          </>)}

        {step === 5 && <Documents app={app} onChange={(documents) => setApp({ ...app, documents })} onNext={() => setStep(6)} onBack={() => setStep(4)} />}

        {step === 6 && <Review form={form} programs={programs} documents={app.documents.length} onBack={() => setStep(5)} onNext={() => setStep(7)} />}

        {step === 7 && <PaymentStep app={app} feeFils={feeFils} onBack={() => setStep(6)} onSubmitted={() => { setApp({ ...app, status: 'SUBMITTED' }); setStep(8); }} />}

        {step === 8 && (
          <div className="flex flex-col items-center py-6 text-center">
            {EDITABLE.includes(app.status) ? <FormAlert tone="info">{t('notEditable')}</FormAlert> : (
              <>
                <CheckCircle2 className="size-14 text-success" aria-hidden />
                <h3 className="mt-3 font-display text-2xl font-semibold text-brand-900">{t('submittedTitle')}</h3>
                <p className="mt-2 text-lg font-semibold" dir="ltr">{app.reference}</p>
                <p className="mt-2 max-w-md text-sm text-muted">{t('submittedBody')}</p>
                <Link href={`/admissions/status?reference=${app.reference}`} className={buttonClass('gold', 'md', 'mt-5')}>{t('trackLink')}</Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

}

function Documents({ app, onChange, onNext, onBack }: { app: Application; onChange: (d: Doc[]) => void; onNext: () => void; onBack: () => void }) {
  const t = useTranslations('apply');
  const tc = useTranslations('common');
  const [docType, setDocType] = useState<string>('passport');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError(t('docHint')); return; }
    setBusy(true); setError('');
    const fd = new FormData();
    fd.append('docType', docType);
    fd.append('file', file);
    try {
      const { data } = await apiFetch<{ data: Doc }>(`/applications/${app.id}/documents`, { method: 'POST', body: fd });
      onChange([...app.documents, data]);
      setFile(null);
      (e.target as HTMLFormElement).reset();
    } catch (err) { setError(err instanceof ApiError && err.status !== 0 ? err.message : tc('networkError')); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    try { await apiFetch(`/applications/${app.id}/documents/${id}`, { method: 'DELETE' }); onChange(app.documents.filter((d) => d.id !== id)); }
    catch (err) { setError(err instanceof ApiError ? err.message : tc('networkError')); }
  };

  return (
    <div className="space-y-5">
      {error && <FormAlert>{error}</FormAlert>}
      <form onSubmit={upload} className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
        <Field label={t('docType')} htmlFor="d-type"><Select id="d-type" value={docType} onChange={(e) => setDocType(e.target.value)}>{DOC_TYPES.map((d) => <option key={d} value={d}>{t(`docTypes.${d}`)}</option>)}</Select></Field>
        <Field label={t('chooseFile')} htmlFor="d-file" hint={t('docHint')}><Input id="d-file" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="py-2" /></Field>
        <Button type="submit" variant="brand" disabled={!file || busy}><Upload className="size-4" />{busy ? t('uploading') : t('upload')}</Button>
      </form>
      {app.documents.length ? (
        <ul className="divide-y divide-line rounded-md border border-line">
          {app.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-gold-600" aria-hidden /><span className="truncate">{d.originalName}</span><span className="shrink-0 text-xs text-muted">· {t(`docTypes.${d.docType as 'passport'}`)} · {(d.sizeBytes / 1024).toFixed(0)} KB</span></span>
              <button type="button" onClick={() => void remove(d.id)} aria-label={`${tc('close')} ${d.originalName}`} className="text-muted hover:text-danger"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">{t('noDocs')}</p>}
      <div className="flex justify-between gap-3 border-t border-line pt-5">
        <Button type="button" variant="outline" onClick={onBack}>{tc('back')}</Button>
        <Button type="button" onClick={onNext} disabled={!app.documents.length}>{tc('continue')}</Button>
      </div>
    </div>
  );
}

function Review({ form, programs, documents, onBack, onNext }: { form: Record<number, Json>; programs: ProgramOption[]; documents: number; onBack: () => void; onNext: () => void }) {
  const t = useTranslations('apply');
  const tc = useTranslations('common');
  const tq = useTranslations('eligibility.q');
  const locale = useLocale();
  const program = programs.find((p) => p.slug === form[4]?.programSlug);
  const rows: [string, unknown][] = [
    [t('firstName'), form[1]?.firstName], [t('lastName'), form[1]?.lastName], [t('dob'), form[1]?.dateOfBirth], [t('nationality'), form[1]?.nationality],
    [t('phone'), form[2]?.phone], [t('city'), form[2]?.city], [t('country'), form[2]?.country],
    [t('qualification'), form[3]?.qualification ? tq(String(form[3].qualification) as 'OTHER') : ''], [t('institution'), form[3]?.institution], [t('overall'), form[3]?.overallPercent],
    [t('program'), program ? (locale === 'ar' ? program.nameAr : program.nameEn) : ''], [t('steps.5'), documents],
  ];
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-semibold text-brand-900">{t('reviewTitle')}</h3>
        <p className="mt-1 text-sm text-muted">{t('reviewNote')}</p>
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(([k, v]) => <div key={k} className="border-b border-line pb-2"><dt className="text-xs text-muted">{k}</dt><dd className="text-sm font-medium text-brand-900">{v === undefined || v === '' ? '—' : String(v)}</dd></div>)}
      </dl>
      <div className="flex justify-between gap-3 border-t border-line pt-5">
        <Button type="button" variant="outline" onClick={onBack}>{tc('back')}</Button>
        <Button type="button" variant="brand" onClick={onNext}>{tc('continue')}</Button>
      </div>
    </div>
  );
}

/** Last step: pay the application fee (Razorpay); the application is submitted once the server verifies the payment. */
function PaymentStep({ app, feeFils, onBack, onSubmitted }: { app: Application; feeFils: number | null; onBack: () => void; onSubmitted: () => void }) {
  const t = useTranslations('apply');
  const tc = useTranslations('common');
  const tk = useTranslations('checkout');
  const locale = useLocale();
  const { pay, dialog } = useCheckout();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const go = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await apiFetch<{ data: { completed: true } | { completed: false; checkout: Checkout } }>(`/payments/application/${app.id}`, { method: 'POST' });
      if (!data.completed) await pay(data.checkout);
      onSubmitted();
    } catch (e) {
      if (e instanceof ApiError && e.body.code === 'INCOMPLETE') setError(t('missing', { items: ((e.body.details as { missing?: string[] })?.missing ?? []).join(', ') }));
      else if (e instanceof ApiError) setError(e.body.code === 'PAYMENTS_NOT_CONFIGURED' ? tk('notConfigured') : e.message);
      else if ((e as Error).message !== 'cancelled') setError(tk('failed'));
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-cream-200/70 p-6 text-center">
        <p className="text-sm text-muted">{t('payTitle')}</p>
        <p className="mt-1 font-display text-5xl font-semibold text-brand-900">{feeFils === null ? '—' : feeFils === 0 ? '0' : formatMoney(feeFils, 'AED', locale)}</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">{feeFils === null ? t('feeTba') : t('payBody')}</p>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <div className="flex justify-between gap-3 border-t border-line pt-5">
        <Button type="button" variant="outline" onClick={onBack}>{tc('back')}</Button>
        <Button type="button" variant="brand" onClick={() => void go()} disabled={busy || feeFils === null}>{busy ? t('submitting') : feeFils === 0 ? t('submitFree') : t('payAndSubmit')}</Button>
      </div>
      {dialog}
    </div>
  );
}
