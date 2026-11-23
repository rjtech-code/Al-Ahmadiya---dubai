'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, ApiError } from '@/lib/client-api';
import { Button } from '../ui/Button';
import { Field, FormAlert, Input, Textarea } from './Field';

export function ContactForm() {
  const t = useTranslations('contact');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');
  const schema = z.object({
    fullName: z.string().trim().min(2, t('errName')).max(150),
    email: z.string().trim().email(t('errEmail')),
    phone: z.string().trim().max(40).regex(/^[+\d\s()-]*$/).optional().or(z.literal('')),
    subject: z.string().trim().max(200).optional(),
    message: z.string().trim().min(10, t('errMessage')).max(5000),
    website: z.string().max(0).optional(),
  });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Values) => {
    setServerError('');
    try {
      await apiFetch('/public/contact', { method: 'POST', auth: false, json: { ...v, phone: v.phone || undefined, subject: v.subject || undefined, website: undefined, locale } });
      setDone(true);
      reset();
    } catch (e) {
      setServerError(e instanceof ApiError && e.status === 0 ? tc('networkError') : e instanceof ApiError ? e.message : tc('genericError'));
    }
  };

  if (done) return <FormAlert tone="success"><span className="flex items-center gap-2"><CheckCircle2 className="size-5" />{t('success')}</span></FormAlert>;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      {serverError && <div className="sm:col-span-2"><FormAlert>{serverError}</FormAlert></div>}
      <Field label={t('fullName')} htmlFor="c-name" required error={errors.fullName?.message}>
        <Input id="c-name" autoComplete="name" aria-invalid={!!errors.fullName} {...register('fullName')} />
      </Field>
      <Field label={t('emailField')} htmlFor="c-email" required error={errors.email?.message}>
        <Input id="c-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
      </Field>
      <Field label={t('phoneField')} htmlFor="c-phone" error={errors.phone ? t('errMessage') : undefined}>
        <Input id="c-phone" type="tel" autoComplete="tel" dir="ltr" {...register('phone')} />
      </Field>
      <Field label={t('subject')} htmlFor="c-subject">
        <Input id="c-subject" {...register('subject')} />
      </Field>
      <Field label={t('message')} htmlFor="c-message" required error={errors.message?.message} className="sm:col-span-2">
        <Textarea id="c-message" aria-invalid={!!errors.message} {...register('message')} />
      </Field>
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...register('website')} />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('sending') : t('send')}</Button>
      </div>
    </form>
  );
}
