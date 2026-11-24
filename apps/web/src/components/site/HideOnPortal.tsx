'use client';

import type { ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';

/** The student portal has its own app shell, so the public header/footer are hidden there. */
export function HideOnPortal({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname === '/portal' || pathname.startsWith('/portal/') ? null : <>{children}</>;
}
