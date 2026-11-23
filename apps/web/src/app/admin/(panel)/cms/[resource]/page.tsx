'use client';

import { useParams } from 'next/navigation';
import { CmsEditor } from '@/components/admin/CmsEditor';

export default function CmsResourcePage() {
  const { resource } = useParams<{ resource: string }>();
  return <CmsEditor key={resource} resource={resource} />;
}
