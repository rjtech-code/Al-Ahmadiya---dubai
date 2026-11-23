'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch, restoreSession, tokenStore } from '@/lib/client-api';

export interface AdminUser { id: string; email: string; fullName: string; roles: string[]; permissions: string[] }
interface Ctx { user: AdminUser; can: (p: string) => boolean; signOut: () => Promise<void> }
const AdminCtx = createContext<Ctx | null>(null);

export function useAdmin() {
  const c = useContext(AdminCtx);
  if (!c) throw new Error('useAdmin outside AdminProvider');
  return c;
}

/** Restores the staff session (refresh cookie) and gates the panel. Server-side RBAC remains authoritative. */
export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!(await restoreSession())) throw new Error('anon');
        const { data } = await apiFetch<{ data: AdminUser }>('/auth/me');
        if (!data.permissions.length) throw new Error('not staff');
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      }
    })();
    return () => { cancelled = true; };
  }, [router, pathname]);

  if (!user) return <div className="grid min-h-dvh place-items-center text-sm text-muted">Loading…</div>;
  const signOut = async () => {
    await apiFetch('/auth/logout', { method: 'POST', auth: false }).catch(() => undefined);
    tokenStore.set(null);
    router.replace('/admin/login');
  };
  return <AdminCtx.Provider value={{ user, can: (p) => user.permissions.includes(p), signOut }}>{children}</AdminCtx.Provider>;
}
