/**
 * Activity data: fills the ERP with a consistent, working set of accounts and day-to-day activity
 * so every dashboard (admin, teacher, finance, HR, admissions, registrar, library, procurement,
 * student portal) can be exercised end-to-end before launch.
 *
 *   npm run db:seed:activity -w apps/api            # create (safe to re-run; existing accounts are kept)
 *   npm run db:seed:activity -w apps/api -- --staff-only  # only the staff accounts (one per role)
 *   npm run db:seed:activity -w apps/api -- --remove  # delete everything this script created
 *
 * Requires `npm run db:seed` and `npm run db:seed:content` first (roles, courses, programmes).
 *
 *  - Every account uses the reserved `.test` e-mail domain (ACTIVITY_DOMAIN) so it can never
 *    receive mail and is easy to spot. Payments are recorded with provider "test".
 *  - Every other row it creates is listed in the audit log (action "activity-seed.create"),
 *    which is what `--remove` uses. Real records are never modified or deleted, except that
 *    courses without a teacher get one of the accounts below as their teacher.
 *  - Passwords are random, generated on first creation, printed once and written to
 *    apps/api/activity-credentials.txt (git-ignored). Re-running does not change them.
 *  - Numbers are derived from the course prices and enrolments, so totals always add up.
 */
import 'dotenv/config';
import { getRandomValues, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/auth/password';
import { gradeFor } from '../src/portal/grading';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const DOMAIN = process.env.ACTIVITY_DOMAIN ?? 'ahmadiya.test';
const TAG = 'activity-seed.create';
const DAY = 86_400_000;
const NOW = Date.now();

// ── deterministic randomness (same data on every run) ──
let seed = 20261124;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
const chance = (p: number) => rnd() < p;
const ago = (days: number, hour = 10) => { const d = new Date(NOW - days * DAY); d.setUTCHours(hour - 4, int(0, 59), 0, 0); return d; };
const CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const token = (n: number) => [...getRandomValues(new Uint8Array(n))].map((b) => CODE[b % CODE.length]).join('');
/** e.g. "Ahk3pq-X7MV-R27": upper, lower and digits, 15 characters, from the OS random source. */
const password = () => `Ah${token(4).toLowerCase()}-${token(4)}-${token(2)}7`;

async function track(entityType: string, entityId: string) {
  await prisma.auditLog.create({ data: { action: TAG, entityType, entityId } });
}

// ───────────────────────── People ─────────────────────────

/** Staff: one account per role. Teachers carry the names of the published faculty profiles they teach as. */
const STAFF: { email: string; name: string; roles: string[]; dept?: string; teaches?: string[] }[] = [
  { email: 'superadmin', name: 'Hamad Al Suwaidi', roles: ['SUPER_ADMIN'] },
  { email: 'admin', name: 'Aisha Al Mansoori', roles: ['UNIVERSITY_ADMIN'] },
  { email: 'admissions', name: 'Fatima Al Ketbi', roles: ['ADMISSIONS_OFFICER'] },
  { email: 'reviewer', name: 'Rashid Al Nuaimi', roles: ['ADMISSIONS_REVIEWER'] },
  { email: 'registrar', name: 'Mona Al Hashimi', roles: ['REGISTRAR'] },
  { email: 'library', name: 'Salma Al Falasi', roles: ['LIBRARIAN'] },
  { email: 'procurement', name: 'Imran Qureshi', roles: ['PROCUREMENT_OFFICER'] },
  { email: 'academic', name: 'Reem Al Shamsi', roles: ['ACADEMIC_ADMIN'] },
  { email: 'finance.manager', name: 'Vikram Menon', roles: ['FINANCE_MANAGER'] },
  { email: 'finance', name: 'Grace Fernandes', roles: ['FINANCE_OFFICER'] },
  { email: 'hr', name: 'Noor Al Zarooni', roles: ['HR_MANAGER'] },
  { email: 'editor', name: 'Daniel Brooks', roles: ['CONTENT_EDITOR'] },
  { email: 'karim.nasser', name: 'Dr. Karim Nasser', roles: ['HEAD_OF_DEPARTMENT', 'FACULTY'], dept: 'computer-science', teaches: ['DS210', 'DS320'] },
  { email: 'maryam.khalil', name: 'Dr. Maryam Khalil', roles: ['FACULTY'], dept: 'computer-science', teaches: ['CS101', 'CS201'] },
  { email: 'layla.haddad', name: 'Dr. Layla Haddad', roles: ['HEAD_OF_DEPARTMENT', 'FACULTY'], dept: 'business-administration', teaches: ['BA220'] },
  { email: 'omar.farouk', name: 'Prof. Omar Farouk', roles: ['FACULTY'], dept: 'business-administration', teaches: ['BA101'] },
  { email: 'noura.saeed', name: 'Dr. Noura Saeed', roles: ['FACULTY'], dept: 'accounting-finance', teaches: ['AF110'] },
  { email: 'yousef.rahman', name: 'Dr. Yousef Rahman', roles: ['FACULTY'], dept: 'arabic-language', teaches: ['AR101'] },
  { email: 'huda.salem', name: 'Dr. Huda Salem', roles: ['FACULTY'], dept: 'education', teaches: ['ED201'] },
];

const FIRST = {
  male: ['Ahmed', 'Mohammed', 'Khalid', 'Saeed', 'Omar', 'Yousef', 'Hamdan', 'Sultan', 'Arjun', 'Rohan', 'Faisal', 'Zayed', 'Ali', 'Hassan', 'Adam', 'Ibrahim', 'Rayan', 'Joshua', 'Kevin', 'Tariq'],
  female: ['Mariam', 'Fatima', 'Hessa', 'Shamma', 'Latifa', 'Noora', 'Sara', 'Aaliyah', 'Priya', 'Ananya', 'Layan', 'Huda', 'Amna', 'Dana', 'Zainab', 'Rania', 'Maria', 'Hana', 'Yasmin', 'Leen'],
};
const LAST = ['Al Mazrouei', 'Al Marri', 'Al Muhairi', 'Al Dhaheri', 'Al Ali', 'Al Hammadi', 'Al Blooshi', 'Al Suwaidi', 'Khan', 'Nair', 'Haddad', 'Saleh', 'Mansour', 'Pillai', 'Rahman', 'Aziz', 'Santos', 'Qasim', 'Farah', 'Kapoor', 'Darwish', 'Yousef'];
const NATIONALITIES = ['United Arab Emirates', 'United Arab Emirates', 'United Arab Emirates', 'India', 'Pakistan', 'Egypt', 'Jordan', 'Philippines', 'Syria', 'Lebanon', 'Sudan'];
const SCHOOLS = ['Al Mawakeb School', 'Dubai National School', 'Al Ittihad Private School', 'Our Own English High School', 'Rashid School for Boys', 'Latifa School for Girls', 'GEMS Modern Academy', 'Al Ahmadiya Secondary'];
const slugify = (s: string) => s.toLowerCase().replace(/^(dr|prof)\.\s*/, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');

const QUIZ: Record<string, [string, string[], number][]> = {
  CS101: [['What does `len([3, 5, 7])` return in Python?', ['2', '3', '7', '15'], 1], ['Which keyword defines a function?', ['func', 'def', 'function', 'lambda'], 1], ['What is the type of `3.0`?', ['int', 'str', 'float', 'bool'], 2]],
  CS201: [['Average-case lookup time in a hash table?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 0], ['Which structure is first-in, first-out?', ['Stack', 'Queue', 'Tree', 'Heap'], 1], ['Binary search needs the input to be…', ['Sorted', 'Unique', 'Numeric', 'Small'], 0]],
  DS210: [['Which measure is most robust to outliers?', ['Mean', 'Median', 'Range', 'Variance'], 1], ['A histogram shows…', ['Correlation', 'A distribution', 'A time series', 'Proportions'], 1], ['Removing duplicate rows is part of…', ['Data cleaning', 'Modelling', 'Deployment', 'Sampling'], 0]],
  DS320: [['Linear regression predicts…', ['A category', 'A continuous value', 'A cluster', 'A rule'], 1], ['Overfitting means the model…', ['Fits training data too closely', 'Is too simple', 'Has no features', 'Trains too slowly'], 0], ['k-means is a … method.', ['Supervised', 'Clustering', 'Reinforcement', 'Regression'], 1]],
  BA101: [['Which is one of the four functions of management?', ['Planning', 'Selling', 'Coding', 'Auditing'], 0], ['A SWOT analysis covers strengths, weaknesses, opportunities and…', ['Targets', 'Threats', 'Trends', 'Teams'], 1], ['Span of control is the number of…', ['Products', 'Direct reports', 'Markets', 'Branches'], 1]],
  BA220: [['A KPI is…', ['A key performance indicator', 'A kind of invoice', 'A pricing model', 'A database'], 0], ['Which chart best shows change over time?', ['Pie chart', 'Line chart', 'Scatter plot', 'Treemap'], 1], ['Descriptive analytics answers…', ['What happened?', 'What will happen?', 'What should we do?', 'Why it happened?'], 0]],
  AF110: [['Assets = Liabilities + …', ['Revenue', 'Equity', 'Expenses', 'Cash'], 1], ['Which statement shows profit for a period?', ['Balance sheet', 'Income statement', 'Cash-flow statement', 'Trial balance'], 1], ['A debit to cash…', ['Increases cash', 'Decreases cash', 'Closes the account', 'Has no effect'], 0]],
  AR101: [['Who wrote "al-Bayan wa al-Tabyin"?', ['Al-Jahiz', 'Al-Mutanabbi', 'Ibn Khaldun', 'Al-Farabi'], 0], ['The Mu\'allaqat are collections of…', ['Pre-Islamic odes', 'Legal texts', 'Travel writing', 'Grammar rules'], 0], ['Ibn Khaldun\'s best-known work is…', ['Al-Muqaddimah', 'Kalila wa Dimna', 'Al-Aghani', 'Al-Kamil'], 0]],
  ED201: [['"Backward design" starts from…', ['Activities', 'Desired results', 'Textbooks', 'Timetables'], 1], ['Formative assessment is used to…', ['Rank schools', 'Guide learning during a unit', 'Certify graduation', 'Set fees'], 1], ['A learning outcome should be…', ['Measurable', 'Secret', 'Optional', 'Unlimited'], 0]],
};

// ───────────────────────── Remove ─────────────────────────

async function remove() {
  const users = await prisma.user.findMany({ where: { email: { endsWith: `@${DOMAIN}` } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  const logs = await prisma.auditLog.findMany({ where: { action: TAG }, select: { entityType: true, entityId: true } });
  const of = (t: string) => logs.filter((l) => l.entityType === t).map((l) => l.entityId!);
  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({ where: { userId: { in: ids } } });
    await tx.libraryLoan.deleteMany({ where: { userId: { in: ids } } });
    await tx.purchaseRequest.deleteMany({ where: { OR: [{ requestedById: { in: ids } }, { id: { in: of('PurchaseRequest') } }] } });
    await tx.application.deleteMany({ where: { applicantId: { in: ids } } });
    await tx.liveSession.deleteMany({ where: { id: { in: of('LiveSession') } } });
    await tx.liveSlot.deleteMany({ where: { id: { in: of('LiveSlot') } } });
    await tx.assignment.deleteMany({ where: { id: { in: of('Assignment') } } });
    await tx.quiz.deleteMany({ where: { id: { in: of('Quiz') } } });
    await tx.courseNote.deleteMany({ where: { id: { in: of('CourseNote') } } });
    await tx.lesson.deleteMany({ where: { id: { in: of('Lesson') } } });
    await tx.courseTopic.deleteMany({ where: { id: { in: of('CourseTopic') } } });
    await tx.libraryItem.deleteMany({ where: { id: { in: of('LibraryItem') }, loans: { none: {} } } });
    await tx.facility.deleteMany({ where: { id: { in: of('Facility') } } });
    await tx.user.deleteMany({ where: { id: { in: ids } } }); // cascades enrolments, results, progress, attendance, notifications…
    await tx.auditLog.deleteMany({ where: { action: TAG } });
  }, { timeout: 120_000 });
  console.log(`Removed ${ids.length} accounts on @${DOMAIN} and ${logs.length} tracked records.`);
}

// ───────────────────────── Create ─────────────────────────

const credentials: { role: string; name: string; email: string; password: string }[] = [];

async function account(email: string, name: string, roleKeys: string[], extra: { departmentId?: string | null; createdAt?: Date; phone?: string } = {}) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { id: existing.id, created: false };
  const roles = await prisma.role.findMany({ where: { key: { in: roleKeys } } });
  if (roles.length !== roleKeys.length) throw new Error(`Missing roles ${roleKeys.join(', ')}: run npm run db:seed first`);
  const pw = password();
  const u = await prisma.user.create({
    data: {
      email, fullName: name, passwordHash: await hashPassword(pw), emailVerified: true, phone: extra.phone ?? null,
      departmentId: extra.departmentId ?? null, createdAt: extra.createdAt ?? ago(200),
      roles: { create: roles.map((r) => ({ roleId: r.id })) },
    },
  });
  credentials.push({ role: roles.map((r) => r.nameEn).join(' + '), name, email, password: pw });
  return { id: u.id, created: true };
}

async function create() {
  const courses = await prisma.course.findMany({ where: { deletedAt: null, publishStatus: 'PUBLISHED', onlineEnabled: true }, orderBy: { code: 'asc' } });
  const programs = await prisma.program.findMany({ where: { deletedAt: null, publishStatus: 'PUBLISHED' } });
  const depts = await prisma.department.findMany({ where: { deletedAt: null } });
  if (!courses.length || !programs.length) throw new Error('No published courses/programmes: run npm run db:seed:content first');
  const deptId = (slug?: string) => depts.find((d) => d.slug === slug)?.id ?? null;
  const byCode = new Map(courses.map((c) => [c.code, c]));

  // Staff
  const staff = new Map<string, string>();
  for (const s of STAFF) {
    const { id } = await account(`${s.email}@${DOMAIN}`, s.name, s.roles, { departmentId: deptId(s.dept), createdAt: ago(int(240, 320)), phone: `+971 4 ${int(200, 499)} ${int(1000, 9999)}` });
    staff.set(s.email, id);
    for (const code of s.teaches ?? []) {
      const c = byCode.get(code);
      if (c && !c.teacherId) { await prisma.course.update({ where: { id: c.id }, data: { teacherId: id } }); c.teacherId = id; }
    }
  }
  if (process.argv.includes('--staff-only')) return;
  // Fresh run only below this point (activity is created once).
  if (await prisma.auditLog.count({ where: { action: TAG } })) {
    console.log('Activity already exists; accounts checked. Use --remove first to recreate it.');
    return;
  }
  const hr = staff.get('hr')!, admissions = staff.get('admissions')!, procurement = staff.get('procurement')!, admin = staff.get('admin')!;

  // Course content: topics → lectures → notes, one quiz per course, two assignments. Only for courses that have none.
  const lessonsOf = new Map<string, string[]>(), quizOf = new Map<string, string>(), assignOf = new Map<string, { id: string; dueAt: Date; max: number }[]>();
  for (const c of courses) {
    const lessons = await prisma.lesson.findMany({ where: { courseId: c.id, status: 'PUBLISHED' }, select: { id: true } });
    if (!lessons.length) {
      const mods = (c.syllabus as { module: string; moduleAr?: string; topicsEn: string[]; topicsAr: string[] }[] | null) ?? [];
      let order = 0;
      for (const [mi, m] of mods.entries()) {
        const topic = await prisma.courseTopic.create({ data: { courseId: c.id, titleEn: m.module, titleAr: m.moduleAr ?? m.module, sortOrder: mi } });
        await track('CourseTopic', topic.id);
        for (const [ti, t] of m.topicsEn.entries()) {
          const l = await prisma.lesson.create({ data: { courseId: c.id, topicId: topic.id, titleEn: t, titleAr: m.topicsAr[ti] ?? t, sortOrder: order++, durationSec: int(14, 32) * 60, status: 'PUBLISHED', isPreview: mi === 0 && ti === 0, descriptionEn: `${t}: lecture for ${c.titleEn}.`, descriptionAr: `${m.topicsAr[ti] ?? t}: محاضرة ضمن ${c.titleAr}.` } });
          await track('Lesson', l.id);
          lessons.push({ id: l.id });
          if (ti === 0) {
            const n = await prisma.courseNote.create({ data: { courseId: c.id, lessonId: l.id, titleEn: `${m.module} — study notes`, titleAr: `${m.moduleAr ?? m.module} — ملاحظات دراسية`, bodyEn: `Key points from "${m.module}": ${m.topicsEn.join('; ')}. Review the lecture, then try the practice questions before the quiz.`, bodyAr: `أهم النقاط في "${m.moduleAr ?? m.module}": ${m.topicsAr.join('؛ ')}. راجع المحاضرة ثم حل أسئلة التدريب قبل الاختبار.`, sortOrder: mi } });
            await track('CourseNote', n.id);
          }
        }
      }
    }
    lessonsOf.set(c.id, lessons.map((l) => l.id));
    const qs = QUIZ[c.code];
    if (qs && !(await prisma.quiz.count({ where: { courseId: c.id } }))) {
      const q = await prisma.quiz.create({ data: { courseId: c.id, titleEn: `${c.code} module check`, titleAr: `اختبار قصير ${c.code}`, passPercent: 60, questions: qs.map(([t, o, correct], i) => ({ id: `q${i + 1}`, textEn: t, textAr: t, options: o.map((x) => ({ en: x, ar: x })), correct })) } });
      await track('Quiz', q.id); quizOf.set(c.id, q.id);
    }
    const asg: { id: string; dueAt: Date; max: number }[] = [];
    for (const [i, [en, ar, due]] of ([['Problem set 1', 'مجموعة المسائل 1', -20], ['Mini project', 'مشروع مصغّر', 9]] as const).entries()) {
      const a = await prisma.assignment.create({ data: { courseId: c.id, titleEn: `${c.code} ${en}`, titleAr: `${c.code} ${ar}`, instructionsEn: i ? 'Apply this course\'s methods to a small real-world case. Submit a short PDF report (max. 4 pages).' : 'Answer all questions from the first two modules. Show your working.', instructionsAr: i ? 'طبّق أساليب المقرر على حالة واقعية صغيرة، وارفع تقريراً قصيراً بصيغة PDF (4 صفحات كحد أقصى).' : 'أجب عن جميع أسئلة الوحدتين الأولى والثانية مع توضيح خطوات الحل.', dueAt: ago(-due, 23), maxMarks: i ? 20 : 10, createdAt: ago(i ? 12 : 45) } });
      await track('Assignment', a.id); asg.push({ id: a.id, dueAt: a.dueAt, max: a.maxMarks });
    }
    assignOf.set(c.id, asg);
  }

  // Live timetable for the live course(s): Mon & Wed 18:00–19:30 Dubai, with past classes held.
  const liveCourses = courses.filter((c) => c.deliveryMode === 'LIVE' && c.teacherId);
  const sessionsOf = new Map<string, { id: string; at: Date }[]>();
  for (const c of liveCourses) {
    await prisma.course.update({ where: { id: c.id }, data: { liveStartsOn: c.liveStartsOn ?? ago(84), liveEndsOn: c.liveEndsOn ?? ago(-42) } });
    const slots = [];
    if (!(await prisma.liveSlot.count({ where: { courseId: c.id } }))) {
      for (const weekday of [1, 3]) { const s = await prisma.liveSlot.create({ data: { courseId: c.id, weekday, startTime: '18:00', endTime: '19:30' } }); await track('LiveSlot', s.id); slots.push(s); }
    }
    const list: { id: string; at: Date }[] = [];
    for (let d = 84; d >= 1; d--) {
      const at = ago(d, 18); at.setUTCMinutes(0);
      const wd = ((new Date(at.getTime() + 4 * 3600_000).getUTCDay() + 6) % 7) + 1;
      const slot = slots.find((s) => s.weekday === wd);
      if (!slot) continue;
      const s = await prisma.liveSession.create({ data: { courseId: c.id, hostId: c.teacherId, slotId: slot.id, titleEn: `${c.code} live class`, titleAr: `حصة مباشرة ${c.code}`, scheduledAt: at, durationMin: 90, roomName: randomUUID(), status: 'ENDED', startedAt: at, endedAt: new Date(at.getTime() + 90 * 60_000), notifiedAt: at } });
      await track('LiveSession', s.id); list.push({ id: s.id, at });
    }
    sessionsOf.set(c.id, list);
  }
  // Occasional revision classes held by the other teachers.
  for (const c of courses.filter((x) => x.deliveryMode !== 'LIVE' && x.teacherId)) {
    const list: { id: string; at: Date }[] = [];
    for (const d of [int(40, 55), int(15, 25), int(2, 6)]) {
      const at = ago(d, 17); at.setUTCMinutes(0);
      const s = await prisma.liveSession.create({ data: { courseId: c.id, hostId: c.teacherId, titleEn: `${c.code} revision session`, titleAr: `حصة مراجعة ${c.code}`, scheduledAt: at, durationMin: 60, roomName: randomUUID(), status: 'ENDED', startedAt: at, endedAt: new Date(at.getTime() + 60 * 60_000), notifiedAt: at } });
      await track('LiveSession', s.id); list.push({ id: s.id, at });
    }
    sessionsOf.set(c.id, list);
  }

  // Students: sign-ups grow month on month over the last six months.
  const STUDENTS = 72;
  const used = new Set<string>();
  const uniqueName = (gender: 'male' | 'female', suffix: string) => {
    for (;;) {
      const first = pick(FIRST[gender]), last = pick(LAST), email = `${slugify(`${first} ${last}`)}${suffix}@${DOMAIN}`;
      if (!used.has(email)) { used.add(email); return { first, last, email }; }
    }
  };
  let receipts = 0, paidFils = 0;
  for (let i = 0; i < STUDENTS; i++) {
    const gender = chance(0.55) ? 'female' : 'male';
    const { first, last, email } = uniqueName(gender, '');
    const joined = Math.floor(180 * Math.pow(rnd(), 1.35)); // more recent sign-ups than old ones
    const signup = ago(joined, int(8, 22));
    const { id: userId } = await account(email, `${first} ${last}`, ['STUDENT'], { createdAt: signup, phone: `+971 5${int(0, 8)} ${int(100, 999)} ${int(1000, 9999)}` });
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: ago(int(0, Math.min(joined, 14)), int(8, 23)) } });

    // 1–3 courses; prerequisites respected loosely by preferring intro courses for newcomers.
    const n = chance(0.5) ? 1 : chance(0.7) ? 2 : 3;
    const chosen = new Set<string>();
    while (chosen.size < n) chosen.add(pick(courses).id);
    let k = 0;
    for (const courseId of chosen) {
      const c = courses.find((x) => x.id === courseId)!;
      const enrolDays = Math.max(0, joined - k * int(5, 30)); k++;
      const enrolledAt = ago(enrolDays, int(9, 22));
      const price = c.priceFils ?? 0;
      const outcome = price === 0 ? 'free' : enrolDays < 25 && chance(0.18) ? 'due' : enrolDays < 60 && chance(0.06) ? 'failed-then-due' : 'paid';
      const active = outcome === 'free' || outcome === 'paid';
      const enr = await prisma.enrollment.create({ data: { userId, courseId, status: active ? 'ACTIVE' : 'PENDING_PAYMENT', activatedAt: active ? new Date(enrolledAt.getTime() + 4 * 60_000) : null, createdAt: enrolledAt } });
      if (price > 0) {
        if (outcome === 'failed-then-due' || chance(0.06)) {
          await prisma.payment.create({ data: { userId, purpose: 'course', enrollmentId: enr.id, description: `Course ${c.code} — ${c.titleEn}`, amountFils: price, provider: 'test', idempotencyKey: randomUUID(), providerOrderId: `order_${token(14)}`, status: 'FAILED', createdAt: enrolledAt, rawCallback: { source: 'activity-seed', reason: 'card declined' } } });
        }
        if (outcome === 'paid') {
          const paidAt = new Date(enrolledAt.getTime() + 3 * 60_000);
          await prisma.payment.create({ data: { userId, purpose: 'course', enrollmentId: enr.id, description: `Course ${c.code} — ${c.titleEn}`, amountFils: price, provider: 'test', idempotencyKey: randomUUID(), providerOrderId: `order_${token(14)}`, providerRef: `pay_${token(14)}`, status: 'SUCCEEDED', receiptNumber: `RCPT-${paidAt.getUTCFullYear()}-${token(8)}`, paidAt, createdAt: enrolledAt, rawCallback: { source: 'activity-seed' } } });
          receipts++; paidFils += price;
          await prisma.notification.create({ data: { userId, type: 'payment', titleEn: 'Payment received', titleAr: 'تم استلام الدفعة', bodyEn: `Course ${c.code} — ${c.titleEn} — receipt available in your account.`, bodyAr: 'الإيصال متاح في حسابك.', createdAt: paidAt, readAt: enrolDays > 3 ? paidAt : null } });
        }
      }
      if (!active) continue;

      // Learning activity scales with time since enrolment; some students fall behind.
      const engagement = chance(0.15) ? 0.25 : 0.6 + rnd() * 0.4;
      const lessons = lessonsOf.get(courseId) ?? [];
      const done = Math.min(lessons.length, Math.round(lessons.length * Math.min(1, enrolDays / 60) * engagement));
      for (const [li, lessonId] of lessons.slice(0, done + 1).entries()) {
        const at = ago(Math.max(0, enrolDays - li * 2), int(9, 23));
        await prisma.lessonProgress.create({ data: { userId, lessonId, positionSec: li < done ? 0 : int(60, 600), completedAt: li < done ? at : null, createdAt: at } });
      }
      const quizId = quizOf.get(courseId);
      if (quizId && done >= 3) {
        const score = engagement > 0.5 ? (chance(0.6) ? 3 : 2) : int(0, 2);
        await prisma.quizAttempt.create({ data: { quizId, userId, answers: {}, score, total: 3, passed: score >= 2, createdAt: ago(Math.max(0, enrolDays - 10)) } });
      }
      for (const [ai, a] of (assignOf.get(courseId) ?? []).entries()) {
        const due = a.dueAt.getTime();
        if (enrolledAt.getTime() > due - 3 * DAY || chance(1 - engagement)) continue;
        if (ai === 1 && chance(0.5)) continue; // project still being written
        const submittedAt = new Date(Math.min(NOW - 3600_000, due - int(1, 72) * 3600_000));
        const graded = due < NOW && chance(0.75);
        const marks = graded ? Math.max(3, Math.min(a.max, Math.round(a.max * (0.5 + engagement * 0.45 + (rnd() - 0.5) * 0.15)))) : null;
        await prisma.assignmentSubmission.create({ data: { assignmentId: a.id, userId, text: ai ? 'Report attached as text: method, findings and recommendations.' : 'Answers to all questions, with working.', submittedAt, marks, gradedAt: graded ? new Date(due + int(2, 6) * DAY) : null, feedback: graded ? pick(['Clear and well organised.', 'Good work — check question 4 again.', 'Solid reasoning; show more steps next time.', 'Excellent.']) : null } });
      }
      for (const s of sessionsOf.get(courseId) ?? []) {
        if (s.at < enrolledAt || !chance(engagement * 0.95)) continue;
        const late = chance(0.12) ? int(11, 25) : int(0, 4);
        const minutes = c.deliveryMode === 'LIVE' ? 90 : 60;
        const stayed = chance(0.1) ? int(15, 45) : minutes - late - int(0, 3);
        const first = new Date(s.at.getTime() + late * 60_000);
        await prisma.liveAttendance.create({ data: { sessionId: s.id, userId, firstJoinedAt: first, lastJoinedAt: first, lastLeftAt: new Date(first.getTime() + stayed * 60_000), totalSeconds: stayed * 60, joinCount: 1 } });
      }
      // Final result for enrolments that finished a full term (12+ weeks).
      if (enrolDays >= 84 && chance(0.9)) {
        const marks = Math.max(38, Math.min(98, Math.round(55 + engagement * 38 + (rnd() - 0.5) * 16)));
        const g = gradeFor(marks);
        const term = enrolledAt.getUTCMonth() < 7 ? `${enrolledAt.getUTCFullYear()} Summer` : `${enrolledAt.getUTCFullYear()} Term 1`;
        await prisma.courseResult.create({ data: { userId, courseId, term, marks, grade: g.grade, gradePoints: g.points, creditHours: c.creditHours, publishedAt: ago(enrolDays - 84), enteredById: c.teacherId } });
      }
    }
    if (chance(0.3)) { const c = pick(courses); if (!chosen.has(c.id)) await prisma.courseWishlist.create({ data: { userId, courseId: c.id } }); }
  }

  // Applicants across all programmes and every stage of the admissions pipeline.
  const PIPE: ('SUBMITTED' | 'UNDER_REVIEW' | 'DOCUMENTS_PENDING' | 'RETURNED_FOR_CORRECTION' | 'APPROVED' | 'REJECTED' | 'DRAFT')[] =
    ['SUBMITTED', 'SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'UNDER_REVIEW', 'UNDER_REVIEW', 'DOCUMENTS_PENDING', 'RETURNED_FOR_CORRECTION', 'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'REJECTED', 'DRAFT', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'];
  for (const [i, status] of PIPE.entries()) {
    const gender = chance(0.5) ? 'female' : 'male';
    const { first, last, email } = uniqueName(gender, `.${String(i + 1).padStart(2, '0')}`);
    const started = int(3, 75);
    const { id: applicantId } = await account(email, `${first} ${last}`, ['APPLICANT'], { createdAt: ago(started) });
    const prog = programs[i % programs.length];
    const percent = int(72, 97);
    const nationality = pick(NATIONALITIES);
    const submittedAt = status === 'DRAFT' ? null : ago(started - 1);
    const app = await prisma.application.create({
      data: {
        reference: `AHM-${new Date(NOW).getUTCFullYear()}-${token(8)}`, applicantId, programId: prog.id, status, currentStep: status === 'DRAFT' ? int(2, 4) : 5,
        personal: { firstName: first, lastName: last, dateOfBirth: `${int(2005, 2008)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`, gender, nationality, passportNumber: '' },
        contact: { phone: `+971 5${int(0, 8)} ${int(100, 999)} ${int(1000, 9999)}`, addressLine: pick(['Al Barsha 1', 'Deira, Al Rigga', 'Mirdif', 'Jumeirah 3', 'Al Nahda 2', 'Al Qusais', 'Dubai Silicon Oasis']), city: 'Dubai', country: 'United Arab Emirates' },
        academic: { qualification: prog.degreeLevel === 'MASTER' ? 'BACHELOR' : pick(['UAE_SECONDARY_ADVANCED', 'UAE_SECONDARY_GENERAL', 'IGCSE_A_LEVEL', 'AMERICAN_HIGH_SCHOOL']), institution: pick(SCHOOLS), graduationYear: 2026, overallPercent: percent, subjects: [{ subject: 'Mathematics', percent: int(65, 98) }, { subject: 'English', percent: int(70, 98) }] },
        submittedAt, decidedAt: ['APPROVED', 'REJECTED'].includes(status) ? ago(Math.max(0, started - int(5, 14))) : null,
        decisionNote: status === 'REJECTED' ? 'Minimum entry requirement not met for this programme.' : status === 'RETURNED_FOR_CORRECTION' ? 'Please upload a clearer copy of your transcript.' : null,
        createdAt: ago(started),
      },
    });
    const steps: [string | null, string, string | null][] = [[null, 'DRAFT', applicantId]];
    if (submittedAt) steps.push(['DRAFT', 'SUBMITTED', applicantId]);
    if (!['DRAFT', 'SUBMITTED'].includes(status)) steps.push(['SUBMITTED', status === 'UNDER_REVIEW' ? 'UNDER_REVIEW' : 'UNDER_REVIEW', admissions]);
    if (!['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'].includes(status)) steps.push(['UNDER_REVIEW', status, admissions]);
    for (const [si, [from, to, actor]] of steps.entries()) {
      await prisma.applicationStatusEvent.create({ data: { applicationId: app.id, fromStatus: from as never, toStatus: to as never, actorId: actor, createdAt: ago(Math.max(0, started - si * 3)) } });
    }
  }

  // HR: staff sign-ins and leave.
  for (const [key, id] of staff) {
    for (let d = 0; d < 20; d++) if (chance(0.7)) await prisma.staffLogin.create({ data: { userId: id, email: `${key}@${DOMAIN}`, success: true, createdAt: ago(d, int(7, 10)) } });
    await prisma.user.update({ where: { id }, data: { lastLoginAt: ago(int(0, 2), int(7, 10)) } });
  }
  const LEAVES: [string, 'ANNUAL' | 'SICK' | 'CASUAL' | 'OTHER', number, number, 'PENDING' | 'APPROVED' | 'REJECTED', string][] = [
    ['maryam.khalil', 'ANNUAL', 18, 22, 'PENDING', 'Family travel'],
    ['registrar', 'SICK', -6, -5, 'APPROVED', 'Medical appointment'],
    ['finance', 'CASUAL', 5, 5, 'PENDING', 'Personal errand'],
    ['omar.farouk', 'ANNUAL', -40, -33, 'APPROVED', 'Annual leave'],
    ['library', 'CASUAL', -14, -14, 'APPROVED', 'Family event'],
    ['editor', 'ANNUAL', 30, 34, 'REJECTED', 'Clashes with the open day'],
    ['procurement', 'SICK', -2, -1, 'APPROVED', 'Flu'],
  ];
  for (const [who, type, from, to, status, reason] of LEAVES) {
    const decided = status !== 'PENDING';
    await prisma.leaveRequest.create({ data: { userId: staff.get(who)!, type, startDate: ago(-from), endDate: ago(-to), reason, status, decidedById: decided ? hr : null, decidedAt: decided ? ago(Math.max(0, -from + 3)) : null, note: status === 'REJECTED' ? 'Please choose dates after the open day.' : null, createdAt: ago(Math.max(1, -from + 7)) } });
  }

  // Library catalogue (real titles) and loans.
  const BOOKS: [string, string, string | null, string, number | null, 'BOOK' | 'EBOOK' | 'DATABASE', string | null][] = [
    ['Introduction to Algorithms (4th ed.)', 'Cormen, Leiserson, Rivest & Stein', '9780262046305', 'Computer Science', 2022, 'BOOK', null],
    ['Python Crash Course (3rd ed.)', 'Eric Matthes', '9781718502703', 'Computer Science', 2023, 'BOOK', null],
    ['Hands-On Machine Learning with Scikit-Learn, Keras & TensorFlow (3rd ed.)', 'Aurélien Géron', '9781098125974', 'Data Science', 2022, 'BOOK', null],
    ['Storytelling with Data', 'Cole Nussbaumer Knaflic', '9781119002253', 'Business Analytics', 2015, 'BOOK', null],
    ['Understanding by Design (expanded 2nd ed.)', 'Grant Wiggins & Jay McTighe', '9781416600350', 'Education', 2005, 'BOOK', null],
    ['Al-Muqaddimah', 'Ibn Khaldun', null, 'Arabic Literature', null, 'BOOK', null],
    ['Al-Bayan wa al-Tabyin', 'Al-Jahiz', null, 'Arabic Literature', null, 'BOOK', null],
    ['arXiv', 'Cornell University', null, 'Research', null, 'DATABASE', 'https://arxiv.org'],
    ['Directory of Open Access Journals', 'DOAJ', null, 'Research', null, 'DATABASE', 'https://doaj.org'],
    ['Al-Maktaba al-Shamela', 'Shamela', null, 'Arabic Literature', null, 'DATABASE', 'https://shamela.ws'],
  ];
  const physical: string[] = [];
  for (const [title, author, isbn, subject, year, type, url] of BOOKS) {
    if (await prisma.libraryItem.findFirst({ where: { title } })) continue;
    const it = await prisma.libraryItem.create({ data: { title, author, isbn, subject, year: year ?? null, type, url, copies: type === 'BOOK' ? int(2, 5) : 1 } });
    await track('LibraryItem', it.id);
    if (type === 'BOOK') physical.push(it.id);
  }
  const students = await prisma.user.findMany({ where: { email: { endsWith: `@${DOMAIN}` }, roles: { some: { role: { key: 'STUDENT' } } } }, select: { id: true } });
  for (let i = 0; i < 26 && physical.length; i++) {
    const issued = int(1, 60);
    await prisma.libraryLoan.create({ data: { itemId: pick(physical), userId: pick(students).id, issuedAt: ago(issued), dueAt: ago(issued - 14), returnedAt: issued > 16 && chance(0.85) ? ago(issued - int(5, 14)) : null } });
  }

  // Procurement & facilities.
  const PRS: [string, string, number, 'LOW' | 'MEDIUM' | 'HIGH', 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'RECEIVED', number][] = [
    ['Library books — Term 1 order', 'Library', 6850, 'MEDIUM', 'RECEIVED', 70],
    ['Projector replacement, lecture hall', 'IT equipment', 4200, 'HIGH', 'RECEIVED', 52],
    ['Network switch for the computer lab', 'IT equipment', 3100, 'HIGH', 'ORDERED', 21],
    ['Cleaning supplies (quarterly)', 'Facilities', 1450, 'LOW', 'APPROVED', 9],
    ['Webcams and microphones for live classes', 'IT equipment', 2380, 'MEDIUM', 'SUBMITTED', 3],
    ['Exhibition panels for the heritage gallery', 'Heritage', 5600, 'MEDIUM', 'SUBMITTED', 2],
    ['Office chairs (12)', 'Furniture', 7800, 'LOW', 'REJECTED', 30],
    ['First-aid kits and refills', 'Health & safety', 640, 'HIGH', 'RECEIVED', 40],
  ];
  const year = new Date(NOW).getUTCFullYear();
  let prn = await prisma.purchaseRequest.count({ where: { number: { startsWith: `PR-${year}-` } } });
  for (const [title, category, aed, priority, status, d] of PRS) {
    const decided = status !== 'SUBMITTED';
    const pr = await prisma.purchaseRequest.create({ data: { number: `PR-${year}-${String(++prn).padStart(4, '0')}`, title, category, amountFils: aed * 100, priority, status, requestedById: procurement, approvedById: decided ? admin : null, decidedAt: decided ? ago(d - 2) : null, orderedAt: ['ORDERED', 'RECEIVED'].includes(status) ? ago(d - 4) : null, receivedAt: status === 'RECEIVED' ? ago(d - 12) : null, notes: status === 'REJECTED' ? 'Deferred to next budget year.' : null, createdAt: ago(d) } });
    await track('PurchaseRequest', pr.id);
  }
  for (const [name, status, note] of [['Main lecture hall', 'OPERATIONAL', null], ['Computer lab', 'OPERATIONAL', null], ['Library reading room', 'OPERATIONAL', null], ['Courtyard and majlis', 'OPERATIONAL', null], ['Prayer rooms', 'OPERATIONAL', null], ['Seminar room 2', 'MAINTENANCE', 'Air-conditioning service, back next week']] as const) {
    if (await prisma.facility.findUnique({ where: { name } })) continue;
    const f = await prisma.facility.create({ data: { name, status, note } });
    await track('Facility', f.id);
  }
  console.log(`Created ${STUDENTS} students, ${PIPE.length} applicants, ${STAFF.length} staff; ${receipts} paid course purchases totalling AED ${(paidFils / 100).toLocaleString('en')}.`);
}

async function main() {
  if (process.argv.includes('--remove')) return remove();
  await create();
  if (credentials.length) {
    const lines = credentials.map((c) => `${c.role.padEnd(42)} ${c.name.padEnd(26)} ${c.email.padEnd(44)} ${c.password}`);
    const out = join(__dirname, '..', 'activity-credentials.txt');
    writeFileSync(out, `${'Role'.padEnd(42)} ${'Name'.padEnd(26)} ${'E-mail'.padEnd(44)} Password\n${lines.join('\n')}\n`, { mode: 0o600 });
    console.log(`\nNew accounts (also saved to ${out}):\n${lines.slice(0, STAFF.length + 3).join('\n')}\n… ${Math.max(0, lines.length - STAFF.length - 3)} more in the file.`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
