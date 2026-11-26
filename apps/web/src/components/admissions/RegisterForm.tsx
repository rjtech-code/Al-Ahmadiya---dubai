'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { saveDemoSession } from '@/lib/demo-session';
import { Field, FormAlert, Input } from '../forms/Field';
import { Button } from '../ui/Button';

export function RegisterForm() {
  const t = useTranslations('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = fullName.trim();
    const mail = email.trim().toLowerCase();
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError('Enter a valid name and email address for the local demo profile.');
      return;
    }
    saveDemoSession('STUDENT', { fullName: name, email: mail });
    router.push('/portal');
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 text-sm text-muted">
        Student registration in this preview creates a browser-local demo profile. No password or real account is created.
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <Field label={t('fullName')} htmlFor="r-name" required>
        <Input id="r-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
      </Field>
      <Field label={t('email')} htmlFor="r-email" required>
        <Input id="r-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      <Button type="submit" className="w-full">{t('submit')}</Button>
    </form>
  );
}
