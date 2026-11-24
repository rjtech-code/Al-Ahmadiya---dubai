'use client';

import { useParams } from 'next/navigation';
import { LiveJoin } from '@/components/account/LiveJoin';

export default function PortalLiveClass() {
  const { id } = useParams<{ id: string }>();
  return <LiveJoin id={id} />;
}
