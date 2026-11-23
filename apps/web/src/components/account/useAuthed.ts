'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useSession } from '@/lib/session';

/** Redirects anonymous visitors to sign-in, returning them here afterwards. */
export function useAuthed() {
  const s = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (s.state.status === 'anon') router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
  }, [s.state.status, router, pathname]);
  return s;
}
