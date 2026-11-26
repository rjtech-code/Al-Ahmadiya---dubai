'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch, tokenStore } from '@/lib/client-api';
import { clearDemoSession, DEMO_SESSION_EVENT, readDemoSession, USE_BACKEND } from '@/lib/demo-session';

export interface AdminUser { id: string; email: string; fullName: string; roles: string[]; permissions: string[] }
interface Ctx { user: AdminUser; can: (p: string) => boolean; signOut: () => Promise<void> }
const AdminCtx = createContext<Ctx | null>(null);
export function useAdmin() {
  const c = useContext(AdminCtx);
  if (!c) throw new Error('useAdmin outside AdminProvider');
  return c;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    const applyDemoRole = () => {
      const demo = readDemoSession();
      if (!demo || demo.role === 'STUDENT') {
        setUser(null);
        router.replace('/');
        return;
      }
      setUser({ id: demo.id, email: demo.email, fullName: demo.fullName, roles: demo.roles, permissions: demo.permissions });
    };
    if (!USE_BACKEND) {
      applyDemoRole();
      window.addEventListener(DEMO_SESSION_EVENT, applyDemoRole);
      window.addEventListener('storage', applyDemoRole);
      return () => {
        cancelled = true;
        window.removeEventListener(DEMO_SESSION_EVENT, applyDemoRole);
        window.removeEventListener('storage', applyDemoRole);
      };
    }
    (async () => {
      try {
        const { data } = await apiFetch<{ data: AdminUser }>('/auth/me');
        if (!data.permissions.length) throw new Error('not staff');
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) router.replace('/');
      }
    })();
    return () => { cancelled = true; };
  }, [router, pathname]);

  if (!user) return <div className="grid min-h-dvh place-items-center text-sm text-muted">Loading local workspace…</div>;
  const signOut = async () => {
    if (!USE_BACKEND) {
      clearDemoSession();
      setUser(null);
      router.replace('/');
      return;
    }
    tokenStore.set(null);
    router.replace('/');
  };
  return <AdminCtx.Provider value={{ user, can: (p) => user.permissions.includes('*') || user.permissions.includes(p), signOut }}>{children}</AdminCtx.Provider>;
}
