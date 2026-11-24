'use client';

import { Lock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { adminBtn, adminInput, ErrorNote } from '@/components/admin/ui';
import { LogoMark } from '@/components/site/Logo';
import { apiFetch, ApiError, tokenStore } from '@/lib/client-api';

function LoginInner() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await apiFetch<{ data: { accessToken: string } }>('/auth/login', { method: 'POST', auth: false, json: { email, password, audience: 'admin', rememberMe: true } });
      tokenStore.set(data.accessToken);
      router.replace(next && next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : '/admin');
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 0 ? err.message : 'Unable to reach the server.');
    } finally { setBusy(false); }
  };

  return (
    <div className="pattern-girih grid min-h-dvh place-items-center p-4">
      <form onSubmit={submit} className="arch w-full max-w-sm bg-cream-50 px-8 pb-8 pt-16 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center"><LogoMark className="size-14 text-gold-600" /><p className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl font-semibold uppercase text-brand-900">Al Ahmadiya</p><p className="text-xs uppercase tracking-[0.2em] text-muted">Staff administration</p></div>
        <ErrorNote message={error} />
        <label className="mb-1 block text-sm font-medium" htmlFor="ae">Email</label>
        <input id="ae" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${adminInput} mb-3`} />
        <label className="mb-1 block text-sm font-medium" htmlFor="ap">Password</label>
        <input id="ap" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${adminInput} mb-5`} />
        <button type="submit" disabled={busy} className={`${adminBtn} w-full`}><Lock className="size-4" />{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="mt-4 text-center text-[11px] text-muted">Access is restricted to authorised staff. All actions are audited.</p>
      </form>
    </div>
  );
}

export default function AdminLogin() {
  return <Suspense><LoginInner /></Suspense>;
}
