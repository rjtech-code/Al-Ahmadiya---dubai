'use client';

import { readDemoSession } from './demo-session';

type RequestOptions = RequestInit & { json?: unknown; auth?: boolean };
const STORAGE = 'al-ahmadiya-local-erp-data';
const now = () => new Date().toISOString();
const id = () => `local-${Math.random().toString(36).slice(2, 10)}`;

const initialItems = [
  { id: 'book-001', type: 'BOOK', title: 'Introduction to Computer Science', author: 'A. Rahman', isbn: '9780000000011', subject: 'Computing', year: 2023, url: null, copies: 12, isPublic: true, available: 9, onLoan: 3 },
  { id: 'book-002', type: 'BOOK', title: 'Principles of Business Management', author: 'M. Hassan', isbn: '9780000000028', subject: 'Business', year: 2022, url: null, copies: 8, isPublic: true, available: 6, onLoan: 2 },
  { id: 'book-003', type: 'BOOK', title: 'Academic Writing and Research', author: 'S. Karim', isbn: '9780000000035', subject: 'Research', year: 2024, url: null, copies: 10, isPublic: true, available: 10, onLoan: 0 },
  { id: 'ebook-001', type: 'EBOOK', title: 'Digital Learning Essentials', author: 'University Press', isbn: null, subject: 'Education', year: 2024, url: 'https://example.org/digital-learning', copies: 0, isPublic: true, available: null, onLoan: 0 },
  { id: 'journal-001', type: 'JOURNAL', title: 'Journal of Applied Research', author: null, isbn: null, subject: 'Research', year: 2025, url: 'https://example.org/journal', copies: 0, isPublic: true, available: null, onLoan: 0 },
];
const initialLoans = [
  { id: 'loan-001', issuedAt: '2026-11-12T09:00:00.000Z', dueAt: '2026-11-26T09:00:00.000Z', returnedAt: null, renewals: 0, item: { title: 'Introduction to Computer Science' }, user: { fullName: 'Demo Student 01', email: 'student01@example.test' } },
  { id: 'loan-002', issuedAt: '2026-11-08T09:00:00.000Z', dueAt: '2026-11-22T09:00:00.000Z', returnedAt: null, renewals: 1, item: { title: 'Principles of Business Management' }, user: { fullName: 'Demo Student 02', email: 'student02@example.test' } },
];

function readStore(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(STORAGE) || '{}'); } catch { return {}; }
}
function writeStore(store: Record<string, any>) { localStorage.setItem(STORAGE, JSON.stringify(store)); }
function getList(store: Record<string, any>, key: string, fallback: any[]) { return Array.isArray(store[key]) ? store[key] : fallback; }
const wrap = (data: unknown, meta?: unknown) => ({ data, ...(meta ? { meta } : {}) });

export async function demoUploadWithProgress<R = unknown>(path: string, form: FormData, onProgress: (pct: number) => void): Promise<R> {
  const store = readStore();
  const records = Array.isArray(store['uploads']) ? store['uploads'] : [];
  const fields: Record<string, string | number> = {};
  form.forEach((value, key) => {
    if (typeof value === 'string') fields[key] = value;
    else fields[key] = JSON.stringify({ name: value.name, size: value.size, type: value.type });
  });
  const record = { id: id(), path, fields, createdAt: now(), note: 'Local demo stores upload metadata only; no file is sent to a server.' };
  records.push(record);
  store['uploads'] = records;
  writeStore(store);
  onProgress(100);
  return wrap({ id: record.id, storedLocally: true }) as R;
}

