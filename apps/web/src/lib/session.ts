'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { clearDemoSession, DEMO_SESSION_EVENT, readDemoSession } from './demo-session';

export interface SessionUser { id: string; email: string; fullName: string; locale: string; roles: string[]; permissions: string[] }
export type SessionState = { status: 'loading' } | { status: 'anon' } | { status: 'authed'; user: SessionUser };

let state: SessionState = { status: 'loading' };
const listeners = new Set<() => void>();
const set = (s: SessionState) => { state = s; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const LOADING: SessionState = { status: 'loading' };

function readLocalSession() {
  const demo = readDemoSession();
  if (!demo) { set({ status: 'anon' }); return; }
  set({ status: 'authed', user: { id: demo.id, email: demo.email, fullName: demo.fullName, locale: demo.locale, roles: demo.roles, permissions: demo.permissions } });
}

export function useSession() {
  const current = useSyncExternalStore(subscribe, () => state, () => LOADING);
  useEffect(() => {
    readLocalSession();
    window.addEventListener(DEMO_SESSION_EVENT, readLocalSession);
    window.addEventListener('storage', readLocalSession);
    return () => {
      window.removeEventListener(DEMO_SESSION_EVENT, readLocalSession);
      window.removeEventListener('storage', readLocalSession);
    };
  }, []);

  const signIn = useCallback((_accessToken: string, user: SessionUser) => {
    set({ status: 'authed', user });
  }, []);
  const signOut = useCallback(async () => {
    clearDemoSession();
    set({ status: 'anon' });
  }, []);
  const reload = useCallback(async () => { readLocalSession(); }, []);
  return { state: current, signIn, signOut, reload };
}

export async function setSessionFromToken(_accessToken: string) {
  readLocalSession();
}
