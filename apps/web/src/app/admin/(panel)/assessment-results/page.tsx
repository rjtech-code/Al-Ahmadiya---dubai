'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Search } from 'lucide-react';
import { PageHeader, Panel, StatusPill, Table } from '@/components/admin/ui';
import { useAdmin } from '@/components/admin/AdminContext';

type Result = { id: string; student: string; email: string; course: string; assignment: string; week: string; submittedAt: string; marks: number | null; maxMarks: number; feedback: string; status: 'GRADED' | 'PENDING' };
const seed: Result[] = [
  { id: 'ar-01', student: 'Demo Student 01', email: 'student01@example.test', course: 'CS101 · Introduction to Computing', assignment: 'Course Assessment 01', week: 'Whole course', submittedAt: '2026-11-22', marks: 86, maxMarks: 100, feedback: 'Strong understanding and clear explanations.', status: 'GRADED' },
  { id: 'ar-02', student: 'Demo Student 02', email: 'student02@example.test', course: 'CS101 · Introduction to Computing', assignment: 'Course Assessment 01', week: 'Whole course', submittedAt: '2026-11-23', marks: 72, maxMarks: 100, feedback: 'Good work. Review the practical examples.', status: 'GRADED' },
  { id: 'ar-03', student: 'Demo Student 03', email: 'student03@example.test', course: 'CS101 · Introduction to Computing', assignment: 'Course Assessment 01', week: 'Whole course', submittedAt: '2026-11-24', marks: null, maxMarks: 100, feedback: '', status: 'PENDING' },
  { id: 'ar-04', student: 'Demo Student 01', email: 'student01@example.test', course: 'BUS101 · Business Foundations', assignment: 'Business Case Study', week: 'Week 3', submittedAt: '2026-11-20', marks: 91, maxMarks: 100, feedback: 'Excellent analysis.', status: 'GRADED' },
  { id: 'ar-05', student: 'Demo Student 04', email: 'student04@example.test', course: 'BUS101 · Business Foundations', assignment: 'Business Case Study', week: 'Week 3', submittedAt: '2026-11-21', marks: null, maxMarks: 100, feedback: '', status: 'PENDING' },
];

export default function AssessmentResultsPage() {
  const { can, user } = useAdmin();
  const canGrade = can('teach.own') && !user.roles.includes('HEAD_OF_DEPARTMENT');
  const [records, setRecords] = useState<Result[]>(seed);
  useEffect(() => {
    try { const local = JSON.parse(localStorage.getItem('lms.graded.submissions') || '[]') as Result[]; if (Array.isArray(local)) setRecords([...local, ...seed]); } catch { setRecords(seed); }
  }, []);
  const grade = (row: Result) => {
    const raw = window.prompt('Enter marks out of the maximum score', String(row.marks ?? ''));
    if (raw === null) return;
    const marks = Number(raw);
    if (!Number.isFinite(marks) || marks < 0 || marks > row.maxMarks) { window.alert('Enter a valid mark within the maximum score.'); return; }
    const updated: Result = { ...row, marks, status: 'GRADED' };
    const stored = JSON.parse(localStorage.getItem('lms.graded.submissions') || '[]') as Result[];
    const next = stored.some((item) => item.id === row.id) ? stored.map((item) => item.id === row.id ? updated : item) : [...stored, updated];
    localStorage.setItem('lms.graded.submissions', JSON.stringify(next));
    setRecords((current) => current.map((item) => item.id === row.id ? updated : item));
  };
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('all');
  const [status, setStatus] = useState('all');
  const rows = useMemo(() => records.filter((row) => (course === 'all' || row.course.startsWith(course)) && (status === 'all' || row.status === status) && (!query || `${row.student} ${row.email} ${row.assignment}`.toLowerCase().includes(query.toLowerCase()))), [records, query, course, status]);
  const graded = records.filter((row) => row.status === 'GRADED');
  const average = graded.length ? Math.round(graded.reduce((sum, row) => sum + (row.marks ?? 0) / row.maxMarks * 100, 0) / graded.length) : 0;
  return (
    <>
      <PageHeader title="Graded assignment results" crumbs={[{ label: 'Assessment results' }]} description="Course-wise and student-wise graded assignment performance. Demo records are stored locally for this frontend preview." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Panel title="Submissions"><p className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-brand-900">{records.length}</p></Panel>
        <Panel title="Evaluated"><p className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-success">{graded.length}</p></Panel>
        <Panel title="Average score"><p className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-brand-900">{average}%</p></Panel>
      </div>
      <Panel title="Assignment performance" actions={<BarChart3 className="size-5 text-gold-600" />}>
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="relative min-w-52 flex-1"><Search className="absolute start-3 top-3 size-4 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student or assignment" className="h-10 w-full rounded-xl border border-line bg-white ps-9 pe-3 text-sm" /></label>
          <select value={course} onChange={(event) => setCourse(event.target.value)} className="h-10 rounded-xl border border-line bg-white px-3 text-sm"><option value="all">All courses</option><option value="CS101">CS101</option><option value="BUS101">BUS101</option></select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-line bg-white px-3 text-sm"><option value="all">All statuses</option><option value="GRADED">Graded</option><option value="PENDING">Pending evaluation</option></select>
        </div>
        <Table head={['Student', 'Course', 'Assignment', 'Week', 'Submitted', 'Marks', 'Status']} empty={!rows.length}>
          {rows.map((row) => <tr key={row.id} className="hover:bg-cream-100"><td className="px-4 py-3"><span className="font-semibold text-brand-900">{row.student}</span><span className="block text-xs text-muted">{row.email}</span></td><td className="px-4 py-3 text-xs">{row.course}</td><td className="px-4 py-3 text-sm font-medium">{row.assignment}</td><td className="px-4 py-3 text-xs">{row.week}</td><td className="px-4 py-3 text-xs">{row.submittedAt}</td><td className="px-4 py-3 font-semibold">{row.marks === null ? (canGrade ? <button onClick={() => grade(row)} className="rounded-full bg-brand-900 px-3 py-1 text-xs font-semibold text-white">Grade</button> : 'Pending') : `${row.marks}/${row.maxMarks}`}</td><td className="px-4 py-3"><StatusPill status={row.status} /></td></tr>)}
        </Table>
      </Panel>
    </>
  );
}
