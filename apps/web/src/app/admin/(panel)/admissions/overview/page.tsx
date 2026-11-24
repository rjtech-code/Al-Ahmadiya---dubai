'use client';

import { CalendarRange, CheckCircle2, ClipboardList, FileCheck2, FileSearch, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { BarChart, DashPanel, HBars, IconStat, monthLabel, QuickActions, ViewAll, WelcomeBanner } from '@/components/admin/dash';
import { ErrorNote, StatusPill } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface D {
  totals: { submitted: number; inReview: number; approved: number; rejected: number; drafts: number; docsToVerify: number };
  pipeline: { stage: string; count: number }[];
  monthly: { month: string; count: number }[];
  recent: { id: string; reference: string; status: string; submittedAt: string | null; applicant: { fullName: string }; program: { nameEn: string } | null }[];
}
const greet = () => { const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dubai' })); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function AdmissionsOverview() {
  const { user } = useAdmin();
  const [d, setD] = useState<D | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<{ data: D }>('/admin/overview/admissions').then((r) => setD(r.data)).catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to load')); }, []);
  return (
    <>
      <WelcomeBanner title={`${greet()}, ${user.fullName.split(' ')[0]}`} subtitle="Here is your admissions overview." />
      <ErrorNote message={error} />
      {!d ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <IconStat icon={ClipboardList} label="Applications submitted" value={d.totals.submitted} hint={`${d.totals.drafts} still in draft`} href="/admin/admissions" />
            <IconStat icon={FileSearch} label="In review" value={d.totals.inReview} href="/admin/admissions?status=UNDER_REVIEW" />
            <IconStat icon={FileCheck2} label="Documents to verify" value={d.totals.docsToVerify} />
            <IconStat icon={CheckCircle2} label="Offers (approved)" value={d.totals.approved} hint={`${d.totals.rejected} rejected`} />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <DashPanel title="Application pipeline">
              <HBars rows={d.pipeline.map((p) => ({ label: p.stage, value: p.count }))} />
              <p className="mt-3 text-xs text-muted">Each stage counts applications that reached it.</p>
            </DashPanel>
            <DashPanel title="Applications submitted per month" action={<span className="text-xs text-muted">Last 6 months</span>}>
              <BarChart label="Applications submitted per month" data={d.monthly.map((m) => ({ x: monthLabel(m.month), y: m.count }))} />
            </DashPanel>
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <DashPanel title="Recent applicants" action={<ViewAll href="/admin/admissions" />}>
              {d.recent.length ? (
                <ul className="divide-y divide-line text-sm">
                  {d.recent.map((a) => (
                    <li key={a.id}><Link href={`/admin/admissions/${a.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand-700">
                      <span className="min-w-0"><span className="block truncate font-semibold text-brand-900">{a.applicant.fullName}</span><span className="text-xs text-muted">{a.reference} · {a.program?.nameEn ?? 'Programme not chosen'}</span></span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-muted">{a.submittedAt && new Date(a.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}<StatusPill status={a.status} /></span>
                    </Link></li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">No applications submitted yet.</p>}
            </DashPanel>
            <DashPanel title="Quick actions">
              <QuickActions items={[
                { href: '/admin/admissions?status=SUBMITTED', label: 'Review applications', icon: ListChecks },
                { href: '/admin/admissions?status=DOCUMENTS_PENDING', label: 'Documents pending', icon: FileSearch },
                { href: '/admin/academics/eligibility', label: 'Eligibility rules', icon: FileCheck2 },
                { href: '/admin/settings', label: 'Intake & deadlines', icon: CalendarRange },
              ]} />
            </DashPanel>
          </div>
        </div>
      )}
    </>
  );
}
