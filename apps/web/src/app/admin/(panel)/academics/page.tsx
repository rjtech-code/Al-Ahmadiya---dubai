'use client';

import { CheckCircle2, Plus, SearchCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminBtn, adminBtnOutline, ErrorNote, PageHeader, StatusPill, Table } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface P { id: string; slug: string; nameEn: string; degreeLevel: string; publishStatus: string; confirmation: string; isDemo: boolean; department: { nameEn: string; college: { nameEn: string } }; _count: { curriculum: number; applications: number }; eligibilityRules: { qualification: string; isActive: boolean; confirmation: string }[] }

export default function ProgrammesAdmin() {
  const [rows, setRows] = useState<P[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<{ data: P[] }>('/admin/academics/programs').then((r) => setRows(r.data)).catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed')); }, []);
  return (
    <>
      <PageHeader title="Programmes" crumbs={[{ label: 'Programmes' }]} description="Every programme on the site, with its curriculum and eligibility rules. Open a programme to edit it step by step."
        actions={<><Link href="/admin/academics/eligibility" className={adminBtnOutline}><SearchCheck className="size-4" />Eligibility checker</Link><Link href="/admin/academics/new" className={adminBtn}><Plus className="size-4" />New programme</Link></>} />
      <ErrorNote message={error} />
      <Table head={['Programme', 'College', 'Level', 'Curriculum', 'Eligibility rules', 'Applications', 'Status', '']} empty={rows?.length === 0}>
        {(rows ?? []).map((p) => (
          <tr key={p.id} className="hover:bg-cream-100">
            <td className="px-4 py-3 font-semibold text-brand-900">{p.nameEn}</td>
            <td className="px-4 py-3 text-xs">{p.department.college.nameEn}<span className="block text-muted">{p.department.nameEn}</span></td>
            <td className="px-4 py-3 text-xs">{p.degreeLevel}</td>
            <td className="px-4 py-3">{p._count.curriculum ? `${p._count.curriculum} courses` : <span className="text-warning">None</span>}</td>
            <td className="px-4 py-3 text-xs">{p.eligibilityRules.length ? p.eligibilityRules.map((r) => <span key={r.qualification} className="me-1 mb-1 inline-flex items-center gap-1 rounded-full bg-cream-200 px-2 py-0.5">{r.confirmation === 'CONFIRMED' && <CheckCircle2 className="size-3 text-success" />}{r.qualification.replace(/_/g, ' ')}</span>) : <span className="text-warning">No rules</span>}</td>
            <td className="px-4 py-3">{p._count.applications}</td>
            <td className="px-4 py-3"><div className="flex flex-wrap gap-1"><StatusPill status={p.publishStatus} /><StatusPill status={p.confirmation} />{p.isDemo && <StatusPill status="DEMO" />}</div></td>
            <td className="px-4 py-3"><Link href={`/admin/academics/${p.id}`} className="text-xs font-semibold text-brand-700 hover:underline">Open builder</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
