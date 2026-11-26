'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, BookOpen, BriefcaseBusiness, Building2, ClipboardList, GraduationCap, LibraryBig, ShieldCheck, Wallet } from 'lucide-react';
import { LogoMark } from '@/components/site/Logo';
import { saveDemoSession } from '@/lib/demo-session';

const STAFF_ROLES = [
  { key: 'SUPER_ADMIN', label: 'Super Admin', detail: 'All ERP modules and system controls', icon: ShieldCheck },
  { key: 'UNIVERSITY_ADMIN', label: 'University Admin', detail: 'Institution-wide operations and oversight', icon: Building2 },
  { key: 'ADMISSIONS_OFFICER', label: 'Admissions Officer', detail: 'Application intake and admissions workflow', icon: ClipboardList },
  { key: 'ADMISSIONS_REVIEWER', label: 'Admissions Reviewer', detail: 'Review submitted applications', icon: ClipboardList },
  { key: 'REGISTRAR', label: 'Registrar', detail: 'Student records, registration and transcripts', icon: GraduationCap },
  { key: 'LIBRARIAN', label: 'Librarian', detail: 'Library catalogue, issue and return', icon: LibraryBig },
  { key: 'PROCUREMENT_OFFICER', label: 'Procurement Officer', detail: 'Purchasing requests and campus facilities', icon: BriefcaseBusiness },
  { key: 'ACADEMIC_ADMIN', label: 'Academic Admin', detail: 'Programmes, eligibility and online courses', icon: BookOpen },
  { key: 'FINANCE_MANAGER', label: 'Finance Manager', detail: 'Finance overview and student accounts', icon: Wallet },
  { key: 'FINANCE_OFFICER', label: 'Finance Officer', detail: 'Payments and fee collection records', icon: Wallet },
  { key: 'HR_MANAGER', label: 'HR Manager', detail: 'Staff directory, leave and HR operations', icon: BriefcaseBusiness },
  { key: 'HEAD_OF_DEPARTMENT', label: 'Head of Department', detail: 'Department performance and teaching', icon: Building2 },
  { key: 'CONTENT_EDITOR', label: 'Content Editor', detail: 'Public website content and CMS', icon: BookOpen },
  { key: 'FACULTY', label: 'Faculty / Teacher', detail: 'Teaching, classes and student progress', icon: GraduationCap },
] as const;

export default function AdminLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const enter = (role: string) => {
    if (busy) return;
    setBusy(role);
    saveDemoSession(role);
    router.replace('/admin');
  };
  const enterStudent = () => {
    if (busy) return;
    setBusy('STUDENT');
    saveDemoSession('STUDENT');
    router.replace('/en/portal');
  };

  return (
    <main className="pattern-girih min-h-dvh px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="size-14 text-gold-400" />
          <p className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl font-semibold uppercase text-brand-900">Al Ahmadiya</p>
          <h1 className="mt-2 text-xl font-semibold text-brand-900 sm:text-2xl">Choose your demo workspace</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">Select a role to open its own dashboard and assigned ERP modules. This preview runs entirely in your browser — no server login required.</p>
        </header>

        <section aria-label="Staff demo roles" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAFF_ROLES.map(({ key, label, detail, icon: Icon }) => (
            <button key={key} type="button" onClick={() => enter(key)} disabled={!!busy} className="group flex min-h-28 items-center gap-4 rounded-2xl border border-white/80 bg-cream-50 p-4 text-start shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-lg disabled:opacity-60">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-900 text-gold-300"><Icon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm text-brand-900">{label}</strong>
                <span className="mt-1 block text-xs leading-relaxed text-muted">{detail}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-brand-900" />
            </button>
          ))}
        </section>

        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <button type="button" onClick={enterStudent} disabled={!!busy} className="rounded-full border border-brand-900/20 bg-white px-6 py-3 text-sm font-semibold text-brand-900 hover:border-gold-500 hover:bg-gold-50 disabled:opacity-60">
            Open Student Portal <ArrowRight className="ms-2 inline size-4" />
          </button>
          <p className="text-xs text-muted">Demo changes are saved in this browser only. No real student, staff, payment or authentication records are used.</p>
          <a href="/en" className="text-xs font-semibold text-brand-700 hover:underline">Back to public website</a>
        </div>
      </div>
    </main>
  );
}
