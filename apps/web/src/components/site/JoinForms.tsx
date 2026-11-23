'use client';

import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { apiFetch, ApiError } from '@/lib/client-api';
import { setSessionFromToken, useSession, type SessionUser } from '@/lib/session';
import { Field, FormAlert, Input, Textarea } from '../forms/Field';
import { Button, ButtonLink } from '../ui/Button';
import { cn } from '../ui/cn';

const PASSWORD_OK = (p: string) => p.length >= 10 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);

/**
 * Inline "create account / sign in" form used on course and programme pages,
 * so a visitor can join without leaving the page. Calls `onAuthed` once signed in.
 */
export function AuthInline({ onAuthed, submitRegister, submitLogin, idPrefix }: {
  onAuthed: () => void | Promise<void>; submitRegister: string; submitLogin: string; idPrefix: string;
}) {
  const t = useTranslations('join');
  const tr = useTranslations('register');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { signIn } = useSession();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [v, setV] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (mode === 'register' && v.fullName.trim().length < 2) errs.fullName = tr('errName');
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) errs.email = tr('errEmail');
    if (mode === 'register' ? !PASSWORD_OK(v.password) : !v.password) errs.password = tr('errPassword');
    setErrors(errs); setServerError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      if (mode === 'register') {
        const { data } = await apiFetch<{ data: { accessToken: string } }>('/auth/register', { method: 'POST', auth: false, json: { fullName: v.fullName.trim(), email: v.email.trim(), password: v.password, locale } });
        await setSessionFromToken(data.accessToken);
      } else {
        const { data } = await apiFetch<{ data: { accessToken: string; user: SessionUser } }>('/auth/login', { method: 'POST', auth: false, json: { email: v.email.trim(), password: v.password, audience: 'portal' } });
        signIn(data.accessToken, data.user);
      }
      await onAuthed();
    } catch (err) {
      setServerError(err instanceof ApiError && err.status !== 0 ? err.message : tc('networkError'));
    } finally { setBusy(false); }
  };

  const tab = (m: 'register' | 'login', label: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErrors({}); setServerError(''); }}
      className={cn('flex-1 rounded-full px-3 py-2 text-sm font-semibold transition', mode === m ? 'bg-brand-900 text-white shadow' : 'text-brand-900 hover:bg-white/60')}>
      {label}
    </button>
  );

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-3">
      <div role="tablist" className="flex gap-1 rounded-full bg-cream-200 p-1">{tab('register', t('tabRegister'))}{tab('login', t('tabLogin'))}</div>
      {serverError && <FormAlert>{serverError}</FormAlert>}
      {mode === 'register' && (
        <Field label={tr('fullName')} htmlFor={`${idPrefix}-name`} required error={errors.fullName}>
          <Input id={`${idPrefix}-name`} autoComplete="name" value={v.fullName} onChange={set('fullName')} aria-invalid={!!errors.fullName} />
        </Field>
      )}
      <Field label={tr('email')} htmlFor={`${idPrefix}-email`} required error={errors.email}>
        <Input id={`${idPrefix}-email`} type="email" autoComplete="email" value={v.email} onChange={set('email')} aria-invalid={!!errors.email} />
      </Field>
      <Field label={tr('password')} htmlFor={`${idPrefix}-pass`} required hint={mode === 'register' ? tr('passwordHint') : undefined} error={errors.password}>
        <Input id={`${idPrefix}-pass`} type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={v.password} onChange={set('password')} aria-invalid={!!errors.password} />
      </Field>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />}{mode === 'register' ? submitRegister : submitLogin}
      </Button>
      <p className="flex items-center gap-1.5 text-xs text-muted"><ShieldCheck className="size-3.5 text-gold-600" aria-hidden />{t('privacy')}</p>
    </form>
  );
}

