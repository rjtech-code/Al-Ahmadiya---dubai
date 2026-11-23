'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { apiFetch, restoreSession, tokenStore } from './client-api';

export interface SessionUser { id: string; email: string; fullName: string; locale: string; roles: string[]; permissions: string[] }
export type SessionState = { status: 'loading' } | { status: 'anon' } | { status: 'authed'; user: SessionUser };

/**
 * One shared session for the whole page (header, account, forms…), so signing in or out
 * updates every component immediately. Restored once from the httpOnly refresh cookie.
 */
let state: SessionState = { status: 'loading' };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const set = (s: SessionState) => { state = s; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const LOADING: SessionState = { status: 'loading' };

async function fetchSession() {
  try {
    if (!(await restoreSession())) return set({ status: 'anon' });
    const { data } = await apiFetch<{ data: SessionUser }>('/auth/me');
    set({ status: 'authed', user: data });
  } catch {
    set({ status: 'anon' });
  }
}

function ensureLoaded() {
  if (state.status === 'loading' && !inflight) inflight = fetchSession().finally(() => { inflight = null; });
}

export function useSession() {
  const current = useSyncExternalStore(subscribe, () => state, () => LOADING);
  useEffect(() => { ensureLoaded(); }, []);

  const signIn = useCallback((accessToken: string, user: SessionUser) => {
    tokenStore.set(accessToken);
    set({ status: 'authed', user });
  }, []);

  const signOut = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST', auth: false }).catch(() => undefined);
    tokenStore.set(null);
    set({ status: 'anon' });
  }, []);

  const reload = useCallback(() => fetchSession(), []);
  return { state: current, signIn, signOut, reload };
}

/** For flows that obtain a token outside useSession (e.g. registration). */
export function setSessionFromToken(accessToken: string) {
  tokenStore.set(accessToken);
  return fetchSession();
}