export async function demoApiFetch<R = unknown>(path: string, init: RequestOptions = {}): Promise<R> {
  const method = (init.method || 'GET').toUpperCase();
  const clean = path.split('?')[0];
  const query = new URLSearchParams(path.split('?')[1] || '');
  const payload = (init.json ?? {}) as Record<string, any>;
  const store = readStore();
  const user = readDemoSession();
  const role = user?.role ?? 'GUEST';
  const listMeta = (rows: any[]) => ({ page: Number(query.get('page') || 1), pageSize: Number(query.get('pageSize') || 20), total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / Number(query.get('pageSize') || 20))) });

  if (clean === '/auth/me') return wrap({ id: user?.id ?? 'demo-user', email: user?.email ?? 'demo@example.test', fullName: user?.fullName ?? 'Demo User', roles: user?.roles ?? [], permissions: user?.permissions ?? [] }) as R;

  if (clean === '/admin/library/overview') {
    const items = getList(store, 'library.items', initialItems);
    const loans = getList(store, 'library.loans', initialLoans);
    const active = loans.filter((l) => !l.returnedAt);
    const month = now().slice(0, 7);
    const books = items.filter((i) => i.type === 'BOOK');
    return wrap({
      totals: { titles: books.length, copies: books.reduce((n, i) => n + i.copies, 0), eResources: items.filter((i) => i.type !== 'BOOK').length, activeBorrowers: new Set(active.map((l) => l.user.email)).size, onLoan: active.length, overdue: active.filter((l) => l.dueAt < now()).length, thisMonth: loans.filter((l) => l.issuedAt.startsWith(month)).length },
      byType: { ebooks: items.filter((i) => i.type === 'EBOOK').length, journals: items.filter((i) => i.type === 'JOURNAL').length, databases: items.filter((i) => i.type === 'DATABASE').length, papers: items.filter((i) => i.type === 'PAPER').length },
      monthly: [{ month: '2026-06', count: 8 }, { month: '2026-07', count: 11 }, { month: '2026-08', count: 13 }, { month: '2026-09', count: 9 }, { month: '2026-10', count: 16 }, { month: '2026-11', count: loans.length }],
      dueSoon: active.slice(0, 5).map((l) => ({ id: l.id, title: l.item.title, borrower: l.user.fullName, dueAt: l.dueAt, overdue: l.dueAt < now() })),
      borrowers: active.map((l) => ({ name: l.user.fullName, items: 1, nextDue: l.dueAt })),
    }) as R;
  }
  if (clean === '/admin/library/items') {
    let rows = getList(store, 'library.items', initialItems);
    const q = (query.get('q') || '').toLowerCase();
    const type = query.get('type');
    if (q) rows = rows.filter((i) => [i.title, i.author, i.subject, i.isbn].some((v) => String(v || '').toLowerCase().includes(q)));
    if (type) rows = rows.filter((i) => i.type === type);
    if (method === 'POST') {
      const item = { id: id(), ...payload, available: payload.type === 'BOOK' ? Number(payload.copies || 0) : null, onLoan: 0 };
      rows = [...rows, item]; store['library.items'] = rows; writeStore(store); return wrap(item) as R;
    }
    return wrap(rows) as R;
  }
  if (clean.startsWith('/admin/library/items/') && method === 'DELETE') {
    store['library.items'] = getList(store, 'library.items', initialItems).filter((i) => i.id !== clean.split('/').pop());
    writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean === '/admin/library/loans') {
    let rows = getList(store, 'library.loans', initialLoans);
    if (method === 'POST') {
      const items = getList(store, 'library.items', initialItems);
      const item = items.find((i) => i.id === payload.itemId);
      if (item) { item.available = Math.max(0, Number(item.available || 0) - 1); item.onLoan = Number(item.onLoan || 0) + 1; }
      const loan = { id: id(), issuedAt: now(), dueAt: new Date(Date.now() + Number(payload.days || 14) * 86400000).toISOString(), returnedAt: null, renewals: 0, item: { title: item?.title ?? 'Demo book' }, user: { fullName: 'Demo Borrower', email: payload.email ?? 'borrower@example.test' } };
      rows = [...rows, loan]; store['library.items'] = items; store['library.loans'] = rows; writeStore(store); return wrap(loan) as R;
    }
    return wrap(rows.filter((l) => !l.returnedAt)) as R;
  }
  if (clean.startsWith('/admin/library/loans/')) {
    const loans = getList(store, 'library.loans', initialLoans);
    const loan = loans.find((l) => clean.includes(l.id));
    if (loan && clean.endsWith('/renew')) { loan.dueAt = new Date(new Date(loan.dueAt).getTime() + 14 * 86400000).toISOString(); loan.renewals += 1; }
    if (loan && clean.endsWith('/return')) loan.returnedAt = now();
    store['library.loans'] = loans; writeStore(store); return wrap({ success: true }) as R;
  }

  if (clean === '/admin/academics/programs') return wrap([
    { id: 'program-01', slug: 'computer-science', nameEn: 'Bachelor of Computer Science', degreeLevel: 'BACHELOR', publishStatus: 'PUBLISHED', confirmation: 'CONFIRMED', isDemo: true, department: { nameEn: 'Computer Science', college: { nameEn: 'College of Computing' } }, _count: { curriculum: 24, applications: 32 }, eligibilityRules: [{ qualification: 'HIGH_SCHOOL', isActive: true, confirmation: 'CONFIRMED' }] },
    { id: 'program-02', slug: 'business-administration', nameEn: 'Bachelor of Business Administration', degreeLevel: 'BACHELOR', publishStatus: 'PUBLISHED', confirmation: 'CONFIRMED', isDemo: true, department: { nameEn: 'Business Administration', college: { nameEn: 'College of Business' } }, _count: { curriculum: 22, applications: 41 }, eligibilityRules: [{ qualification: 'HIGH_SCHOOL', isActive: true, confirmation: 'CONFIRMED' }] },
  ]) as R;
  if (clean === '/admin/lms/courses') return wrap([
    { id: 'course-01', slug: 'intro-to-computing', code: 'CS101', titleEn: 'Introduction to Computing', publishStatus: 'PUBLISHED', confirmation: 'CONFIRMED', isDemo: true, isFeatured: true, onlineEnabled: true, deliveryMode: 'RECORDED', priceFils: 250000, currency: 'AED', department: { nameEn: 'Computer Science' }, _count: { lessons: 8, notes: 3, quizzes: 2, liveSessions: 0 }, activeStudents: 42 },
    { id: 'course-02', slug: 'business-foundations', code: 'BUS101', titleEn: 'Business Foundations', publishStatus: 'PUBLISHED', confirmation: 'CONFIRMED', isDemo: true, isFeatured: false, onlineEnabled: true, deliveryMode: 'LIVE', priceFils: null, currency: 'AED', department: { nameEn: 'Business Administration' }, _count: { lessons: 5, notes: 2, quizzes: 1, liveSessions: 2 }, activeStudents: 28 },
  ]) as R;
  if (clean === '/admin/colleges') return wrap(getList(store, 'catalog.colleges', [{ id: 'college-01', slug: 'computing', nameEn: 'College of Computing', nameAr: 'كلية الحوسبة', summaryEn: 'Computing and digital technologies', summaryAr: null, overviewEn: null, overviewAr: null, publishStatus: 'PUBLISHED', departmentCount: 2 }, { id: 'college-02', slug: 'business', nameEn: 'College of Business', nameAr: 'كلية الأعمال', summaryEn: 'Business and management studies', summaryAr: null, overviewEn: null, overviewAr: null, publishStatus: 'PUBLISHED', departmentCount: 2 }])) as R;
  if (clean === '/admin/departments/colleges') return wrap([{ id: 'college-01', nameEn: 'College of Computing', nameAr: 'كلية الحوسبة' }, { id: 'college-02', nameEn: 'College of Business', nameAr: 'كلية الأعمال' }]) as R;
  if (clean === '/admin/departments') return wrap(getList(store, 'catalog.departments', [{ id: 'dept-01', slug: 'computer-science', nameEn: 'Computer Science', nameAr: 'علوم الحاسوب', collegeName: 'College of Computing', staffCount: 8, courseCount: 18, programCount: 2 }, { id: 'dept-02', slug: 'business-admin', nameEn: 'Business Administration', nameAr: 'إدارة الأعمال', collegeName: 'College of Business', staffCount: 6, courseCount: 14, programCount: 2 }])) as R;
  if (clean === '/admin/overview/departments') return wrap([{ id: 'dept-01', nameEn: 'Computer Science' }, { id: 'dept-02', nameEn: 'Business Administration' }], { own: role === 'HEAD_OF_DEPARTMENT' ? 'dept-01' : null }) as R;
  if (clean.startsWith('/admin/overview/departments/')) return wrap({
    department: { id: 'dept-01', nameEn: 'Computer Science', college: { nameEn: 'College of Computing' } },
    totals: { faculty: 8, students: 126, courses: 18, avgMarks: 78 },
    workload: [{ id: 'staff-01', name: 'Demo Faculty 01', courses: ['CS101', 'CS202'], students: 48, weeklyHours: 12 }, { id: 'staff-02', name: 'Demo Faculty 02', courses: ['CS105'], students: 28, weeklyHours: 8 }],
    perCourse: [{ code: 'CS101', students: 48, avgMarks: 78 }, { code: 'CS202', students: 32, avgMarks: 82 }],
    atRisk: [], atRiskCount: 0, conflicts: [], unassigned: [],
  }) as R;
  if (clean === '/me/leave') {
    let rows = getList(store, 'hr.my-leave', [{ id: 'my-leave-01', type: 'ANNUAL', startDate: '2026-12-03T00:00:00Z', endDate: '2026-12-04T00:00:00Z', reason: 'Personal leave', status: 'PENDING', note: null }]);
    if (method === 'POST') { const row = { id: id(), ...payload, status: 'PENDING', note: null }; rows = [...rows, row]; store['hr.my-leave'] = rows; writeStore(store); return wrap(row) as R; }
    return wrap(rows) as R;
  }
  if (clean.startsWith('/me/leave/') && method === 'POST') {
    const rows = getList(store, 'hr.my-leave', []); const row = rows.find((x) => clean.includes(x.id)); if (row) row.status = 'CANCELLED'; store['hr.my-leave'] = rows; writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean === '/admin/overview/admissions') return wrap({
    totals: { submitted: 18, inReview: 12, approved: 24, rejected: 4, drafts: 6, docsToVerify: 7 },
    pipeline: [{ stage: 'Submitted', count: 18 }, { stage: 'Under review', count: 12 }, { stage: 'Approved', count: 24 }, { stage: 'Rejected', count: 4 }],
    monthly: [{ month: '2026-06', count: 18 }, { month: '2026-07', count: 22 }, { month: '2026-08', count: 31 }, { month: '2026-09', count: 26 }, { month: '2026-10', count: 39 }, { month: '2026-11', count: 18 }],
    recent: [{ id: 'app-001', reference: 'AAU-2026-001', status: 'UNDER_REVIEW', submittedAt: '2026-11-24T10:00:00Z', applicant: { fullName: 'Demo Applicant 01' }, program: { nameEn: 'Bachelor of Business Administration' } }, { id: 'app-002', reference: 'AAU-2026-002', status: 'SUBMITTED', submittedAt: '2026-11-23T10:00:00Z', applicant: { fullName: 'Demo Applicant 02' }, program: { nameEn: 'Computer Science' } }],
  }) as R;
  if (clean === '/admin/applications') {
    const rows = [
      { id: 'app-001', reference: 'AAU-2026-001', status: 'UNDER_REVIEW', submittedAt: '2026-11-24T10:00:00Z', applicant: { fullName: 'Demo Applicant 01', email: 'applicant01@example.test' }, program: { nameEn: 'Bachelor of Business Administration' } },
      { id: 'app-002', reference: 'AAU-2026-002', status: 'SUBMITTED', submittedAt: '2026-11-23T10:00:00Z', applicant: { fullName: 'Demo Applicant 02', email: 'applicant02@example.test' }, program: { nameEn: 'Computer Science' } },
      { id: 'app-003', reference: 'AAU-2026-003', status: 'DOCUMENTS_PENDING', submittedAt: '2026-11-21T10:00:00Z', applicant: { fullName: 'Demo Applicant 03', email: 'applicant03@example.test' }, program: { nameEn: 'Accounting' } },
    ];
    const status = query.get('status'); const filtered = status ? rows.filter((r) => r.status === status) : rows;
    return wrap(filtered, listMeta(filtered)) as R;
  }
  if (clean === '/admin/records/overview') return wrap({
    totals: { students: 344, registrations: 286, thisMonth: 24, onTrackPercent: 87 },
    registrations: { active: 238, pending: 32, cancelled: 16 },
    events: [{ id: 'event-01', titleEn: 'Semester examinations', startsAt: '2026-12-10T08:00:00Z', category: 'academic' }, { id: 'event-02', titleEn: 'Winter break begins', startsAt: '2026-12-22T08:00:00Z', category: 'holiday' }],
    audit: [{ name: 'Demo Student 01', programme: 'Computer Science', earned: 72, required: 120 }, { name: 'Demo Student 02', programme: 'Business', earned: 64, required: 120 }],
    prerequisiteIssues: [], prerequisiteIssueCount: 0, activity: [{ at: now(), text: 'Demo transcript record reviewed' }],
  }) as R;
  if (clean === '/admin/records/students') return wrap([{ id: 'student-demo-01', fullName: 'Demo Student 01', email: 'student01@example.test', _count: { enrollments: 4, results: 12 } }, { id: 'student-demo-02', fullName: 'Demo Student 02', email: 'student02@example.test', _count: { enrollments: 3, results: 9 } }]) as R;
  if (clean === '/admin/finance/summary') return wrap({
    collectedFils: 125000000, payments: 148, thisMonthFils: 18200000, dueFils: 16400000, dueCount: 16, payingStudents: 132,
    monthly: [{ month: '2026-06', collectedFils: 14800000 }, { month: '2026-07', collectedFils: 17200000 }, { month: '2026-08', collectedFils: 19100000 }, { month: '2026-09', collectedFils: 16400000 }, { month: '2026-10', collectedFils: 21800000 }, { month: '2026-11', collectedFils: 18200000 }],
    aging: [{ label: '0–30', fils: 7200000 }, { label: '31–60', fils: 5100000 }, { label: '61–90', fils: 4100000 }],
    recent: [{ id: 'pay-01', amountFils: 250000, currency: 'AED', status: 'SUCCEEDED', receiptNumber: 'DEMO-001', paidAt: now(), createdAt: now(), purpose: 'course', user: { id: 'student-demo-01', fullName: 'Demo Student 01' } }],
    dueStudents: [{ id: 'student-demo-02', fullName: 'Demo Student 02', email: 'student02@example.test', course: 'Computer Science', fils: 1200000, since: '2026-11-01T00:00:00Z' }],
  }) as R;
  if (clean === '/admin/finance/students') return wrap([{ id: 'student-demo-01', name: 'Demo Student 01', email: 'student01@example.test', courses: [{ code: 'CS101', title: 'Computer Science', status: 'ACTIVE' }], paidFils: 250000, dueFils: 0, lastPaidAt: now() }, { id: 'student-demo-02', name: 'Demo Student 02', email: 'student02@example.test', courses: [{ code: 'BUS101', title: 'Business', status: 'PENDING_PAYMENT' }], paidFils: 0, dueFils: 1200000, lastPaidAt: null }], listMeta([])) as R;
  if (clean.startsWith('/admin/finance/students/')) {
    const studentId = clean.split('/').pop();
    const isSecond = studentId === 'student-demo-02';
    return wrap({
      fullName: isSecond ? 'Demo Student 02' : 'Demo Student 01',
      email: isSecond ? 'student02@example.test' : 'student01@example.test',
      paidFils: isSecond ? 0 : 250000,
      dueFils: isSecond ? 1200000 : 0,
      enrollments: [{ id: 'enrol-demo-01', status: isSecond ? 'PENDING_PAYMENT' : 'ACTIVE', activatedAt: isSecond ? null : now(), createdAt: now(), course: { code: isSecond ? 'BUS101' : 'CS101', titleEn: isSecond ? 'Business Administration' : 'Computer Science', priceFils: 1200000, currency: 'AED' } }],
      payments: isSecond ? [] : [{ id: 'pay-01', purpose: 'course', description: 'Computer Science course fee', amountFils: 250000, currency: 'AED', status: 'SUCCEEDED', receiptNumber: 'DEMO-001', paidAt: now(), createdAt: now() }],
    }) as R;
  }
  if (clean === '/admin/overview/hr') return wrap({
    totals: { staff: 42, active: 39, inactive: 3, newStaff: 2, signedInToday: 18, onLeaveToday: 2, pendingLeave: 3 },
    byRole: [{ role: 'Faculty', count: 24 }, { role: 'Administration', count: 10 }, { role: 'Support', count: 8 }],
    byDepartment: [{ id: 'dept-01', name: 'Academic Affairs', count: 12 }, { id: 'dept-02', name: 'Student Services', count: 8 }],
    onLeave: [{ id: 'leave-01', type: 'ANNUAL', endDate: '2026-11-28T00:00:00Z', user: { fullName: 'Demo Staff 01' } }],
    pending: [],
  }) as R;
  if (clean === '/admin/leave') return wrap(getList(store, 'hr.leave', [
    { id: 'leave-01', type: 'ANNUAL', startDate: '2026-11-27T00:00:00Z', endDate: '2026-11-28T00:00:00Z', reason: 'Personal leave', status: 'PENDING', note: null, user: { fullName: 'Demo Staff 01', email: 'staff01@example.test' } },
    { id: 'leave-02', type: 'CASUAL', startDate: '2026-12-02T00:00:00Z', endDate: '2026-12-02T00:00:00Z', reason: 'Appointment', status: 'APPROVED', note: null, user: { fullName: 'Demo Staff 02', email: 'staff02@example.test' } },
  ])) as R;
  if (clean.startsWith('/admin/leave/') && method === 'PUT') {
    const rows = getList(store, 'hr.leave', []); const row = rows.find((x) => clean.endsWith(x.id));
    if (row) Object.assign(row, payload); store['hr.leave'] = rows; writeStore(store); return wrap({ success: true }) as R;
  }

  if (clean === '/me/portal/dashboard') return wrap({
    cgpa: 3.42, attendance: 91, upcomingCount: 2,
    courses: [{ id: 'course-01' }, { id: 'course-02' }],
    today: [{ kind: 'class', id: 'live-01', at: new Date(Date.now() + 3600000).toISOString(), endsAt: new Date(Date.now() + 5400000).toISOString(), titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة', code: 'CS101', status: 'SCHEDULED' }],
    nextClass: { id: 'live-01', scheduledAt: new Date(Date.now() + 3600000).toISOString(), durationMin: 90, status: 'SCHEDULED', course: { code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة', imagePath: '/images/courses/cs101.jpg', teacher: { fullName: 'Demo Faculty' } } },
    pendingAssignments: [{ id: 'assignment-01', titleEn: 'Programming exercise', titleAr: 'تمرين برمجي', dueAt: new Date(Date.now() + 3 * 86400000).toISOString(), course: { code: 'CS101' } }],
    recentLectures: [{ id: 'lesson-01', titleEn: 'Variables and data types', titleAr: 'المتغيرات وأنواع البيانات', durationSec: 1200, createdAt: now(), course: { slug: 'intro-to-computing', code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة', imagePath: '/images/courses/cs101.jpg' } }],
  }) as R;
  if (clean === '/me/portal/assignments') return wrap([{ id: 'assignment-01', titleEn: 'Programming exercise', titleAr: 'تمرين برمجي', dueAt: new Date(Date.now() + 3 * 86400000).toISOString(), maxMarks: 20, state: 'PENDING', marks: null, submittedAt: null, course: { code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' } }]) as R;
  if (clean.startsWith('/me/portal/assignments/')) return wrap({
    id: clean.split('/').pop(), titleEn: 'Programming exercise', titleAr: 'تمرين برمجي', instructionsEn: 'Write a short program using variables, conditions and loops.', instructionsAr: 'اكتب برنامجاً قصيراً باستخدام المتغيرات والشروط والحلقات.', dueAt: new Date(Date.now() + 3 * 86400000).toISOString(), maxMarks: 20, allowResubmit: true,
    course: { code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' }, submission: null,
  }) as R;
  if (clean === '/me/portal/attendance') return wrap({
    overall: 91,
    byCourse: [{ course: { id: 'course-01', code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' }, held: 12, attended: 11, late: 1, absent: 0, percent: 92 }, { course: { id: 'course-02', code: 'BUS101', titleEn: 'Business Foundations', titleAr: 'أساسيات الأعمال' }, held: 10, attended: 9, late: 0, absent: 1, percent: 90 }],
    history: [{ id: 'attendance-01', date: now(), course: { code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' }, status: 'PRESENT', minutes: 88, joinedAt: now(), leftAt: now() }],
  }) as R;
  if (clean === '/me/portal/courses') return wrap([
    { id: 'course-01', slug: 'intro-to-computing', code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة', imagePath: '/images/courses/cs101.jpg', instructor: 'Demo Faculty', progress: 62, lecturesDone: 5, lecturesTotal: 8, pendingAssignments: 1, pendingQuizzes: 0, nextClass: { scheduledAt: new Date(Date.now() + 3600000).toISOString(), status: 'SCHEDULED' } },
    { id: 'course-02', slug: 'business-foundations', code: 'BUS101', titleEn: 'Business Foundations', titleAr: 'أساسيات الأعمال', imagePath: '/images/courses/business.jpg', instructor: 'Demo Faculty', progress: 38, lecturesDone: 2, lecturesTotal: 5, pendingAssignments: 0, pendingQuizzes: 1, nextClass: null },
  ]) as R;
  if (clean === '/me/portal/wishlist') return wrap([]) as R;
  if (clean === '/me/portal/documents') return wrap([{ id: 'doc-demo-01', docType: 'IDENTITY', originalName: 'demo-identity-document.pdf', sizeBytes: 128000, status: 'VERIFIED', createdAt: now(), application: { id: 'app-demo-01', reference: 'AAU-DEMO-001' } }]) as R;
  if (clean === '/me/portal/lectures') {
    const lectures = [{ id: 'lesson-01', titleEn: 'Variables and data types', titleAr: 'المتغيرات وأنواع البيانات', durationSec: 1200, positionSec: 600, completed: false, watchedAt: now(), course: { slug: 'intro-to-computing', code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' }, topic: { titleEn: 'Programming basics', titleAr: 'أساسيات البرمجة' } }];
    return wrap({ lectures, continueWatching: lectures, upNext: lectures }) as R;
  }
  if (clean === '/me/library/catalogue') {
    const rows = getList(store, 'library.items', initialItems).filter((i) => i.isPublic);
    const q = (query.get('q') || '').toLowerCase();
    return wrap(q ? rows.filter((i) => i.title.toLowerCase().includes(q) || String(i.author || '').toLowerCase().includes(q)) : rows) as R;
  }
  if (clean === '/me/library/loans') return wrap(getList(store, 'library.loans', initialLoans).filter((l) => l.user.email === user?.email || l.user.email.endsWith('@example.test'))) as R;
  if (clean.startsWith('/me/library/loans/') && clean.endsWith('/renew')) {
    const rows = getList(store, 'library.loans', initialLoans); const loan = rows.find((l) => clean.includes(l.id));
    if (loan) { loan.dueAt = new Date(new Date(loan.dueAt).getTime() + 14 * 86400000).toISOString(); loan.renewals += 1; }
    store['library.loans'] = rows; writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean === '/me/portal/live') return wrap([{ id: 'live-01', titleEn: 'Introduction to Computing — Weekly Class', titleAr: 'مقدمة في الحوسبة — الحصة الأسبوعية', scheduledAt: new Date(Date.now() + 3600000).toISOString(), durationMin: 90, status: 'SCHEDULED', course: { id: 'course-01', code: 'CS101', slug: 'intro-to-computing', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة', teacher: { fullName: 'Demo Faculty' } }, lesson: null, attendedMinutes: null }]) as R;
  if (clean === '/me/notifications') return wrap(getList(store, 'student.notifications', [{ id: 'notice-01', type: 'ACADEMIC', titleEn: 'Welcome to your student portal', titleAr: 'مرحباً بك في بوابة الطالب', bodyEn: 'Your local demo student workspace is ready.', bodyAr: 'مساحة الطالب التجريبية المحلية جاهزة.', link: '/portal/courses', readAt: null, createdAt: now() }])) as R;
  if (clean.startsWith('/me/notifications/') && clean.endsWith('/read')) {
    const rows = getList(store, 'student.notifications', []); const n = rows.find((x) => clean.includes(x.id)); if (n) n.readAt = now(); store['student.notifications'] = rows; writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean === '/me/notifications/read-all' && method === 'POST') {
    const rows = getList(store, 'student.notifications', []); rows.forEach((n) => { n.readAt = now(); }); store['student.notifications'] = rows; writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean === '/me/payments') return wrap([{ id: 'payment-demo-01', purpose: 'course', description: 'Introduction to Computing course fee', amountFils: 250000, vatFils: 0, currency: 'AED', status: 'SUCCEEDED', receiptNumber: 'DEMO-001', paidAt: now(), createdAt: now() }]) as R;
  if (clean === '/me/portal/profile') return wrap({
    id: user?.id ?? 'demo-student', studentId: 'DEMO-2026-001', fullName: user?.fullName ?? 'Demo Student', email: user?.email ?? 'student.demo@al-ahmadiya.example', phone: null, locale: 'en', createdAt: now(),
    application: { reference: 'AAU-DEMO-001', status: 'APPROVED', personal: {}, contact: {}, academic: {}, program: { nameEn: 'Bachelor of Computer Science', nameAr: 'بكالوريوس علوم الحاسوب', degreeLevel: 'BACHELOR', department: { nameEn: 'Computer Science', nameAr: 'علوم الحاسوب' } } },
  }) as R;
  if (clean === '/me/portal/quizzes') return wrap([{ id: 'quiz-01', titleEn: 'Programming basics quiz', titleAr: 'اختبار أساسيات البرمجة', passPercent: 60, questionCount: 10, attempts: 1, best: { score: 8, total: 10 }, passed: true, lastAt: now(), course: { slug: 'intro-to-computing', code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' } }]) as R;
  if (clean === '/me/portal/results') return wrap({ cgpa: 3.42, creditsEarned: 24, terms: [{ term: '2026 Fall', gpa: 3.42, credits: 12, courses: [{ id: 'result-01', marks: 88, grade: 'A', gradePoints: 4, creditHours: 3, course: { code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' } }] }] }) as R;
  if (clean === '/me/portal/schedule') return wrap([{ kind: 'class', id: 'live-01', at: new Date(Date.now() + 3600000).toISOString(), endsAt: new Date(Date.now() + 5400000).toISOString(), titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة', code: 'CS101', status: 'SCHEDULED', teacher: 'Demo Faculty' }, { kind: 'deadline', id: 'assignment-01', at: new Date(Date.now() + 3 * 86400000).toISOString(), endsAt: new Date(Date.now() + 3 * 86400000).toISOString(), titleEn: 'Programming exercise deadline', titleAr: 'موعد تسليم التمرين البرمجي', code: 'CS101', status: 'PENDING', teacher: null }]) as R;
  const listPaths = ['/admin/applications', '/admin/users', '/admin/roles', '/admin/cms', '/admin/contact-messages', '/admin/newsletter-subscribers', '/admin/leave', '/admin/live/sessions', '/admin/lms/courses', '/admin/records/students', '/admin/payments', '/me/notifications', '/me/courses', '/me/live'];
  if (listPaths.includes(clean)) {
    const rows = getList(store, `collection:${clean}`, []);
    return wrap(rows, listMeta(rows)) as R;
  }

  if (method === 'POST') {
    const rows = getList(store, `collection:${clean}`, []);
    const created = { id: id(), ...payload, createdAt: now(), createdBy: role };
    rows.push(created); store[`collection:${clean}`] = rows; writeStore(store);
    return wrap({ success: true, id: created.id, ...created }) as R;
  }
  if (method === 'PUT' || method === 'PATCH') {
    const parts = clean.split('/');
    const recordId = parts.pop() || '';
    const collection = parts.join('/');
    const rows = getList(store, `collection:${collection}`, []);
    const index = rows.findIndex((row) => row.id === recordId);
    if (index >= 0) rows[index] = { ...rows[index], ...payload, updatedAt: now() };
    else rows.push({ id: recordId || id(), ...payload, updatedAt: now() });
    store[`collection:${collection}`] = rows; writeStore(store);
    return wrap({ success: true }) as R;
  }
  if (method === 'DELETE') {
    const parts = clean.split('/');
    const recordId = parts.pop() || '';
    const collection = parts.join('/');
    const rows = getList(store, `collection:${collection}`, []).filter((row) => row.id !== recordId);
    store[`collection:${collection}`] = rows; writeStore(store);
    return wrap({ success: true }) as R;
  }

  if (Array.isArray(store[`collection:${clean}`])) {
    const rows = store[`collection:${clean}`];
    return wrap(rows, listMeta(rows)) as R;
  }
  if (clean.includes('/overview') || clean.includes('/summary') || clean.endsWith('/config') || clean.endsWith('/dashboard')) return wrap({}) as R;
  if (clean.includes('/students')) return wrap([], listMeta([])) as R;
  if (clean.includes('/items') || clean.includes('/loans') || clean.includes('/applications') || clean.includes('/notifications') || clean.includes('/courses') || clean.includes('/sessions')) return wrap([]) as R;
  return wrap({}) as R;
}
