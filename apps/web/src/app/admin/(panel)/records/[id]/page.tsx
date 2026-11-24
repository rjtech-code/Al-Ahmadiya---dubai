'use client';

import { Printer } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogoMark } from '@/components/site/Logo';
import { adminBtn, ErrorNote, PageHeader } from '@/components/admin/ui';
import { apiFetch, ApiError } from '@/lib/client-api';

interface T {
  student: { studentId: string; fullName: string; email: string };
  programme: { nameEn: string; degreeLevel: string } | null;
  terms: { term: string; gpa: number | null; courses: { term: string; marks: number | null; grade: string; gradePoints: number; creditHours: number; course: { code: string; titleEn: string } }[] }[];
  cgpa: number | null; credits: number; issuedAt: string;
}

/** Printable transcript from published results. */
export default function Transcript() {
  const { id } = useParams<{ id: string }>();
  const [t, setT] = useState<T | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<{ data: T }>(`/admin/records/students/${id}/transcript`).then((r) => setT(r.data)).catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to load')); }, [id]);
  return (
    <>
      <div className="print:hidden"><PageHeader title="Transcript" crumbs={[{ label: 'Registrar', href: '/admin/records' }, { label: t?.student.fullName ?? '…' }]} actions={<button onClick={() => window.print()} className={adminBtn}><Printer className="size-4" />Print / save as PDF</button>} /></div>
      <ErrorNote message={error} />
      {t && (
        <article className="mx-auto max-w-3xl rounded-[1.5rem] bg-white p-8 shadow-[var(--shadow-card)] print:shadow-none">
          <header className="flex items-center justify-between border-b-2 border-gold-400 pb-4">
            <div className="flex items-center gap-3"><LogoMark className="size-12 text-brand-900" /><div><p className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-brand-900">Al Ahmadiya</p><p className="text-xs uppercase tracking-widest text-muted">Academic transcript</p></div></div>
            <p className="text-end text-xs text-muted">Issued {new Date(t.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </header>
          <dl className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-muted">Student</dt><dd className="font-semibold">{t.student.fullName}</dd></div>
            <div><dt className="text-muted">Student ID</dt><dd className="font-semibold">{t.student.studentId}</dd></div>
            <div><dt className="text-muted">Programme</dt><dd className="font-semibold">{t.programme?.nameEn ?? '—'}</dd></div>
            <div><dt className="text-muted">CGPA · credits passed</dt><dd className="font-semibold">{t.cgpa ?? '—'} · {t.credits}</dd></div>
          </dl>
          {t.terms.length ? t.terms.map((term) => (
            <section key={term.term} className="mt-6">
              <h2 className="flex justify-between border-b border-line pb-1 font-semibold text-brand-900"><span>{term.term}</span><span>GPA {term.gpa ?? '—'}</span></h2>
              <table className="mt-2 w-full text-sm">
                <thead className="text-xs text-muted"><tr><th className="py-1 text-start">Code</th><th className="text-start">Course</th><th>Credits</th><th>Marks</th><th>Grade</th><th>Points</th></tr></thead>
                <tbody>{term.courses.map((c) => <tr key={c.course.code} className="border-t border-line/60"><td className="py-1">{c.course.code}</td><td>{c.course.titleEn}</td><td className="text-center">{c.creditHours}</td><td className="text-center">{c.marks ?? '—'}</td><td className="text-center font-semibold">{c.grade}</td><td className="text-center">{c.gradePoints.toFixed(1)}</td></tr>)}</tbody>
              </table>
            </section>
          )) : <p className="mt-6 text-sm text-muted">No published results yet.</p>}
          <p className="mt-8 border-t border-line pt-3 text-[11px] text-muted">Grades use a 4.0 scale. Only results published by the teaching staff are included. This document is unofficial unless signed and stamped by the Registrar.</p>
        </article>
      )}
    </>
  );
}