/** Programme page: start an application (admissions open) or register interest (closed). */
export function ProgramJoin({ slug, name, admissionsOpen }: { slug: string; name: string; admissionsOpen: boolean }) {
  const t = useTranslations('join');
  return (
    <aside className="glass rounded-[2rem] p-6" aria-labelledby="join-h">
      <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">{name}</p>
      <h2 id="join-h" className="mt-1 font-display text-2xl font-semibold text-brand-900">{t('programTitle')}</h2>
      {admissionsOpen ? <ApplyStart slug={slug} /> : <InterestForm subject={`Programme interest: ${name}`} intro={t('interestIntro')} />}
    </aside>
  );
}

function ApplyStart({ slug }: { slug: string }) {
  const t = useTranslations('join');
  const router = useRouter();
  const { state } = useSession();
  const href = `/admissions/apply?program=${encodeURIComponent(slug)}`;
  if (state.status === 'loading') return <p className="mt-4 flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" /></p>;
  if (state.status === 'authed') {
    return (
      <>
        <p className="mt-3 text-sm text-muted">{t('programOpenAuthed')}</p>
        <ButtonLink href={href} className="mt-5 w-full">{t('startApplication')}</ButtonLink>
      </>
    );
  }
  return (
    <>
      <p className="mb-4 mt-3 text-sm text-muted">{t('programOpenIntro')}</p>
      <AuthInline idPrefix="pj" submitRegister={t('registerAndApply')} submitLogin={t('loginAndApply')} onAuthed={() => router.push(href)} />
    </>
  );
}

/** Interest / enquiry form, stored as a contact message for the admissions team. */
export function InterestForm({ subject, intro }: { subject: string; intro: string }) {
  const t = useTranslations('join');
  const tr = useTranslations('register');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { state } = useSession();
  const user = state.status === 'authed' ? state.user : null;
  const [v, setV] = useState({ fullName: '', email: '', phone: '', note: '', website: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const fullName = v.fullName || user?.fullName || '';
  const email = v.email || user?.email || '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 2) errs.fullName = tr('errName');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = tr('errEmail');
    if (v.phone && !/^[+\d\s()-]{6,40}$/.test(v.phone.trim())) errs.phone = t('errPhone');
    setErrors(errs); setServerError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const message = `${subject}.${v.note.trim() ? `\n\n${v.note.trim()}` : ''}`;
      await apiFetch('/public/contact', { method: 'POST', auth: false, json: { fullName: fullName.trim(), email: email.trim(), phone: v.phone.trim() || undefined, subject, message, locale, website: v.website } });
      setDone(true);
    } catch (err) {
      setServerError(err instanceof ApiError && err.status !== 0 ? err.message : tc('networkError'));
    } finally { setBusy(false); }
  };

  if (done) return <p role="status" className="mt-4 flex items-start gap-2 rounded-2xl bg-success/10 p-4 text-sm font-medium text-success"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />{t('interestDone')}</p>;
  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="mt-3 space-y-3">
      <p className="text-sm text-muted">{intro}</p>
      {serverError && <FormAlert>{serverError}</FormAlert>}
      <Field label={tr('fullName')} htmlFor="if-name" required error={errors.fullName}><Input id="if-name" autoComplete="name" value={fullName} onChange={set('fullName')} aria-invalid={!!errors.fullName} /></Field>
      <Field label={tr('email')} htmlFor="if-email" required error={errors.email}><Input id="if-email" type="email" autoComplete="email" value={email} onChange={set('email')} aria-invalid={!!errors.email} /></Field>
      <Field label={t('phone')} htmlFor="if-phone" error={errors.phone}><Input id="if-phone" type="tel" dir="ltr" autoComplete="tel" value={v.phone} onChange={set('phone')} aria-invalid={!!errors.phone} /></Field>
      <Field label={t('note')} htmlFor="if-note"><Textarea id="if-note" rows={3} maxLength={2000} value={v.note} onChange={set('note')} /></Field>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={v.website} onChange={set('website')} />
      <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}{t('submitInterest')}</Button>
    </form>
  );
}
