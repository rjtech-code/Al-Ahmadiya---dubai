'use client';

import { Plus, Radio } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminBtn, ErrorNote, PageHeader, StatusPill, Table } from '@/components/admin/ui';
import { apiFetch, ApiError, formatMoney } from '@/lib/client-api';

interface C { id: string; slug: string; code: string; titleEn: string; publishStatus: string; confirmation: string; isDemo: boolean; onlineEnabled: boolean; deliveryMode: string; priceFils: number | null; currency: string; department: { nameEn: string }; _count: { lessons: number; notes: number; quizzes: number; liveSessions: number }; activeStudents: number }

export default function CoursesAdmin() {
  const [rows, setRows] = useState<C[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<{ data: C[] }>('/admin/lms/courses').then((r) => setRows(r.data)).catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed')); }, []);
  return (
    <>
      <PageHeader title="Online courses" crumbs={[{ label: 'Online courses' }]} description="Create a course, set its price, then upload lecture videos, notes and quizzes. Students get access automatically after paying."
        actions={<Link href="/admin/courses/new" className={adminBtn}><Plus className="size-4" />New course</Link>} />
      <ErrorNote message={error} />
      <Table head={['Course', 'Department', 'Online', 'Price', 'Content', 'Students', 'Status', '']} empty={rows?.length === 0}>
        {(rows ?? []).map((c) => (
          <tr key={c.id} className="hover:bg-cream-100">
            <td className="px-4 py-3"><span className="font-mono text-xs text-gold-700">{c.code}</span><span className="block font-semibold text-brand-900">{c.titleEn}</span></td>
            <td className="px-4 py-3 text-xs">{c.department.nameEn}</td>
            <td className="px-4 py-3 text-xs">{c.onlineEnabled ? <span className="inline-flex items-center gap-1 font-semibold text-success">{c.deliveryMode === 'LIVE' && <Radio className="size-3" />}{c.deliveryMode === 'LIVE' ? 'Live' : 'Recorded'}</span> : <span className="text-muted">Off</span>}</td>
            <td className="px-4 py-3 text-xs">{c.priceFils ? formatMoney(c.priceFils, c.currency) : c.onlineEnabled ? 'Free' : '—'}</td>
            <td className="px-4 py-3 text-xs">{c._count.lessons} videos · {c._count.notes} notes · {c._count.quizzes} quizzes{c._count.liveSessions ? ` · ${c._count.liveSessions} live` : ''}</td>
            <td className="px-4 py-3">{c.activeStudents}</td>
            <td className="px-4 py-3"><div className="flex flex-wrap gap-1"><StatusPill status={c.publishStatus} />{c.isDemo && <StatusPill status="DEMO" />}</div></td>
            <td className="px-4 py-3"><Link href={`/admin/courses/${c.id}`} className="text-xs font-semibold text-brand-700 hover:underline">Open builder</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
