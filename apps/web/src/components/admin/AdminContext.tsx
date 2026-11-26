'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { clearDemoSession, DEMO_SESSION_EVENT, readDemoSession } from '@/lib/demo-session';

export interface AdminUser { id: string; email: string; fullName: string; roles: string[]; permissions: string[] }
interface Ctx { user: AdminUser; can: (p: string) => boolean; signOut: () => Promise<void> }
const AdminCtx = createContext<Ctx | null>(null);
export function useAdmin() {
  const c = useContext(AdminCtx);
  if (!c) throw new Error('useAdmin outside AdminProvider');
  return c;
}

/** Staff access is based exclusively on the locally selected demo role. */
export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const applyDemoRole = () => {
      const demo = readDemoSession();
      if (!demo) {
        setUser(null);
        router.replace('/admin/login');
        return;
      }
      if (demo.role === 'STUDENT') {
        setUser(null);
        router.replace('/en/portal');
        return;
      }
      setUser({ id: demo.id, email: demo.email, fullName: demo.fullName, roles: demo.roles, permissions: demo.permissions });
    };
    applyDemoRole();
    window.addEventListener(DEMO_SESSION_EVENT, applyDemoRole);
    window.addEventListener('storage', applyDemoRole);
    return () => {
      window.removeEventListener(DEMO_SESSION_EVENT, applyDemoRole);
      window.removeEventListener('storage', applyDemoRole);
    };
  }, [router, pathname]);

  if (!user) return <div className="grid min-h-dvh place-items-center text-sm text-muted">Opening your local workspace…</div>;
  const signOut = async () => {
    clearDemoSession();
    setUser(null);
    router.replace('/admin/login');
  };
  return <AdminCtx.Provider value={{ user, can: (p) => user.permissions.includes('*') || user.permissions.includes(p), signOut }}>{children}</AdminCtx.Provider>;
}
