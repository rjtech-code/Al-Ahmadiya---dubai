'use client';

import { readDemoSession } from './demo-session';

type RequestOptions = RequestInit & { json?: unknown; auth?: boolean };
const STORAGE = 'al-ahmadiya-local-erp-data';
const now = () => new Date().toISOString();
const id = () => `local-${Math.random().toString(36).slice(2, 10)}`;

const ROLE_DEMO_PERMISSIONS: Record<string, string[]> = { UNIVERSITY_ADMIN: ['dashboard.read', 'department.lead', 'teach.own', 'lms.manage', 'live.host', 'admissions.read', 'admissions.review', 'admissions.decide', 'academics.manage', 'records.manage', 'payments.read', 'library.manage', 'procurement.manage', 'cms.read', 'settings.write', 'engagement.read', 'hr.manage', 'users.read', 'roles.read', 'security.read'] };

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
  if (clean === '/admin/procurement/overview') {
    const requests = getList(store, 'procurement.requests', [
      { id: 'pr-001', number: 'PR-2026-001', title: 'Library reference books', category: 'Books', vendor: 'Demo Books Supplier', amountFils: 420000, priority: 'MEDIUM', status: 'SUBMITTED', createdAt: now(), updatedAt: now(), requestedBy: { fullName: 'Demo Staff 01' } },
      { id: 'pr-002', number: 'PR-2026-002', title: 'Computer lab accessories', category: 'IT equipment', vendor: null, amountFils: 780000, priority: 'HIGH', status: 'APPROVED', createdAt: now(), updatedAt: now(), requestedBy: { fullName: 'Demo Staff 02' }, approvedBy: { fullName: 'Demo Admin' } },
    ]);
    const facilities = getList(store, 'procurement.facilities', [{ id: 'facility-01', name: 'Main Library', status: 'OPERATIONAL', note: null, updatedAt: now() }, { id: 'facility-02', name: 'Computer Lab 1', status: 'MAINTENANCE', note: 'Scheduled equipment maintenance', updatedAt: now() }]);
    return wrap({ totals: { requests: requests.length, approved: requests.filter((x) => x.status === 'APPROVED').length, orders: requests.filter((x) => x.status === 'ORDERED' || x.status === 'RECEIVED').length, pending: requests.filter((x) => x.status === 'SUBMITTED').length }, budget: { usedFils: 1200000, totalFils: 5000000 }, pending: requests.filter((x) => x.status === 'SUBMITTED'), recent: requests.slice(0, 5), facilities }) as R;
  }
  if (clean === '/admin/procurement/requests') {
    const rows = getList(store, 'procurement.requests', [{ id: 'pr-001', number: 'PR-2026-001', title: 'Library reference books', category: 'Books', vendor: 'Demo Books Supplier', amountFils: 420000, priority: 'MEDIUM', status: 'SUBMITTED', createdAt: now(), updatedAt: now(), requestedBy: { fullName: 'Demo Staff 01' } }, { id: 'pr-002', number: 'PR-2026-002', title: 'Computer lab accessories', category: 'IT equipment', vendor: null, amountFils: 780000, priority: 'HIGH', status: 'APPROVED', createdAt: now(), updatedAt: now(), requestedBy: { fullName: 'Demo Staff 02' }, approvedBy: { fullName: 'Demo Admin' } }]);
    if (method === 'POST') { const created = { id: id(), number: `PR-DEMO-${rows.length + 1}`, ...payload, amountFils: Math.round(Number(payload.amountAed || 0) * 100), status: 'SUBMITTED', createdAt: now(), updatedAt: now(), requestedBy: { fullName: user?.fullName ?? 'Demo Staff' } }; rows.push(created); store['procurement.requests'] = rows; writeStore(store); return wrap(created) as R; }
    return wrap(rows) as R;
  }
  if (clean === '/admin/facilities') return wrap(getList(store, 'procurement.facilities', [{ id: 'facility-01', name: 'Main Library', status: 'OPERATIONAL', note: null, updatedAt: now() }, { id: 'facility-02', name: 'Computer Lab 1', status: 'MAINTENANCE', note: 'Scheduled equipment maintenance', updatedAt: now() }])) as R;
  if (clean.startsWith('/admin/procurement/requests/') && clean.endsWith('/status') && method === 'POST') {
    const rows = getList(store, 'procurement.requests', []); const row = rows.find((x) => clean.includes(x.id)); if (row) row.status = payload.to; store['procurement.requests'] = rows; writeStore(store); return wrap({ success: true }) as R;
  }
  const recordStudents = getList(store, 'records.students', [
    { id: 'student-demo-01', fullName: 'Demo Student 01', email: 'student01@example.test', _count: { enrollments: 3, results: 9 } },
    { id: 'student-demo-02', fullName: 'Demo Student 02', email: 'student02@example.test', _count: { enrollments: 2, results: 6 } },
    { id: 'student-demo-03', fullName: 'Demo Student 03', email: 'student03@example.test', _count: { enrollments: 4, results: 12 } },
  ]);
  if (clean === '/admin/records/overview') return wrap({
    totals: { students: recordStudents.length, registrations: 9, thisMonth: 3, onTrackPercent: 88 },
    registrations: { active: 7, pending: 2, cancelled: 0 },
    events: [{ id: 'event-demo-01', titleEn: 'Demo semester registration', startsAt: new Date(Date.now() + 86400000 * 5).toISOString(), category: 'ACADEMIC' }],
    audit: [{ name: 'Demo Student 01', programme: 'Demo Computer Science', earned: 24, required: 120 }, { name: 'Demo Student 02', programme: 'Demo Business', earned: 18, required: 120 }],
    prerequisiteIssues: [{ student: 'Demo Student 03', course: 'CS202', missing: 'CS101' }], prerequisiteIssueCount: 1,
    activity: [{ at: now(), text: 'Demo student record reviewed' }, { at: now(), text: 'Demo registration updated' }],
  }) as R;
  if (clean === '/admin/records/students' && method === 'GET') {
    const q = (query.get('q') || '').toLowerCase();
    const rows = q ? recordStudents.filter((x) => `${x.fullName} ${x.email}`.toLowerCase().includes(q)) : recordStudents;
    return wrap(rows, listMeta(rows)) as R;
  }
  const financeStudents = getList(store, 'finance.students', [
    { id: 'student-demo-01', name: 'Demo Student 01', email: 'student01@example.test', courses: [{ code: 'CS101', title: 'Introduction to Computing', status: 'ACTIVE' }, { code: 'BUS101', title: 'Business Foundations', status: 'PENDING_PAYMENT' }], paidFils: 250000, dueFils: 150000, lastPaidAt: now() },
    { id: 'student-demo-02', name: 'Demo Student 02', email: 'student02@example.test', courses: [{ code: 'CS101', title: 'Introduction to Computing', status: 'ACTIVE' }], paidFils: 250000, dueFils: 0, lastPaidAt: now() },
    { id: 'student-demo-03', name: 'Demo Student 03', email: 'student03@example.test', courses: [{ code: 'BUS101', title: 'Business Foundations', status: 'PENDING_PAYMENT' }], paidFils: 0, dueFils: 250000, lastPaidAt: null },
  ]);
  if (clean === '/admin/finance/students' && method === 'GET') {
    const q = (query.get('q') || '').toLowerCase();
    const rows = q ? financeStudents.filter((x) => `${x.name} ${x.email}`.toLowerCase().includes(q)) : financeStudents;
    const page = Number(query.get('page') || 1), pageSize = Number(query.get('pageSize') || 20), start = (page - 1) * pageSize;
    return wrap(rows.slice(start, start + pageSize), { page, totalPages: Math.max(1, Math.ceil(rows.length / pageSize)), total: rows.length }) as R;
  }
  if (clean.startsWith('/admin/finance/students/')) {
    const studentId = clean.split('/')[4]; const student = financeStudents.find((x) => x.id === studentId) ?? financeStudents[0];
    return wrap({ fullName: student.name, email: student.email, paidFils: student.paidFils, dueFils: student.dueFils,
      enrollments: student.courses.map((course, index) => ({ id: `${student.id}-enrol-${index}`, status: course.status, activatedAt: course.status === 'ACTIVE' ? now() : null, createdAt: now(), course: { code: course.code, titleEn: course.title, priceFils: 250000, currency: 'AED' } })),
      payments: student.paidFils ? [{ id: `${student.id}-payment`, purpose: 'course', description: 'Demo course payment', amountFils: student.paidFils, currency: 'AED', status: 'SUCCEEDED', receiptNumber: 'DEMO-RECEIPT', paidAt: now(), createdAt: now() }] : [],
    }) as R;
  }
  if (clean.startsWith('/admin/live/courses/') && clean.endsWith('/now') && method === 'POST') {
    const courseId = clean.split('/')[4];
    const course = getList(store, 'lms.courses', [{ id: courseId, code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' }]).find((x) => x.id === courseId);
    const sessions = getList(store, 'admin.live.sessions', []);
    const session = { id: id(), titleEn: `${course?.titleEn ?? 'Demo course'} — Live class`, titleAr: course?.titleAr ?? 'حصة مباشرة تجريبية', scheduledAt: now(), startedAt: now(), durationMin: 60, status: 'LIVE', recordingStatus: 'NONE', recordingKey: null, course: { id: courseId, code: course?.code ?? 'DEMO', slug: course?.slug ?? 'demo-course', titleEn: course?.titleEn ?? 'Demo course', titleAr: course?.titleAr ?? 'مقرر تجريبي' }, lesson: null, host: { fullName: user?.fullName ?? 'Demo Faculty' } };
    sessions.unshift(session); store['admin.live.sessions'] = sessions; writeStore(store); return wrap({ id: session.id }) as R;
  }
  if (clean === '/admin/live/sessions' && method === 'GET') {
    const rows = getList(store, 'admin.live.sessions', [
      { id: 'live-01', titleEn: 'Introduction to Computing — Weekly Class', titleAr: 'مقدمة في الحوسبة — الحصة الأسبوعية', scheduledAt: new Date(Date.now() + 3600000).toISOString(), startedAt: null, durationMin: 90, status: 'SCHEDULED', recordingStatus: 'NONE', recordingKey: null, course: { code: 'CS101', slug: 'intro-to-computing', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' }, lesson: null, host: { fullName: 'Demo Faculty' } },
      { id: 'live-02', titleEn: 'Business Foundations — Seminar', titleAr: 'أساسيات الأعمال — ندوة', scheduledAt: new Date(Date.now() + 86400000).toISOString(), startedAt: null, durationMin: 60, status: 'SCHEDULED', recordingStatus: 'NONE', recordingKey: null, course: { code: 'BUS101', slug: 'business-foundations', titleEn: 'Business Foundations', titleAr: 'أساسيات الأعمال' }, lesson: null, host: { fullName: 'Demo Faculty' } },
    ]);
    if (!store['admin.live.sessions']) { store['admin.live.sessions'] = rows; writeStore(store); }
    return wrap(rows) as R;
  }
  if (clean === '/admin/facilities' && method === 'PUT') {
    const rows = getList(store, 'procurement.facilities', [{ id: 'facility-01', name: 'Main Library', status: 'OPERATIONAL', note: null, updatedAt: now() }, { id: 'facility-02', name: 'Computer Lab 1', status: 'MAINTENANCE', note: 'Scheduled equipment maintenance', updatedAt: now() }]);
    const existing = rows.find((x) => x.name === payload.name);
    if (existing) Object.assign(existing, payload, { updatedAt: now() }); else rows.push({ id: id(), ...payload, updatedAt: now() });
    store['procurement.facilities'] = rows; writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean.startsWith('/admin/facilities/') && method === 'DELETE') {
    const facilityId = clean.split('/').pop();
    store['procurement.facilities'] = getList(store, 'procurement.facilities', []).filter((x) => x.id !== facilityId);
    writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean === '/admin/payments') {
    const rows = [{ id: 'pay-01', purpose: 'course', description: 'Introduction to Computing course fee', amountFils: 250000, currency: 'AED', status: 'SUCCEEDED', provider: 'local-demo', providerRef: 'LOCAL-001', receiptNumber: 'DEMO-001', paidAt: now(), createdAt: now(), user: { fullName: 'Demo Student 01', email: 'student01@example.test' } }];
    return wrap(rows, { page: Number(query.get('page') || 1), totalPages: 1, totals: [{ purpose: 'course', count: 1, amountFils: 250000 }, { purpose: 'application-fee', count: 0, amountFils: 0 }], provider: 'local-demo' }) as R;
  }
  const roleRows = getList(store, 'admin.roles', [
    { key: 'SUPER_ADMIN', nameEn: 'Super Admin', userCount: 1, permissions: ['*'] },
    { key: 'UNIVERSITY_ADMIN', nameEn: 'University Admin', userCount: 1, permissions: ROLE_DEMO_PERMISSIONS.UNIVERSITY_ADMIN },
    { key: 'ADMISSIONS_OFFICER', nameEn: 'Admissions Officer', userCount: 2, permissions: ['dashboard.read', 'admissions.read', 'admissions.review', 'admissions.decide'] },
    { key: 'ADMISSIONS_REVIEWER', nameEn: 'Admissions Reviewer', userCount: 2, permissions: ['dashboard.read', 'admissions.read', 'admissions.review'] },
    { key: 'REGISTRAR', nameEn: 'Registrar', userCount: 1, permissions: ['dashboard.read', 'records.manage'] },
    { key: 'LIBRARIAN', nameEn: 'Librarian', userCount: 1, permissions: ['dashboard.read', 'library.manage'] },
    { key: 'PROCUREMENT_OFFICER', nameEn: 'Procurement Officer', userCount: 1, permissions: ['dashboard.read', 'procurement.manage'] },
    { key: 'ACADEMIC_ADMIN', nameEn: 'Academic Admin', userCount: 1, permissions: ['dashboard.read', 'academics.manage', 'lms.manage', 'live.host'] },
    { key: 'FINANCE_MANAGER', nameEn: 'Finance Manager', userCount: 1, permissions: ['dashboard.read', 'payments.read'] },
    { key: 'FINANCE_OFFICER', nameEn: 'Finance Officer', userCount: 2, permissions: ['dashboard.read', 'payments.read'] },
    { key: 'HR_MANAGER', nameEn: 'HR Manager', userCount: 1, permissions: ['dashboard.read', 'hr.manage'] },
    { key: 'HEAD_OF_DEPARTMENT', nameEn: 'Head of Department', userCount: 2, permissions: ['dashboard.read', 'department.lead', 'teach.own', 'lms.manage'] },
    { key: 'CONTENT_EDITOR', nameEn: 'Content Editor', userCount: 1, permissions: ['dashboard.read', 'cms.read'] },
    { key: 'FACULTY', nameEn: 'Faculty', userCount: 8, permissions: ['dashboard.read', 'teach.own'] },
  ]);
  if (clean === '/admin/roles' && method === 'GET') return wrap(roleRows) as R;
  if (clean.startsWith('/admin/roles/') && clean.endsWith('/permissions') && method === 'PUT') {
    const key = clean.split('/')[3]; const role = roleRows.find((x) => x.key === key);
    if (role) role.permissions = payload.permissionKeys ?? role.permissions;
    store['admin.roles'] = roleRows; writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean === '/admin/settings') return wrap(getList(store, 'site.settings', [
    { key: 'institution.name', valueEn: 'Al Ahmadiya University', valueAr: 'جامعة الأحمدية', confirmation: 'CONFIRMED', sourceUrl: null, note: 'Institution display name', updatedAt: now() },
    { key: 'admissions.status', valueEn: 'OPEN', valueAr: 'مفتوح', confirmation: 'CONFIRMED', sourceUrl: null, note: 'Demo intake status', updatedAt: now() },
    { key: 'contact.email', valueEn: 'info@example.test', valueAr: null, confirmation: 'CLIENT_CONFIRMATION_REQUIRED', sourceUrl: null, note: 'Replace with verified contact email', updatedAt: now() },
  ])) as R;
  if (clean.startsWith('/admin/settings/') && method === 'PUT') {
    const key = decodeURIComponent(clean.split('/').pop() || '');
    const rows = getList(store, 'site.settings', []); const item = rows.find((x) => x.key === key);
    if (item) Object.assign(item, payload, { updatedAt: now() }); else rows.push({ key, ...payload, updatedAt: now() });
    store['site.settings'] = rows; writeStore(store); return wrap(rows.find((x) => x.key === key)) as R;
  }
  if (clean === '/admin/staff-logins') return wrap([
    { id: 'login-demo-01', email: 'librarian.demo@example.test', success: true, reason: null, ip: 'Local browser', userAgent: 'Browser demo session', createdAt: now(), user: { fullName: 'Demo Librarian', roles: [{ role: { nameEn: 'Librarian' } }] } },
    { id: 'login-demo-02', email: 'registrar.demo@example.test', success: true, reason: null, ip: 'Local browser', userAgent: 'Browser demo session', createdAt: now(), user: { fullName: 'Demo Registrar', roles: [{ role: { nameEn: 'Registrar' } }] } },
  ], { page: Number(query.get('page') || 1), totalPages: 1, total: 2, last30Days: { success: 2, failed: 0 } }) as R;
  if (clean === '/admin/users-departments') return wrap([{ id: 'dept-01', nameEn: 'Computer Science' }, { id: 'dept-02', nameEn: 'Business Administration' }]) as R;
  const usersSeed = [{ id: 'staff-demo-01', email: 'librarian.demo@example.test', fullName: 'Demo Librarian', isActive: true, lastLoginAt: null, departmentId: null, department: null, roles: [{ role: { key: 'LIBRARIAN', nameEn: 'Librarian' } }] }, { id: 'staff-demo-02', email: 'registrar.demo@example.test', fullName: 'Demo Registrar', isActive: true, lastLoginAt: null, departmentId: 'dept-01', department: { nameEn: 'Academic Affairs' }, roles: [{ role: { key: 'REGISTRAR', nameEn: 'Registrar' } }] }, { id: 'staff-demo-03', email: 'faculty.demo@example.test', fullName: 'Demo Faculty', isActive: true, lastLoginAt: null, departmentId: 'dept-01', department: { nameEn: 'Computer Science' }, roles: [{ role: { key: 'FACULTY', nameEn: 'Faculty' } }] }];
  if (clean === '/admin/users' && method === 'GET') { const rows = getList(store, 'admin.users', usersSeed); const q = (query.get('q') || '').toLowerCase(); const filtered = q ? rows.filter((x) => `${x.fullName} ${x.email}`.toLowerCase().includes(q)) : rows; return wrap(filtered, listMeta(filtered)) as R; }
  if (clean === '/admin/users' && method === 'POST') { const rows = getList(store, 'admin.users', usersSeed); const roleKey = payload.roleKeys?.[0] ?? 'FACULTY'; const role = roleRows.find((x) => x.key === roleKey) ?? { key: roleKey, nameEn: roleKey }; const created = { id: id(), email: payload.email, fullName: payload.fullName, isActive: true, lastLoginAt: null, departmentId: payload.departmentId ?? null, department: null, roles: [{ role }] }; rows.push(created); store['admin.users'] = rows; writeStore(store); return wrap(created) as R; }
  if (clean.startsWith('/admin/users/') && method === 'PUT') { const recordId = clean.split('/').pop(); const rows = getList(store, 'admin.users', usersSeed); const row = rows.find((x) => x.id === recordId); if (row) { Object.assign(row, payload); if (payload.roleKeys) row.roles = payload.roleKeys.map((key: string) => ({ role: roleRows.find((x) => x.key === key) ?? { key, nameEn: key } })); } store['admin.users'] = rows; writeStore(store); return wrap({ success: true }) as R; }
  if (clean === '/admin/live/sessions') return wrap(getList(store, 'admin.live.sessions', [{ id: 'live-01', titleEn: 'Introduction to Computing — Weekly Class', scheduledAt: new Date(Date.now() + 3600000).toISOString(), durationMin: 90, status: 'SCHEDULED', recordingStatus: 'NONE', course: { code: 'CS101', titleEn: 'Introduction to Computing' }, host: { fullName: 'Demo Faculty' } }])) as R;
  if (clean === '/teach/overview') return wrap({
    courses: [{ id: 'course-01', code: 'CS101', slug: 'intro-to-computing', titleEn: 'Introduction to Computing', imagePath: '/images/courses/cs101.jpg', publishStatus: 'PUBLISHED', students: 42, lectures: 8, quizzes: 2 }],
    classes: [{ id: 'live-01', titleEn: 'Introduction to Computing — Weekly Class', scheduledAt: new Date(Date.now() + 3600000).toISOString(), durationMin: 90, status: 'SCHEDULED', course: { id: 'course-01', code: 'CS101', titleEn: 'Introduction to Computing' } }],
    stats: { todayClasses: 1, students: 42, pendingGrading: 3, teachingHoursWeek: 8 },
    attendance: { present: 35, late: 4, partial: 2, absent: 1, classes: 8 },
    toGrade: [{ id: 'submission-01', submittedAt: now(), user: { fullName: 'Demo Student 01' }, assignment: { id: 'assignment-01', titleEn: 'Programming exercise', dueAt: new Date(Date.now() + 3 * 86400000).toISOString(), course: { id: 'course-01', code: 'CS101' } } }],
    notifications: [],
  }) as R;
  const cmsSeeds: Record<string, any[]> = {
    colleges: [{ id: 'college-01', slug: 'computing', nameEn: 'College of Computing', nameAr: 'كلية الحوسبة', summaryEn: 'Demo content for computing programmes', summaryAr: 'محتوى تجريبي لبرامج الحوسبة', overviewEn: '', overviewAr: '', visionEn: '', visionAr: '', missionEn: '', missionAr: '', imagePath: '/images/campus/academic.jpg', publishStatus: 'PUBLISHED', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }, { id: 'college-02', slug: 'business', nameEn: 'College of Business', nameAr: 'كلية الأعمال', summaryEn: 'Demo business school content', summaryAr: 'محتوى تجريبي لكلية الأعمال', publishStatus: 'PUBLISHED', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }],
    departments: [{ id: 'dept-01', slug: 'computer-science', collegeId: 'college-01', nameEn: 'Computer Science', nameAr: 'علوم الحاسوب', overviewEn: '', overviewAr: '', objectivesEn: [], objectivesAr: [], researchAreasEn: [], researchAreasAr: [], publishStatus: 'PUBLISHED', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }, { id: 'dept-02', slug: 'business-admin', collegeId: 'college-02', nameEn: 'Business Administration', nameAr: 'إدارة الأعمال', publishStatus: 'PUBLISHED', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }],
    programs: [{ id: 'program-01', slug: 'computer-science', departmentId: 'dept-01', degreeLevel: 'BACHELOR', nameEn: 'Bachelor of Computer Science', nameAr: 'بكالوريوس علوم الحاسوب', summaryEn: 'Sample undergraduate programme', summaryAr: 'برنامج جامعي تجريبي', durationYears: 4, totalCredits: 120, outcomesEn: [], outcomesAr: [], requirementsEn: [], requirementsAr: [], careersEn: [], careersAr: [], isFeatured: true, publishStatus: 'PUBLISHED', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }, { id: 'program-02', slug: 'business-administration', departmentId: 'dept-02', degreeLevel: 'BACHELOR', nameEn: 'Bachelor of Business Administration', nameAr: 'بكالوريوس إدارة الأعمال', summaryEn: 'Sample business programme', summaryAr: 'برنامج أعمال تجريبي', durationYears: 4, totalCredits: 120, outcomesEn: [], outcomesAr: [], requirementsEn: [], requirementsAr: [], careersEn: [], careersAr: [], isFeatured: false, publishStatus: 'PUBLISHED', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }],
    courses: [{ id: 'course-01', slug: 'intro-to-computing', code: 'CS101', departmentId: 'dept-01', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة', descriptionEn: 'A sample introduction to computing.', descriptionAr: 'مقدمة تجريبية إلى الحوسبة.', creditHours: 3, courseType: 'CORE', outcomesEn: [], outcomesAr: [], syllabus: [], assessment: [], imagePath: null, isFeatured: true, publishStatus: 'PUBLISHED', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }],
    faculty: [{ id: 'faculty-01', slug: 'demo-faculty', fullNameEn: 'Demo Faculty Member', fullNameAr: 'عضو هيئة تدريس تجريبي', titleEn: 'Lecturer', titleAr: 'محاضر', email: 'faculty.demo@example.test', phone: null, photoPath: null, bioEn: 'Synthetic faculty profile for preview only.', bioAr: 'ملف تعريفي تجريبي للمعاينة فقط.', specializationEn: 'Computing', specializationAr: 'الحوسبة', education: [], researchInterestsEn: [], researchInterestsAr: [], awards: [], consentToPublish: false, publishStatus: 'DRAFT', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }],
    news: [{ id: 'news-01', slug: 'demo-campus-update', category: 'announcement', titleEn: 'Campus update — demo content', titleAr: 'تحديث الحرم الجامعي — محتوى تجريبي', excerptEn: 'Sample news item for local preview.', excerptAr: 'خبر تجريبي للمعاينة المحلية.', bodyEn: 'This is synthetic preview content and is not an official university announcement.', bodyAr: 'هذا محتوى معاينة تجريبي وليس إعلاناً رسمياً للجامعة.', publishedAt: now(), isFeatured: false, isAnnouncement: true, publishStatus: 'DRAFT' }],
    events: [{ id: 'event-01', slug: 'demo-open-day', category: 'academic', titleEn: 'Open day — demo event', titleAr: 'اليوم المفتوح — فعالية تجريبية', summaryEn: 'Sample event for local preview.', summaryAr: 'فعالية تجريبية للمعاينة المحلية.', overviewEn: '', overviewAr: '', startsAt: new Date(Date.now() + 7 * 86400000).toISOString(), endsAt: new Date(Date.now() + 7 * 86400000 + 7200000).toISOString(), venueEn: 'Main campus', venueAr: 'الحرم الرئيسي', isFeatured: false, publishStatus: 'DRAFT' }],
    publications: [{ id: 'publication-01', slug: 'demo-research', type: 'report', titleEn: 'Sample research record', titleAr: 'سجل بحثي تجريبي', abstractEn: 'Synthetic sample record for preview.', abstractAr: 'سجل تجريبي للمعاينة.', findingsEn: [], findingsAr: [], keywords: ['demo'], authors: [{ name: 'Demo Author', affiliation: 'Demo Department', position: 1 }], isFeatured: false, publishStatus: 'DRAFT', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }],
    faqs: [{ id: 'faq-01', scope: 'admissions', questionEn: 'Is this a live admissions system?', questionAr: 'هل هذا نظام قبول مباشر؟', answerEn: 'No. This is a local demonstration only.', answerAr: 'لا. هذه نسخة تجريبية محلية فقط.', sortOrder: 1, publishStatus: 'PUBLISHED' }],
    'campus-tour': [{ id: 'tour-01', slug: 'demo-library', kind: 'library', titleEn: 'Library — demo stop', titleAr: 'المكتبة — محطة تجريبية', descriptionEn: 'Sample campus tour stop.', descriptionAr: 'محطة جولة جامعية تجريبية.', imagePath: '/images/campus/library.jpg', panoramaUrl: null, isHeritage: false, sortOrder: 1, publishStatus: 'DRAFT' }],
    heritage: [{ id: 'heritage-01', yearLabel: 'Demo', sortOrder: 1, titleEn: 'Historical entry awaiting verification', titleAr: 'مدخل تاريخي بانتظار التحقق', bodyEn: 'Placeholder only — replace with verified institutional history.', bodyAr: 'عنصر نائب فقط — استبدله بتاريخ مؤسسي موثق.', sourceUrls: [], caveatEn: 'Not an official historical claim.', caveatAr: 'ليس ادعاءً تاريخياً رسمياً.', confirmation: 'CLIENT_CONFIRMATION_REQUIRED', publishStatus: 'DRAFT' }],
    media: [],
  };
  const cmsMatch = clean.match(/^\/admin\/cms\/([^/]+)(?:\/([^/]+))?(?:\/(status))?$/);
  if (cmsMatch) {
    const [, resource, recordId, statusAction] = cmsMatch;
    let rows = getList(store, `cms:${resource}`, cmsSeeds[resource] ?? []);
    if (!store[`cms:${resource}`]) { store[`cms:${resource}`] = rows; }
    if (recordId && statusAction && method === 'POST') {
      const row = rows.find((x) => x.id === recordId);
      if (row) row.publishStatus = payload.status;
      store[`cms:${resource}`] = rows; writeStore(store); return wrap(row ?? { success: false }) as R;
    }
    if (recordId && method === 'GET') return wrap(rows.find((x) => x.id === recordId) ?? rows[0] ?? {}) as R;
    if (recordId && method === 'PUT') {
      const index = rows.findIndex((x) => x.id === recordId);
      if (index >= 0) rows[index] = { ...rows[index], ...payload };
      store[`cms:${resource}`] = rows; writeStore(store); return wrap(rows[index] ?? payload) as R;
    }
    if (recordId && method === 'DELETE') {
      rows = rows.filter((x) => x.id !== recordId); store[`cms:${resource}`] = rows; writeStore(store); return wrap({ success: true }) as R;
    }
    if (!recordId && method === 'POST') {
      const row = { id: id(), ...payload, createdAt: now(), updatedAt: now() };
      rows.push(row); store[`cms:${resource}`] = rows; writeStore(store); return wrap(row) as R;
    }
    return wrap(rows, listMeta(rows)) as R;
  }
  if (clean === '/admin/academics/eligibility-check' && method === 'POST') {
    const programs = getList(store, 'cms:programs', cmsSeeds.programs);
    return wrap(programs.map((program) => ({ program: { id: program.id, nameEn: program.nameEn, degreeLevel: program.degreeLevel, publishStatus: program.publishStatus, college: { nameEn: program.departmentId === 'dept-02' ? 'College of Business' : 'College of Computing' } }, status: Number(payload.overallPercent || 0) >= 60 ? 'ELIGIBLE' : 'NOT_ELIGIBLE', unmet: Number(payload.overallPercent || 0) >= 60 ? [] : [{ requirement: 'Overall percentage', required: 60, actual: Number(payload.overallPercent || 0) }], ruleConfirmation: 'CLIENT_CONFIRMATION_REQUIRED' }))) as R;
  }
  if (clean.startsWith('/admin/academics/programs/')) {
    const parts = clean.split('/');
    const programId = parts[4];
    const programs = getList(store, 'cms:programs', cmsSeeds.programs);
    const program = programs.find((p) => p.id === programId) ?? programs[0];
    if (parts.length === 5 && method === 'GET') return wrap({ ...program, curriculum: getList(store, `academics:${programId}:curriculum`, [{ year: 1, term: 1, course: { id: 'course-01', code: 'CS101', titleEn: 'Introduction to Computing', creditHours: 3 } }]), eligibilityRules: getList(store, `academics:${programId}:eligibility`, [{ qualification: 'HIGH_SCHOOL', minOverallPercent: '60', subjectMinimums: [], englishRequirementEn: 'Basic proficiency', notesEn: 'Demo rule — confirm with the institution', isActive: true, confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }]) }) as R;
    if (parts[5] === 'curriculum' && method === 'PUT') { store[`academics:${programId}:curriculum`] = payload.items ?? []; writeStore(store); return wrap({ success: true }) as R; }
    if (parts[5] === 'eligibility' && method === 'PUT') { store[`academics:${programId}:eligibility`] = payload.rules ?? []; writeStore(store); return wrap({ success: true }) as R; }
  }
  if (clean === '/admin/cms/courses') return wrap(cmsSeeds.courses.map(({ id: courseId, code, titleEn }) => ({ id: courseId, code, titleEn }))) as R;
  const adminApplications = getList(store, 'admissions.applications', [
    { id: 'app-001', reference: 'AAU-2026-001', status: 'UNDER_REVIEW', submittedAt: now(), decisionNote: null, applicant: { fullName: 'Demo Applicant 01', email: 'applicant01@example.test' }, program: { nameEn: 'Bachelor of Business Administration' }, personal: { fullName: 'Demo Applicant 01', dateOfBirth: '2005-05-12', nationality: 'Demo' }, contact: { email: 'applicant01@example.test', city: 'Demo City', country: 'UAE' }, academic: { qualification: 'High school', overallPercent: 82 }, documents: [{ id: 'doc-001', docType: 'IDENTITY', originalName: 'demo-identity.txt', mimeType: 'text/plain', sizeBytes: 64, status: 'UPLOADED' }], statusHistory: [{ id: 'history-01', fromStatus: 'SUBMITTED', toStatus: 'UNDER_REVIEW', note: null, createdAt: now() }] },
    { id: 'app-002', reference: 'AAU-2026-002', status: 'SUBMITTED', submittedAt: now(), decisionNote: null, applicant: { fullName: 'Demo Applicant 02', email: 'applicant02@example.test' }, program: { nameEn: 'Bachelor of Computer Science' }, personal: { fullName: 'Demo Applicant 02' }, contact: { email: 'applicant02@example.test' }, academic: { qualification: 'High school', overallPercent: 74 }, documents: [], statusHistory: [] },
  ]);
  if (clean === '/admin/applications' && method === 'GET') {
    const status = query.get('status'), q = (query.get('q') || '').toLowerCase();
    const filtered = adminApplications.filter((a) => (!status || a.status === status) && (!q || `${a.reference} ${a.applicant?.fullName} ${a.applicant?.email}`.toLowerCase().includes(q)));
    const page = Number(query.get('page') || 1), pageSize = Number(query.get('pageSize') || 20), start = (page - 1) * pageSize;
    return wrap(filtered.slice(start, start + pageSize), { page, pageSize, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) }) as R;
  }
  if (clean.startsWith('/admin/applications/')) {
    const appId = clean.split('/')[3];
    const apps = getList(store, 'admissions.applications', [
      { id: 'app-001', reference: 'AAU-2026-001', status: 'UNDER_REVIEW', submittedAt: now(), decisionNote: null, applicant: { fullName: 'Demo Applicant 01', email: 'applicant01@example.test' }, program: { nameEn: 'Bachelor of Business Administration' }, personal: { fullName: 'Demo Applicant 01', dateOfBirth: '2005-05-12', nationality: 'Demo' }, contact: { email: 'applicant01@example.test', city: 'Demo City', country: 'UAE' }, academic: { qualification: 'High school', overallPercent: 82 }, documents: [{ id: 'doc-001', docType: 'IDENTITY', originalName: 'demo-identity.txt', mimeType: 'text/plain', sizeBytes: 64, status: 'UPLOADED' }], statusHistory: [{ id: 'history-01', fromStatus: 'SUBMITTED', toStatus: 'UNDER_REVIEW', note: null, createdAt: now() }] },
      { id: 'app-002', reference: 'AAU-2026-002', status: 'SUBMITTED', submittedAt: now(), decisionNote: null, applicant: { fullName: 'Demo Applicant 02', email: 'applicant02@example.test' }, program: { nameEn: 'Bachelor of Computer Science' }, personal: { fullName: 'Demo Applicant 02' }, contact: { email: 'applicant02@example.test' }, academic: { qualification: 'High school', overallPercent: 74 }, documents: [], statusHistory: [] },
    ]);
    const app = apps.find((x) => x.id === appId) ?? apps[0];
    if (clean.endsWith('/transition') && method === 'POST') {
      if (app) { app.statusHistory = [...(app.statusHistory ?? []), { id: id(), fromStatus: app.status, toStatus: payload.to, note: payload.note ?? null, createdAt: now() }]; app.status = payload.to; app.decisionNote = payload.note ?? null; }
      store['admissions.applications'] = apps; writeStore(store); return wrap({ success: true }) as R;
    }
    return wrap(app ?? {}) as R;
  }
  const courseSeed = {
    id: 'course-01', slug: 'intro-to-computing', code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة',
    descriptionEn: 'Sample course for the local ERP preview.', descriptionAr: 'مقرر تجريبي لمعاينة نظام تخطيط الموارد.',
    outcomesEn: ['Understand computing fundamentals'], outcomesAr: ['فهم أساسيات الحوسبة'], creditHours: 3, priceFils: 250000, currency: 'AED',
    imagePath: null, departmentId: 'dept-01', teacherId: 'faculty-01', publishStatus: 'PUBLISHED', isFeatured: true, deliveryMode: 'RECORDED',
    liveStartsOn: null, liveEndsOn: null, liveSlots: [],
    topics: [{ id: 'topic-01', titleEn: 'Programming basics', titleAr: 'أساسيات البرمجة' }],
    lessons: [{ id: 'lesson-01', titleEn: 'Variables and data types', titleAr: 'المتغيرات وأنواع البيانات', descriptionEn: 'An introductory lesson.', descriptionAr: 'درس تمهيدي.', status: 'PUBLISHED', isPreview: true, videoBytes: null, topicId: 'topic-01', liveSessionId: null }],
    notes: [{ id: 'note-01', titleEn: 'Course outline', titleAr: 'مخطط المقرر', bodyEn: 'Sample notes for preview.', fileName: null, lessonId: null }],
    quizzes: [{ id: 'quiz-01', titleEn: 'Programming basics quiz', passPercent: 60, questions: [], lessonId: 'lesson-01' }],
    liveSessions: [], enrollments: [{ id: 'enrol-01', status: 'ACTIVE' }],
  };
  const courseRows = getList(store, 'lms.courses', [courseSeed, { ...courseSeed, id: 'course-02', slug: 'business-foundations', code: 'BUS101', titleEn: 'Business Foundations', titleAr: 'أساسيات الأعمال', departmentId: 'dept-02', teacherId: null, deliveryMode: 'LIVE', topics: [], lessons: [], notes: [], quizzes: [], enrollments: [] }]);
  if (clean === '/admin/lms/options') return wrap({ departments: [{ id: 'dept-01', nameEn: 'Computer Science', college: { nameEn: 'College of Computing' } }, { id: 'dept-02', nameEn: 'Business Administration', college: { nameEn: 'College of Business' } }], teachers: [{ id: 'faculty-01', fullName: 'Demo Faculty Member', email: 'faculty.demo@example.test' }] }) as R;
  if (clean === '/admin/lms/courses' && method === 'POST') {
    const created = { ...courseSeed, ...payload, id: id(), slug: String(payload.slug || payload.titleEn || 'new-course').toLowerCase().replace(/[^a-z0-9]+/g, '-'), publishStatus: 'DRAFT', topics: [], lessons: [], notes: [], quizzes: [], liveSessions: [], enrollments: [] };
    courseRows.push(created); store['lms.courses'] = courseRows; writeStore(store); return wrap({ id: created.id }) as R;
  }
  if (clean === '/admin/lms/courses') return wrap(courseRows.map((x) => ({ ...x, _count: { lessons: x.lessons.length, notes: x.notes.length, quizzes: x.quizzes.length, liveSessions: x.liveSessions.length }, activeStudents: x.enrollments.length }))) as R;
  if (clean.startsWith('/admin/lms/courses/')) {
    const parts = clean.split('/'); const courseId = parts[4]; const course = courseRows.find((x) => x.id === courseId) ?? courseRows[0];
    if (parts.length === 5 && method === 'GET') return wrap(course) as R;
    if (parts[5] === 'details' && method === 'PUT') {
      Object.assign(course, payload); store['lms.courses'] = courseRows; writeStore(store); return wrap({ id: course.id }) as R;
    }
    if (parts[5] === 'live-plan' && method === 'PUT') {
      Object.assign(course, payload); store['lms.courses'] = courseRows; writeStore(store); return wrap({ success: true }) as R;
    }
    if (parts[5] === 'publish' && method === 'POST') {
      course.publishStatus = payload.publish ? 'PUBLISHED' : 'DRAFT'; store['lms.courses'] = courseRows; writeStore(store); return wrap({ success: true }) as R;
    }
    if (parts[5] === 'topics' && parts.length === 6 && method === 'POST') {
      course.topics.push({ id: id(), titleEn: payload.titleEn, titleAr: payload.titleAr }); store['lms.courses'] = courseRows; writeStore(store); return wrap({ success: true }) as R;
    }
    if (parts[5] === 'topics' && parts[6] === 'reorder' && method === 'POST') {
      course.topics = [...course.topics].sort((a, b) => payload.ids.indexOf(a.id) - payload.ids.indexOf(b.id)); store['lms.courses'] = courseRows; writeStore(store); return wrap({ success: true }) as R;
    }
    if (parts[5] === 'lessons' && parts.length === 6 && method === 'POST') {
      course.lessons.push({ id: id(), status: 'DRAFT', isPreview: false, videoBytes: null, topicId: null, liveSessionId: null, descriptionEn: null, descriptionAr: null, ...payload }); store['lms.courses'] = courseRows; writeStore(store); return wrap({ success: true }) as R;
    }
    if (parts[5] === 'lessons' && parts.length === 6 && method === 'PUT') {
      const row = course.lessons.find((x) => x.id === payload.id); if (row) Object.assign(row, payload); store['lms.courses'] = courseRows; writeStore(store); return wrap({ success: true }) as R;
    }
    if (parts[5] === 'lessons' && parts[6] === 'reorder' && method === 'POST') {
      course.lessons = [...course.lessons].sort((a, b) => payload.ids.indexOf(a.id) - payload.ids.indexOf(b.id)); store['lms.courses'] = courseRows; writeStore(store); return wrap({ success: true }) as R;
    }
    if (parts[5] === 'notes' && parts.length === 6 && method === 'POST') {
      course.notes.push({ id: id(), bodyEn: null, fileName: null, lessonId: null, ...payload }); store['lms.courses'] = courseRows; writeStore(store); return wrap({ success: true }) as R;
    }
    if (parts[5] === 'quizzes' && parts.length === 6 && method === 'POST') {
      course.quizzes.push({ id: id(), ...payload }); store['lms.courses'] = courseRows; writeStore(store); return wrap({ success: true }) as R;
    }
  }
  if (clean.startsWith('/admin/lms/topics/')) {
    const topicId = clean.split('/').pop(); const courses = getList(store, 'lms.courses', [courseSeed]);
    for (const course of courses) {
      const topic = course.topics.find((x) => x.id === topicId);
      if (topic && method === 'PUT') Object.assign(topic, payload);
      if (topic && method === 'DELETE') course.topics = course.topics.filter((x) => x.id !== topicId);
    }
    store['lms.courses'] = courses; writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean.startsWith('/admin/lms/lessons/')) {
    const lessonId = clean.split('/')[4]; const courses = getList(store, 'lms.courses', [courseSeed]);
    for (const course of courses) {
      const lesson = course.lessons.find((x) => x.id === lessonId);
      if (lesson && method === 'PUT') Object.assign(lesson, payload);
      if (lesson && method === 'DELETE') course.lessons = course.lessons.filter((x) => x.id !== lessonId);
    }
    store['lms.courses'] = courses; writeStore(store);
    if (clean.endsWith('/preview')) return wrap({ url: '' }) as R;
    return wrap({ success: true }) as R;
  }
  if (clean.startsWith('/admin/lms/notes/') || clean.startsWith('/admin/lms/quizzes/')) {
    const recordId = clean.split('/').pop(); const courses = getList(store, 'lms.courses', [courseSeed]);
    for (const course of courses) {
      course.notes = course.notes.filter((x) => x.id !== recordId);
      course.quizzes = course.quizzes.filter((x) => x.id !== recordId);
    }
    store['lms.courses'] = courses; writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean === '/admin/facilities' && method === 'PUT') {
    const rows = getList(store, 'procurement.facilities', [{ id: 'facility-01', name: 'Main Library', status: 'OPERATIONAL', note: null, updatedAt: now() }, { id: 'facility-02', name: 'Computer Lab 1', status: 'MAINTENANCE', note: 'Scheduled maintenance', updatedAt: now() }]);
    const index = rows.findIndex((x) => x.name === payload.name);
    if (index >= 0) rows[index] = { ...rows[index], ...payload, updatedAt: now() }; else rows.push({ id: id(), ...payload, updatedAt: now() });
    store['procurement.facilities'] = rows; writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean.startsWith('/admin/facilities/') && method === 'DELETE') {
    const rows = getList(store, 'procurement.facilities', []).filter((x) => x.id !== clean.split('/').pop());
    store['procurement.facilities'] = rows; writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean === '/admin/overview/admissions') return wrap({
    totals: { submitted: 18, inReview: 12, approved: 24, rejected: 4, drafts: 6, docsToVerify: 7 },
    pipeline: [{ stage: 'Submitted', count: 18 }, { stage: 'Under review', count: 12 }, { stage: 'Approved', count: 24 }, { stage: 'Rejected', count: 4 }],
    monthly: [{ month: '2026-06', count: 18 }, { month: '2026-07', count: 22 }, { month: '2026-08', count: 31 }, { month: '2026-09', count: 26 }, { month: '2026-10', count: 39 }, { month: '2026-11', count: 18 }],
    recent: [{ id: 'app-001', reference: 'AAU-2026-001', status: 'UNDER_REVIEW', submittedAt: '2026-11-24T10:00:00Z', applicant: { fullName: 'Demo Applicant 01' }, program: { nameEn: 'Bachelor of Business Administration' } }, { id: 'app-002', reference: 'AAU-2026-002', status: 'SUBMITTED', submittedAt: '2026-11-23T10:00:00Z', applicant: { fullName: 'Demo Applicant 02' }, program: { nameEn: 'Computer Science' } }],
  }) as R;
  if (clean === '/admin/applications') {
    const rows = getList(store, 'admissions.applications', [
      { id: 'app-001', reference: 'AAU-2026-001', status: 'UNDER_REVIEW', submittedAt: now(), applicant: { fullName: 'Demo Applicant 01', email: 'applicant01@example.test' }, program: { nameEn: 'Bachelor of Business Administration' } },
      { id: 'app-002', reference: 'AAU-2026-002', status: 'SUBMITTED', submittedAt: now(), applicant: { fullName: 'Demo Applicant 02', email: 'applicant02@example.test' }, program: { nameEn: 'Computer Science' } },
      { id: 'app-003', reference: 'AAU-2026-003', status: 'DOCUMENTS_PENDING', submittedAt: now(), applicant: { fullName: 'Demo Applicant 03', email: 'applicant03@example.test' }, program: { nameEn: 'Accounting' } },
    ]);
    const status = query.get('status'); const term = (query.get('q') || '').toLowerCase();
    const filtered = rows.filter((r) => (!status || r.status === status) && (!term || `${r.reference} ${r.applicant.fullName} ${r.applicant.email}`.toLowerCase().includes(term)));
    return wrap(filtered, listMeta(filtered)) as R;
  }
  if (clean === '/admin/records/overview') return wrap({
    totals: { students: 344, registrations: 286, thisMonth: 24, onTrackPercent: 87 },
    registrations: { active: 238, pending: 32, cancelled: 16 },
    events: [{ id: 'event-01', titleEn: 'Semester examinations', startsAt: '2026-12-10T08:00:00Z', category: 'academic' }, { id: 'event-02', titleEn: 'Winter break begins', startsAt: '2026-12-22T08:00:00Z', category: 'holiday' }],
    audit: [{ name: 'Demo Student 01', programme: 'Computer Science', earned: 72, required: 120 }, { name: 'Demo Student 02', programme: 'Business', earned: 64, required: 120 }],
    prerequisiteIssues: [], prerequisiteIssueCount: 0, activity: [{ at: now(), text: 'Demo transcript record reviewed' }],
  }) as R;
  if (clean === '/admin/records/students') { const rows = [{ id: 'student-demo-01', fullName: 'Demo Student 01', email: 'student01@example.test', _count: { enrollments: 4, results: 12 } }, { id: 'student-demo-02', fullName: 'Demo Student 02', email: 'student02@example.test', _count: { enrollments: 3, results: 9 } }]; const q = (query.get('q') || '').toLowerCase(); const filtered = q ? rows.filter((x) => `${x.fullName} ${x.email}`.toLowerCase().includes(q)) : rows; return wrap(filtered, listMeta(filtered)) as R; }
  if (clean === '/admin/finance/summary') return wrap({
    collectedFils: 125000000, payments: 148, thisMonthFils: 18200000, dueFils: 16400000, dueCount: 16, payingStudents: 132,
    monthly: [{ month: '2026-06', collectedFils: 14800000 }, { month: '2026-07', collectedFils: 17200000 }, { month: '2026-08', collectedFils: 19100000 }, { month: '2026-09', collectedFils: 16400000 }, { month: '2026-10', collectedFils: 21800000 }, { month: '2026-11', collectedFils: 18200000 }],
    aging: [{ label: '0–30', fils: 7200000 }, { label: '31–60', fils: 5100000 }, { label: '61–90', fils: 4100000 }],
    recent: [{ id: 'pay-01', amountFils: 250000, currency: 'AED', status: 'SUCCEEDED', receiptNumber: 'DEMO-001', paidAt: now(), createdAt: now(), purpose: 'course', user: { id: 'student-demo-01', fullName: 'Demo Student 01' } }],
    dueStudents: [{ id: 'student-demo-02', fullName: 'Demo Student 02', email: 'student02@example.test', course: 'Computer Science', fils: 1200000, since: '2026-11-01T00:00:00Z' }],
  }) as R;
  if (clean === '/admin/finance/students') { const rows = [{ id: 'student-demo-01', name: 'Demo Student 01', email: 'student01@example.test', courses: [{ code: 'CS101', title: 'Computer Science', status: 'ACTIVE' }], paidFils: 250000, dueFils: 0, lastPaidAt: now() }, { id: 'student-demo-02', name: 'Demo Student 02', email: 'student02@example.test', courses: [{ code: 'BUS101', title: 'Business', status: 'PENDING_PAYMENT' }], paidFils: 0, dueFils: 1200000, lastPaidAt: null }]; const q = (query.get('q') || '').toLowerCase(); const filtered = q ? rows.filter((x) => `${x.name} ${x.email}`.toLowerCase().includes(q)) : rows; return wrap(filtered, listMeta(filtered)) as R; }
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
  if (clean.startsWith('/admin/records/students/') && clean.endsWith('/transcript')) return wrap({
    student: { studentId: 'DEMO-2026-001', fullName: 'Demo Student 01', email: 'student01@example.test' },
    programme: { nameEn: 'Bachelor of Computer Science', degreeLevel: 'BACHELOR' },
    terms: [{ term: '2026 Fall', gpa: 3.42, courses: [{ term: '2026 Fall', marks: 88, grade: 'A', gradePoints: 4, creditHours: 3, course: { code: 'CS101', titleEn: 'Introduction to Computing' } }, { term: '2026 Fall', marks: 81, grade: 'B+', gradePoints: 3.5, creditHours: 3, course: { code: 'CS105', titleEn: 'Digital Literacy' } }] }],
    cgpa: 3.42, credits: 24, issuedAt: now(),
  }) as R;
  if (clean.startsWith('/teach/courses/') && clean.endsWith('/students')) return wrap([
    { userId: 'student-demo-01', name: 'Demo Student 01', email: 'student01@example.test', lecturesDone: 5, lecturesTotal: 8, quizzesPassed: 1, quizzesTried: 1, quizzesTotal: 2, classesAttended: 7, classesHeld: 8, attendancePercent: 88, lastActive: now() },
    { userId: 'student-demo-02', name: 'Demo Student 02', email: 'student02@example.test', lecturesDone: 3, lecturesTotal: 8, quizzesPassed: 0, quizzesTried: 1, quizzesTotal: 2, classesAttended: 6, classesHeld: 8, attendancePercent: 75, lastActive: now() },
  ], { course: { code: 'CS101', titleEn: 'Introduction to Computing' } }) as R;
  if (clean.startsWith('/teach/courses/') && clean.includes('/students/')) return wrap({
    student: { fullName: 'Demo Student 01', email: 'student01@example.test', enrolledAt: now() },
    lectures: [{ id: 'lesson-01', titleEn: 'Variables and data types', completedAt: now(), watchedSec: 1200 }],
    quizzes: [{ id: 'quiz-01', titleEn: 'Programming basics quiz', attempts: 1, best: { score: 8, total: 10 }, passed: true }],
    classes: [{ id: 'live-01', titleEn: 'Introduction to Computing', scheduledAt: now(), attended: true, minutes: 85 }],
  }) as R;
  if (clean.startsWith('/admin/live/sessions/')) {
    const sessionId = clean.split('/')[4];
    const sessions = getList(store, 'admin.live.sessions', [{ id: 'live-01', titleEn: 'Introduction to Computing — Weekly Class', titleAr: 'مقدمة في الحوسبة — الحصة الأسبوعية', scheduledAt: new Date(Date.now() + 3600000).toISOString(), startedAt: null, durationMin: 90, status: 'SCHEDULED', recordingStatus: 'NONE', recordingKey: null, course: { code: 'CS101', slug: 'intro-to-computing', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' }, lesson: null, host: { fullName: 'Demo Faculty' } }]);
    const session = sessions.find((x) => x.id === sessionId) ?? sessions[0];
    if (clean.endsWith('/attendance')) return wrap([{ userId: 'student-demo-01', name: 'Demo Student 01', email: 'student01@example.test', firstJoinedAt: now(), lastLeftAt: now(), joinCount: 1, minutes: 85, percent: 94, status: 'PRESENT', onlineNow: false }], { classMinutes: 90, presentPercent: 75, lateAfterMin: 10, enrolled: 2, present: 1, late: 0, partial: 1, absent: 0 }) as R;
    if (clean.endsWith('/recording-url')) return wrap({ url: '' }) as R;
    if (clean.endsWith('/recording') && method === 'POST') { session.recordingStatus = 'DRAFT'; store['admin.live.sessions'] = sessions; writeStore(store); return wrap({ success: true }) as R; }
    if (clean.endsWith('/start') && method === 'POST') { session.status = 'LIVE'; session.startedAt = now(); store['admin.live.sessions'] = sessions; writeStore(store); return wrap({ success: true }) as R; }
    if (clean.endsWith('/end') && method === 'POST') { session.status = 'ENDED'; store['admin.live.sessions'] = sessions; writeStore(store); return wrap({ success: true }) as R; }
    if (clean.endsWith('/cancel') && method === 'POST') { session.status = 'CANCELLED'; store['admin.live.sessions'] = sessions; writeStore(store); return wrap({ success: true }) as R; }
    if (clean.endsWith('/publish') && method === 'POST') { session.recordingStatus = 'PUBLISHED'; store['admin.live.sessions'] = sessions; writeStore(store); return wrap({ success: true }) as R; }
    if (method === 'GET') return wrap(session) as R;
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
  if (clean === '/me/overview') return wrap({ applications: 1, activeCourses: 2, pendingPayments: 0, unreadNotifications: 1, liveNow: 0 }) as R;
  if (clean === '/me/courses') return wrap([
    { id: 'enrol-demo-01', course: { slug: 'intro-to-computing', code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة', deliveryMode: 'RECORDED', _count: { lessons: 8, notes: 2, quizzes: 2 } } },
    { id: 'enrol-demo-02', course: { slug: 'business-foundations', code: 'BUS101', titleEn: 'Business Foundations', titleAr: 'أساسيات الأعمال', deliveryMode: 'LIVE', _count: { lessons: 5, notes: 1, quizzes: 1 } } },
  ]) as R;
  if (clean === '/me/live') return wrap([{ id: 'live-01', titleEn: 'Introduction to Computing — Weekly Class', titleAr: 'مقدمة في الحوسبة — الحصة الأسبوعية', scheduledAt: new Date(Date.now() + 3600000).toISOString(), durationMin: 90, status: 'SCHEDULED', course: { slug: 'intro-to-computing', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' }, lesson: { id: 'lesson-01' }, attendance: [] }]) as R;
  if (clean.startsWith('/me/courses/')) return wrap({
    topics: [{ id: 'topic-01', titleEn: 'Programming basics', titleAr: 'أساسيات البرمجة' }],
    slug: clean.split('/').pop(), code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة', deliveryMode: 'RECORDED',
    lessons: [{ id: 'lesson-01', titleEn: 'Variables and data types', titleAr: 'المتغيرات وأنواع البيانات', descriptionEn: 'A sample lesson for local preview.', descriptionAr: 'درس تجريبي للمعاينة المحلية.', durationSec: 1200, hasVideo: false, topicId: 'topic-01', completed: false, positionSec: 0 }],
    notes: [{ id: 'note-01', titleEn: 'Course outline', titleAr: 'مخطط المقرر', bodyEn: 'Synthetic notes for local preview only.', bodyAr: 'ملاحظات تجريبية للمعاينة المحلية فقط.', fileName: null, hasFile: false }],
    quizzes: [{ id: 'quiz-01', titleEn: 'Programming basics quiz', titleAr: 'اختبار أساسيات البرمجة', passPercent: 60, questions: [{ textEn: 'What does CPU stand for?', textAr: 'ماذا تعني CPU؟', options: [{ en: 'Central Processing Unit', ar: 'وحدة المعالجة المركزية' }, { en: 'Computer Personal Unit', ar: 'وحدة الحاسوب الشخصية' }] }], lastAttempt: { score: 8, total: 10, passed: true } }],
    liveSessions: [{ id: 'live-01', titleEn: 'Weekly class', titleAr: 'الحصة الأسبوعية', scheduledAt: new Date(Date.now() + 3600000).toISOString(), status: 'SCHEDULED' }],
  }) as R;
  if (clean.startsWith('/me/lessons/') && clean.endsWith('/url')) return wrap({ url: '' }) as R;
  if (clean.startsWith('/me/lessons/') && clean.endsWith('/progress') && method === 'POST') {
    const progress = getList(store, 'student.lesson-progress', []);
    const lessonId = clean.split('/')[3];
    const existing = progress.find((x) => x.lessonId === lessonId);
    if (existing) Object.assign(existing, payload, { updatedAt: now() }); else progress.push({ lessonId, ...payload, updatedAt: now() });
    store['student.lesson-progress'] = progress; writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean.startsWith('/me/notes/') && clean.endsWith('/url')) return wrap({ url: '' }) as R;
  if (clean.startsWith('/me/quizzes/') && clean.endsWith('/attempts') && method === 'POST') {
    const result = { score: 8, total: 10, passed: true, correct: Array.isArray(payload.answers) ? payload.answers.map((_: unknown, index: number) => index) : [] };
    const attempts = getList(store, 'student.quiz-attempts', []); attempts.push({ id: id(), quizId: clean.split('/')[3], answers: payload.answers ?? [], result, createdAt: now() }); store['student.quiz-attempts'] = attempts; writeStore(store); return wrap(result) as R;
  }
  if (clean.startsWith('/me/payments/') && clean.endsWith('/receipt')) return wrap({
    receiptNumber: 'DEMO-001', paidAt: now(), description: 'Introduction to Computing course fee', amountFils: 250000, vatFils: 0, currency: 'AED', provider: 'Local demo', providerRef: 'LOCAL-DEMO-001',
    payer: { fullName: user?.fullName ?? 'Demo Student', email: user?.email ?? 'student.demo@al-ahmadiya.example' }, applicationReference: null,
    course: { code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' },
  }) as R;
  if (clean === '/me/payments') return wrap([{ id: 'payment-demo-01', purpose: 'course', description: 'Introduction to Computing course fee', amountFils: 250000, vatFils: 0, currency: 'AED', status: 'SUCCEEDED', receiptNumber: 'DEMO-001', paidAt: now(), createdAt: now() }]) as R;
  if (clean === '/me/portal/profile') return wrap({
    id: user?.id ?? 'demo-student', studentId: 'DEMO-2026-001', fullName: user?.fullName ?? 'Demo Student', email: user?.email ?? 'student.demo@al-ahmadiya.example', phone: null, locale: 'en', createdAt: now(),
    application: { reference: 'AAU-DEMO-001', status: 'APPROVED', personal: {}, contact: {}, academic: {}, program: { nameEn: 'Bachelor of Computer Science', nameAr: 'بكالوريوس علوم الحاسوب', degreeLevel: 'BACHELOR', department: { nameEn: 'Computer Science', nameAr: 'علوم الحاسوب' } } },
  }) as R;
  if (clean === '/me/portal/quizzes') return wrap([{ id: 'quiz-01', titleEn: 'Programming basics quiz', titleAr: 'اختبار أساسيات البرمجة', passPercent: 60, questionCount: 10, attempts: 1, best: { score: 8, total: 10 }, passed: true, lastAt: now(), course: { slug: 'intro-to-computing', code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' } }]) as R;
  if (clean === '/me/portal/results') return wrap({ cgpa: 3.42, creditsEarned: 24, terms: [{ term: '2026 Fall', gpa: 3.42, credits: 12, courses: [{ id: 'result-01', marks: 88, grade: 'A', gradePoints: 4, creditHours: 3, course: { code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة' } }] }] }) as R;
  if (clean === '/me/portal/schedule') return wrap([{ kind: 'class', id: 'live-01', at: new Date(Date.now() + 3600000).toISOString(), endsAt: new Date(Date.now() + 5400000).toISOString(), titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة', code: 'CS101', status: 'SCHEDULED', teacher: 'Demo Faculty' }, { kind: 'deadline', id: 'assignment-01', at: new Date(Date.now() + 3 * 86400000).toISOString(), endsAt: new Date(Date.now() + 3 * 86400000).toISOString(), titleEn: 'Programming exercise deadline', titleAr: 'موعد تسليم التمرين البرمجي', code: 'CS101', status: 'PENDING', teacher: null }]) as R;
  const applicationRows = getList(store, 'admissions.applications', []);
  if (clean === '/applications/mine' && method === 'GET') {
    const mine = applicationRows.filter((a) => a.userId === user?.id || a.applicant?.email === user?.email);
    return wrap(mine, { page: 1, pageSize: 20, total: mine.length, totalPages: 1, applicationFeeFils: 0 }) as R;
  }
  if (clean === '/applications' && method === 'POST') {
    const suffix = 'DEMO2345';
    const created = {
      id: id(), reference: `AHM-2026-${suffix}`, status: 'DRAFT', currentStep: 1, programId: null, program: null,
      personal: null, contact: null, academic: null, documents: [], statusHistory: [], decisionNote: null, submittedAt: null,
      userId: user?.id ?? 'demo-student', applicant: { fullName: user?.fullName ?? 'Demo Student', email: user?.email ?? 'student.demo@al-ahmadiya.example' },
      createdAt: now(), updatedAt: now(),
    };
    applicationRows.push(created); store['admissions.applications'] = applicationRows; writeStore(store); return wrap(created) as R;
  }
  if (clean.startsWith('/applications/') && clean.includes('/steps/') && method === 'PUT') {
    const parts = clean.split('/'); const appId = parts[2]; const step = Number(parts[4]);
    const app = applicationRows.find((a) => a.id === appId && (a.userId === user?.id || a.applicant?.email === user?.email));
    if (!app) return wrap({ success: false, message: 'Demo application not found' }) as R;
    const key = ({ 1: 'personal', 2: 'contact', 3: 'academic', 4: 'program' } as Record<number, string>)[step] ?? `step${step}`;
    if (step === 4) {
      const selected = (cmsSeeds.programs ?? []).find((p) => p.slug === payload.programSlug);
      app.program = selected ? { slug: selected.slug, nameEn: selected.nameEn, nameAr: selected.nameAr } : null;
      app.programId = selected?.id ?? null;
    } else app[key] = payload;
    app.currentStep = Math.max(Number(app.currentStep || 1), step + 1); app.updatedAt = now();
    store['admissions.applications'] = applicationRows; writeStore(store); return wrap(app) as R;
  }
  if (clean.startsWith('/applications/') && clean.endsWith('/documents') && method === 'POST') {
    const appId = clean.split('/')[2]; const app = applicationRows.find((a) => a.id === appId && (a.userId === user?.id || a.applicant?.email === user?.email));
    if (!app) return wrap({ success: false }) as R;
    const form = init.body instanceof FormData ? init.body : null;
    const file = form?.get('file');
    const doc = { id: id(), docType: String(form?.get('docType') ?? 'other'), originalName: file instanceof File ? file.name : 'demo-upload.txt', mimeType: file instanceof File ? file.type : 'text/plain', sizeBytes: file instanceof File ? file.size : 0, status: 'UPLOADED' };
    app.documents = [...(app.documents ?? []), doc]; store['admissions.applications'] = applicationRows; writeStore(store); return wrap(doc) as R;
  }
  if (clean.startsWith('/applications/') && clean.includes('/documents/') && method === 'DELETE') {
    const parts = clean.split('/'); const appId = parts[2]; const docId = parts[4];
    const app = applicationRows.find((a) => a.id === appId && (a.userId === user?.id || a.applicant?.email === user?.email));
    if (app) app.documents = (app.documents ?? []).filter((d) => d.id !== docId);
    store['admissions.applications'] = applicationRows; writeStore(store); return wrap({ success: true }) as R;
  }
  if (clean.startsWith('/payments/application/') && method === 'POST') {
    const appId = clean.split('/')[3]; const app = applicationRows.find((a) => a.id === appId && (a.userId === user?.id || a.applicant?.email === user?.email));
    if (app) { app.status = 'SUBMITTED'; app.submittedAt = now(); app.currentStep = 8; app.statusHistory = [...(app.statusHistory ?? []), { id: id(), fromStatus: 'DRAFT', toStatus: 'SUBMITTED', note: 'Submitted in local demo mode; no payment was processed.', createdAt: now() }]; }
    store['admissions.applications'] = applicationRows; writeStore(store); return wrap({ completed: true }) as R;
  }
  if (clean === '/public/admissions/status' && method === 'POST') {
    const app = applicationRows.find((a) => a.reference === payload.reference && a.applicant?.email?.toLowerCase() === String(payload.email || '').toLowerCase());
    if (!app) return wrap({ reference: payload.reference, status: 'DRAFT', submittedAt: null, program: null, timeline: [], pendingDocuments: ['identity'] }) as R;
    return wrap({ reference: app.reference, status: app.status, submittedAt: app.submittedAt, program: app.program, timeline: (app.statusHistory ?? []).map((h) => ({ toStatus: h.toStatus, createdAt: h.createdAt })), pendingDocuments: [] }) as R;
  }
  if (clean === '/public/admissions/eligibility' && method === 'POST') {
    const program = (cmsSeeds.programs ?? []).find((p) => p.slug === payload.programSlug);
    if (!program) return wrap({ status: 'NO_RULE', confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }) as R;
    const actual = Number(payload.overallPercent || 0);
    return wrap(actual >= 60
      ? { status: 'ELIGIBLE', unmet: [], confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }
      : { status: 'NOT_ELIGIBLE', unmet: [{ requirement: 'overall', required: 60, actual }], confirmation: 'CLIENT_CONFIRMATION_REQUIRED' }) as R;
  }
  const listPaths = ['/admin/applications', '/admin/users', '/admin/roles', '/admin/cms', '/admin/contact-messages', '/admin/newsletter-subscribers', '/admin/leave', '/admin/live/sessions', '/admin/lms/courses', '/admin/records/students', '/admin/payments', '/me/notifications', '/me/courses', '/me/live'];
  if (listPaths.includes(clean)) {
    const seeds: Record<string, any[]> = {
      '/admin/contact-messages': [{ id: 'message-01', fullName: 'Demo Enquirer 01', email: 'enquirer01@example.test', phone: null, subject: 'Programme information', message: 'Please share the sample programme details.', locale: 'en', createdAt: now() }, { id: 'message-02', fullName: 'Demo Enquirer 02', email: 'enquirer02@example.test', phone: null, subject: 'Campus visit', message: 'I would like information about a campus visit.', locale: 'en', createdAt: now() }],
      '/admin/newsletter-subscribers': [{ id: 'subscriber-01', email: 'subscriber01@example.test', locale: 'en', createdAt: now() }, { id: 'subscriber-02', email: 'subscriber02@example.test', locale: 'ar', createdAt: now() }],
    };
    const rows = getList(store, `collection:${clean}`, seeds[clean] ?? []);
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
