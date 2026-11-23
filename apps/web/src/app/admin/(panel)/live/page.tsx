'use client';

import { Radio } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminBtnDanger, adminBtnOutline, ErrorNote, PageHeader, StatusPill, Table } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface S { id: string; titleEn: string; scheduledAt: string; durationMin: number; status: string; recordingStatus: string; course: { code: string; titleEn: string }; host: { fullName: string } | null }

export default function LiveAdmin() {
  const [rows, setRows] = useState<S[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<{ data: S[] }>('/admin/live/sessions').then((r) => setRows(r.data)).catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed')); }, []);
  return (
    <>
      <PageHeader title="Live classes" crumbs={[{ label: 'Live classes' }]} description="Schedule classes from a course’s builder (Step 6). Open a class to go live, record it, then publish the recording with notes and a quiz." />
      <ErrorNote message={error} />
      <Table head={['Class', 'Course', 'Scheduled', 'Host', 'Status', 'Recording', '']} empty={rows?.length === 0}>
        {(rows ?? []).map((s) => (
          <tr key={s.id} className="hover:bg-cream-100">
            <td className="px-4 py-3 font-semibold text-brand-900">{s.titleEn}</td>
            <td className="px-4 py-3 text-xs">{s.course.code} — {s.course.titleEn}</td>
            <td className="px-4 py-3 text-xs">{new Date(s.scheduledAt).toLocaleString('en-GB')} · {s.durationMin} min</td>
            <td className="px-4 py-3 text-xs">{s.host?.fullName ?? '—'}</td>
            <td className="px-4 py-3"><StatusPill status={s.status} /></td>
            <td className="px-4 py-3 text-xs">{s.recordingStatus.toLowerCase()}</td>
            <td className="px-4 py-3"><Link href={`/admin/live/${s.id}`} className={s.status === 'LIVE' ? adminBtnDanger : adminBtnOutline}><Radio className="size-4" />Console</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
