'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useSession } from '@/lib/session';

/** The student portal trusts only the locally selected STUDENT demo role. */
export function useAuthed() {
  const s = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (s.state.status === 'anon') router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
    if (s.state.status === 'authed' && !s.state.user.roles.includes('STUDENT')) router.replace('/admin');
  }, [s.state, router, pathname]);
  return s;
}
