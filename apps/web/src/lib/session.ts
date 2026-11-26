'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { apiFetch, restoreSession, tokenStore } from './client-api';
import { clearDemoSession, DEMO_SESSION_EVENT, readDemoSession, USE_BACKEND } from './demo-session';

export interface SessionUser { id: string; email: string; fullName: string; locale: string; roles: string[]; permissions: string[] }
export type SessionState = { status: 'loading' } | { status: 'anon' } | { status: 'authed'; user: SessionUser };

let state: SessionState = { status: 'loading' };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const set = (s: SessionState) => { state = s; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const LOADING: SessionState = { status: 'loading' };

async function fetchSession() {
  if (!USE_BACKEND) {
    const demo = readDemoSession();
    if (!demo) return set({ status: 'anon' });
    return set({ status: 'authed', user: { id: demo.id, email: demo.email, fullName: demo.fullName, locale: demo.locale, roles: demo.roles, permissions: demo.permissions } });
  }
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
  useEffect(() => {
    ensureLoaded();
    if (USE_BACKEND) return;
    const syncDemoSession = () => { void fetchSession(); };
    window.addEventListener(DEMO_SESSION_EVENT, syncDemoSession);
    window.addEventListener('storage', syncDemoSession);
    return () => {
      window.removeEventListener(DEMO_SESSION_EVENT, syncDemoSession);
      window.removeEventListener('storage', syncDemoSession);
    };
  }, []);

  const signIn = useCallback((accessToken: string, user: SessionUser) => {
    tokenStore.set(accessToken);
    set({ status: 'authed', user });
  }, []);

  const signOut = useCallback(async () => {
    if (!USE_BACKEND) {
      clearDemoSession();
      set({ status: 'anon' });
      return;
    }
    await apiFetch('/auth/logout', { method: 'POST', auth: false }).catch(() => undefined);
    tokenStore.set(null);
    set({ status: 'anon' });
  }, []);

  const reload = useCallback(() => fetchSession(), []);
  return { state: current, signIn, signOut, reload };
}

export function setSessionFromToken(accessToken: string) {
  tokenStore.set(accessToken);
  return fetchSession();
}
