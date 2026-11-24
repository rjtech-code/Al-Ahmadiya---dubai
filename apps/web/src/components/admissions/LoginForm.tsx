'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { apiFetch, ApiError } from '@/lib/client-api';
import { useSession, type SessionUser } from '@/lib/session';
import { Field, FormAlert, Input } from '../forms/Field';
import { Button, buttonClass } from '../ui/Button';

export function LoginForm() {
  const t = useTranslations('login');
  const tc = useTranslations('common');
  const { state, signIn, signOut } = useSession();
  const router = useRouter();
  const nextParam = useSearchParams().get('next');
  // Only allow local, non-admin paths (prevents open redirects).
  const next = nextParam && /^\/(?!\/)/.test(nextParam) && !nextParam.startsWith('/admin') ? nextParam : '/portal';
  useEffect(() => { if (state.status === 'authed') router.replace(next); }, [state.status, next, router]);
  const [mode, setMode] = useState<'login' | 'forgot' | 'forgot-done'>('login');
  const [serverError, setServerError] = useState('');
  const schema = z.object({ email: z.string().trim().email(), password: z.string().min(1), rememberMe: z.boolean() });
  type V = z.infer<typeof schema>;
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(schema), defaultValues: { rememberMe: false } });
  const [forgotBusy, setForgotBusy] = useState(false);

  if (state.status === 'authed') {
    return (
      <div className="space-y-4">
        <FormAlert tone="success"><span className="flex items-center gap-2"><CheckCircle2 className="size-5" />{t('signedIn', { name: state.user.fullName })}</span></FormAlert>
        <div className="flex flex-wrap gap-2"><Link href="/admissions/apply" className={buttonClass('gold')}>{t('goToApplication')}</Link><Button variant="outline" onClick={() => void signOut()}>{t('signOut')}</Button></div>
      </div>
    );
  }

  const onSubmit = async (v: V) => {
    setServerError('');
    try {
      const { data } = await apiFetch<{ data: { accessToken: string; user: SessionUser } }>('/auth/login', { method: 'POST', auth: false, json: { ...v, audience: 'portal' } });
      signIn(data.accessToken, data.user);
    } catch (e) {
      setServerError(e instanceof ApiError && e.status !== 0 ? e.message : tc('networkError'));
    }
  };

  const sendReset = async () => {
    const email = getValues('email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')) { setServerError(tc('genericError')); return; }
    setForgotBusy(true); setServerError('');
    try { await apiFetch('/auth/forgot-password', { method: 'POST', auth: false, json: { email } }); setMode('forgot-done'); }
    catch (e) { setServerError(e instanceof ApiError && e.status !== 0 ? e.message : tc('networkError')); }
    finally { setForgotBusy(false); }
  };

  if (mode !== 'login') {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-xl font-semibold text-brand-900">{t('forgotTitle')}</h3>
        {mode === 'forgot-done' ? <FormAlert tone="success">{t('forgotDone')}</FormAlert> : (
          <>
            <p className="text-sm text-muted">{t('forgotBody')}</p>
            {serverError && <FormAlert>{serverError}</FormAlert>}
            <Field label={t('email')} htmlFor="f-email" required><Input id="f-email" type="email" autoComplete="email" {...register('email')} /></Field>
            <Button onClick={sendReset} disabled={forgotBusy}>{forgotBusy ? tc('loading') : t('sendLink')}</Button>
          </>
        )}
        <button type="button" onClick={() => { setMode('login'); setServerError(''); }} className="block text-sm font-semibold text-brand-700 hover:underline">{t('backToLogin')}</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" aria-busy={state.status === 'loading'}>
      {serverError && <FormAlert>{serverError}</FormAlert>}
      <Field label={t('email')} htmlFor="l-email" required error={errors.email ? tc('genericError') : undefined}><Input id="l-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} /></Field>
      <Field label={t('password')} htmlFor="l-pass" required error={errors.password ? tc('required') : undefined}><Input id="l-pass" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} /></Field>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--color-brand-900)]" {...register('rememberMe')} />{t('remember')}</label>
        <button type="button" onClick={() => setMode('forgot')} className="font-semibold text-brand-700 hover:underline">{t('forgot')}</button>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? t('submitting') : t('submit')}</Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations('login');
  const tr = useTranslations('register');
  const tc = useTranslations('common');
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');
  const schema = z.object({
    password: z.string().min(10, tr('errPassword')).regex(/[a-z]/, tr('errPassword')).regex(/[A-Z]/, tr('errPassword')).regex(/\d/, tr('errPassword')),
    confirm: z.string(),
  }).refine((v) => v.password === v.confirm, { message: tr('errMismatch'), path: ['confirm'] });
  type V = z.infer<typeof schema>;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(schema) });
  const onSubmit = async (v: V) => {
    setServerError('');
    try { await apiFetch('/auth/reset-password', { method: 'POST', auth: false, json: { token, password: v.password } }); setDone(true); }
    catch (e) { setServerError(e instanceof ApiError && e.status !== 0 ? e.message : tc('networkError')); }
  };
  if (done) return <div className="space-y-4"><FormAlert tone="success">{t('resetDone')}</FormAlert><Link href="/login" className={buttonClass('gold')}>{t('submit')}</Link></div>;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <FormAlert>{serverError}</FormAlert>}
      <Field label={tr('password')} htmlFor="rp-pass" required hint={tr('passwordHint')} error={errors.password?.message}><Input id="rp-pass" type="password" autoComplete="new-password" {...register('password')} /></Field>
      <Field label={tr('confirm')} htmlFor="rp-confirm" required error={errors.confirm?.message}><Input id="rp-confirm" type="password" autoComplete="new-password" {...register('confirm')} /></Field>
      <Button type="submit" disabled={isSubmitting}>{t('resetSubmit')}</Button>
    </form>
  );
}
