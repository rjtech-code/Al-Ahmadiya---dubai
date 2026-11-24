import type { ReactNode } from 'react';
import { PortalShell } from '@/components/portal/PortalShell';

export const metadata = { robots: { index: false, follow: false } };

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
