'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from '@/i18n/navigation';
import { apiFetch, ApiError } from '@/lib/client-api';
import { setSessionFromToken } from '@/lib/session';
import { Field, FormAlert, Input } from '../forms/Field';
import { Button } from '../ui/Button';

export function RegisterForm() {
  const t = useTranslations('register');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const schema = z.object({
    fullName: z.string().trim().min(2, t('errName')).max(150),
    email: z.string().trim().email(t('errEmail')),
    password: z.string().min(10, t('errPassword')).max(128).regex(/[a-z]/, t('errPassword')).regex(/[A-Z]/, t('errPassword')).regex(/\d/, t('errPassword')),
    confirm: z.string(),
  }).refine((v) => v.password === v.confirm, { message: t('errMismatch'), path: ['confirm'] });
  type V = z.infer<typeof schema>;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: V) => {
    setServerError('');
    try {
      const { data } = await apiFetch<{ data: { accessToken: string } }>('/auth/register', { method: 'POST', auth: false, json: { fullName: v.fullName, email: v.email, password: v.password, locale } });
      await setSessionFromToken(data.accessToken);
      router.push('/portal');
    } catch (e) {
      setServerError(e instanceof ApiError && e.status !== 0 ? e.message : tc('networkError'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <FormAlert>{serverError}</FormAlert>}
      <fieldset className="space-y-4">
        <Field label={t('fullName')} htmlFor="r-name" required error={errors.fullName?.message}><Input id="r-name" autoComplete="name" aria-invalid={!!errors.fullName} {...register('fullName')} /></Field>
        <Field label={t('email')} htmlFor="r-email" required error={errors.email?.message}><Input id="r-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} /></Field>
        <Field label={t('password')} htmlFor="r-pass" required hint={t('passwordHint')} error={errors.password?.message}><Input id="r-pass" type="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby="r-pass-hint" {...register('password')} /></Field>
        <Field label={t('confirm')} htmlFor="r-confirm" required error={errors.confirm?.message}><Input id="r-confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register('confirm')} /></Field>
        <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? t('submitting') : t('submit')}</Button>
      </fieldset>
    </form>
  );
}
