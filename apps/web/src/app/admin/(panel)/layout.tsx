'use client';

import type { ReactNode } from 'react';
import { AdminProvider } from '@/components/admin/AdminContext';
import { AdminShell } from '@/components/admin/AdminShell';

export default function PanelLayout({ children }: { children: ReactNode }) {
  return <AdminProvider><AdminShell>{children}</AdminShell></AdminProvider>;
}
