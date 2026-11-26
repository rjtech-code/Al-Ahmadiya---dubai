/**
 * Synthetic data for the student portal preview (frontend only). One consistent student:
 * four enrolled courses, twelve weeks of classes, three published terms, payments and documents.
 * Dates are relative to "now" so the preview always looks current.
 */
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
/** A time today-relative: n days from now at hh:mm Dubai (UTC+4). */
const at = (days: number, hh: number, mm = 0) => { const d = new Date(Date.now() + days * DAY); return iso(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh - 4, mm)); };

export const COURSES = [
  { id: 'course-01', slug: 'intro-to-computing', code: 'CS101', titleEn: 'Introduction to Computing', titleAr: 'مقدمة في الحوسبة', imagePath: '/images/courses/cs101.jpg', teacher: 'Dr. Maryam Khalil', credits: 3 },
  { id: 'course-02', slug: 'business-foundations', code: 'BUS101', titleEn: 'Business Foundations', titleAr: 'أساسيات الأعمال', imagePath: '/images/courses/ba101.jpg', teacher: 'Prof. Omar Farouk', credits: 3 },
  { id: 'course-03', slug: 'data-science-foundations', code: 'DS210', titleEn: 'Foundations of Data Science', titleAr: 'أسس علم البيانات', imagePath: '/images/courses/ds210.jpg', teacher: 'Dr. Karim Nasser', credits: 3 },
  { id: 'course-04', slug: 'financial-accounting', code: 'AF110', titleEn: 'Financial Accounting', titleAr: 'المحاسبة المالية', imagePath: '/images/courses/af110.jpg', teacher: 'Dr. Noura Saeed', credits: 3 },
] as const;
const ref = (c: (typeof COURSES)[number]) => ({ id: c.id, code: c.code, slug: c.slug, titleEn: c.titleEn, titleAr: c.titleAr });

// Weekly class pattern (Dubai time): weekday 1 = Monday.
const SLOTS: { c: number; dow: number; hh: number }[] = [{ c: 0, dow: 1, hh: 10 }, { c: 2, dow: 2, hh: 18 }, { c: 1, dow: 3, hh: 11 }, { c: 3, dow: 4, hh: 14 }, { c: 0, dow: 4, hh: 10 }];
// Deterministic attendance outcomes per (week, slot).
const OUTCOME = 'PPPPLPPPPAPPPPPPLPPPPPPPPPPAPPPLPPPPPPPPPPPPPAPPPPPPPPPPPPLP';

/** Past live classes over the last 12 weeks with this student's attendance. */
function pastClasses() {
  const now = new Date();
  const todayDow = ((now.getUTCDay() + 6) % 7) + 1;
  const rows: { id: string; date: string; course: (typeof COURSES)[number]; status: string; minutes: number; joinedAt: string | null; leftAt: string | null; week: number }[] = [];
  let k = 0;
  for (let w = 11; w >= 0; w--) {
    for (const [si, s] of SLOTS.entries()) {
      const days = -(w * 7) - (todayDow - s.dow);
      if (days >= 0) continue;
      const start = at(days, s.hh);
      const status = { P: 'PRESENT', L: 'LATE', A: 'ABSENT' }[OUTCOME[k++ % OUTCOME.length]] as string;
      const lateBy = status === 'LATE' ? 14 : 2;
      const minutes = status === 'ABSENT' ? 0 : 88 - lateBy;
      rows.push({ id: `att-${w}-${si}`, date: start, course: COURSES[s.c], status, minutes, joinedAt: status === 'ABSENT' ? null : iso(+new Date(start) + lateBy * 60_000), leftAt: status === 'ABSENT' ? null : iso(+new Date(start) + 90 * 60_000), week: 11 - w });
    }
  }
  return rows;
}

export function attendance() {
  const h = pastClasses();
  const byCourse = COURSES.map((c) => {
    const rows = h.filter((r) => r.course.id === c.id);
    const attended = rows.filter((r) => r.status !== 'ABSENT').length;
    return { course: ref(c), held: rows.length, attended, late: rows.filter((r) => r.status === 'LATE').length, absent: rows.length - attended, percent: rows.length ? Math.round((attended / rows.length) * 100) : null };
  });
  const attended = h.filter((r) => r.status !== 'ABSENT').length;
  const weekly = Array.from({ length: 12 }, (_, w) => { const rows = h.filter((r) => r.week === w); return { week: w + 1, percent: rows.length ? Math.round((rows.filter((r) => r.status !== 'ABSENT').length / rows.length) * 100) : null }; });
  return {
    overall: h.length ? Math.round((attended / h.length) * 100) : null, byCourse, weekly,
    history: [...h].reverse().map((r) => ({ id: r.id, date: r.date, status: r.status, minutes: r.minutes, joinedAt: r.joinedAt, leftAt: r.leftAt, course: { code: r.course.code, titleEn: r.course.titleEn, titleAr: r.course.titleAr } })),
  };
}

export function results() {
  const terms = [
    { term: '2025 Fall', rows: [['CS101', 91, 'A', 4.0], ['BUS101', 84, 'B+', 3.3]] },
    { term: '2026 Spring', rows: [['DS210', 87, 'A-', 3.7], ['AF110', 78, 'B', 3.0], ['CS101', 89, 'A-', 3.7]] },
    { term: '2026 Summer', rows: [['BUS101', 93, 'A', 4.0], ['DS210', 82, 'B+', 3.3]] },
  ] as const;
  const out = terms.map((t, ti) => {
    const courses = t.rows.map(([code, marks, grade, gp], i) => { const c = COURSES.find((x) => x.code === code)!; return { id: `res-${ti}-${i}`, marks, grade, gradePoints: gp, creditHours: c.credits, course: { code: c.code, titleEn: c.titleEn, titleAr: c.titleAr } }; });
    const credits = courses.reduce((s, c) => s + c.creditHours, 0);
    return { term: t.term, credits, gpa: Math.round((courses.reduce((s, c) => s + c.gradePoints * c.creditHours, 0) / credits) * 100) / 100, courses };
  });
  const all = out.flatMap((t) => t.courses);
  const creditsEarned = all.reduce((s, c) => s + c.creditHours, 0);
  return { cgpa: Math.round((all.reduce((s, c) => s + c.gradePoints * c.creditHours, 0) / creditsEarned) * 100) / 100, creditsEarned, creditsRequired: 120, terms: out };
}

export function payments() {
  const list = [
    { id: 'pay-05', description: 'Financial Accounting — course fee', amountFils: 50000, days: -9, status: 'SUCCEEDED', receipt: 'RCPT-2026-7KD2QX' },
    { id: 'pay-04', description: 'Foundations of Data Science — course fee', amountFils: 75000, days: -38, status: 'SUCCEEDED', receipt: 'RCPT-2026-M4P8ZT' },
    { id: 'pay-03', description: 'Business Foundations — course fee', amountFils: 40000, days: -71, status: 'SUCCEEDED', receipt: 'RCPT-2026-B9W3NE' },
    { id: 'pay-02', description: 'Introduction to Computing — course fee', amountFils: 45000, days: -104, status: 'SUCCEEDED', receipt: 'RCPT-2026-H2R6YA' },
    { id: 'pay-01', description: 'Application fee', amountFils: 25000, days: -130, status: 'SUCCEEDED', receipt: 'RCPT-2026-Q7C5LF' },
    { id: 'pay-00', description: 'Foundations of Data Science — course fee', amountFils: 75000, days: -39, status: 'FAILED', receipt: null },
  ];
  return list.map((p) => ({ id: p.id, purpose: p.description === 'Application fee' ? 'application-fee' : 'course', description: p.description, amountFils: p.amountFils, vatFils: 0, currency: 'AED', status: p.status, receiptNumber: p.receipt, paidAt: p.status === 'SUCCEEDED' ? at(p.days, 12, 20) : null, createdAt: at(p.days, 12, 18) }));
}

export function live() {
  const upcoming = [{ c: 0, days: 0, hh: new Date().getUTCHours() + 5 }, { c: 2, days: 1, hh: 18 }, { c: 1, days: 2, hh: 11 }, { c: 3, days: 3, hh: 14 }];
  const past = pastClasses().slice(-6).reverse();
  return [
    ...upcoming.map((u, i) => { const c = COURSES[u.c]; return { id: `live-0${i + 1}`, titleEn: `${c.titleEn} — weekly class`, titleAr: `${c.titleAr} — الحصة الأسبوعية`, scheduledAt: at(u.days, Math.min(u.hh, 22)), durationMin: 90, status: 'SCHEDULED', course: { ...ref(c), teacher: { fullName: c.teacher } }, lesson: null, attendedMinutes: null }; }),
    ...past.map((p, i) => ({ id: `live-past-${i}`, titleEn: `${p.course.titleEn} — weekly class`, titleAr: `${p.course.titleAr} — الحصة الأسبوعية`, scheduledAt: p.date, durationMin: 90, status: 'ENDED', course: { ...ref(p.course), teacher: { fullName: p.course.teacher } }, lesson: { id: 'lesson-01' }, attendedMinutes: p.status === 'ABSENT' ? null : p.minutes })),
  ];
}

/** Minutes studied per week (lectures + practice) over the last 8 weeks. */
export function analytics() {
  const minutes = [210, 260, 240, 320, 300, 380, 350, 410];
  const scores = [72, 78, 75, 81, 84, 80, 88, 86];
  const now = Date.now();
  return {
    studyWeeks: minutes.map((m, i) => ({ label: new Date(now - (7 - i) * 7 * DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), value: m })),
    assignmentScores: scores.map((s, i) => ({ label: `W${i + 1}`, value: s })),
    completion: COURSES.map((c, i) => ({ code: c.code, titleEn: c.titleEn, titleAr: c.titleAr, value: [62, 38, 75, 20][i] })),
  };
}

export function documents() {
  return [
    { id: 'doc-01', docType: 'passport', originalName: 'passport-scan.pdf', sizeBytes: 842_000, status: 'VERIFIED', createdAt: at(-132, 10), application: { id: 'app-01', reference: 'AHM-2026-7QK2MZXA' } },
    { id: 'doc-02', docType: 'emirates-id', originalName: 'emirates-id-front-back.pdf', sizeBytes: 516_000, status: 'VERIFIED', createdAt: at(-132, 10), application: { id: 'app-01', reference: 'AHM-2026-7QK2MZXA' } },
    { id: 'doc-03', docType: 'transcript', originalName: 'grade-12-transcript.pdf', sizeBytes: 1_204_000, status: 'VERIFIED', createdAt: at(-131, 16), application: { id: 'app-01', reference: 'AHM-2026-7QK2MZXA' } },
    { id: 'doc-04', docType: 'certificate', originalName: 'secondary-certificate.pdf', sizeBytes: 980_000, status: 'UPLOADED', createdAt: at(-20, 9), application: { id: 'app-01', reference: 'AHM-2026-7QK2MZXA' } },
    { id: 'doc-05', docType: 'photo', originalName: 'passport-photo.jpg', sizeBytes: 214_000, status: 'REJECTED', createdAt: at(-131, 16), application: { id: 'app-01', reference: 'AHM-2026-7QK2MZXA' } },
  ];
}

const LECTURES: Record<string, [string, string][]> = {
  CS101: [['Variables and data types', 'Programming basics'], ['Algorithms and flowcharts', 'Programming basics'], ['Operators and expressions', 'Programming basics'], ['Conditional statements', 'Control flow'], ['Loops and iteration', 'Control flow'], ['Functions and methods', 'Control flow'], ['Lists and dictionaries', 'Working with data'], ['Reading and writing files', 'Working with data']],
  BUS101: [['What is a business?', 'Foundations'], ['How organisations plan', 'Planning'], ['Organising people and work', 'Organising'], ['Leading teams', 'Leading'], ['Controlling performance', 'Controlling']],
  DS210: [['What data science answers', 'Introduction'], ['Cleaning messy data', 'Preparing data'], ['Exploring a dataset with charts', 'Exploring data'], ['Summary statistics', 'Exploring data'], ['Correlation is not causation', 'Inference'], ['Telling a story with data', 'Communicating'], ['Mini project walkthrough', 'Project'], ['Review and next steps', 'Project']],
  AF110: [['The accounting equation', 'Foundations'], ['Debits and credits', 'Recording'], ['The trial balance', 'Recording'], ['Income statement', 'Statements'], ['Balance sheet', 'Statements']],
};
const DONE: Record<string, number> = { CS101: 5, BUS101: 2, DS210: 6, AF110: 1 };

/** Recorded lectures of all four courses with this student's progress. */
export function lectures() {
  let k = 0;
  const rows = COURSES.flatMap((c) => LECTURES[c.code].map(([title, topic], i) => {
    const done = i < DONE[c.code];
    const started = i === DONE[c.code];
    const dur = (18 + ((i * 7) % 12)) * 60;
    const watchedAt = done || started ? iso(Date.now() - (++k * 0.9 + (started ? 0 : 3)) * DAY) : null;
    return { id: i === 0 && c.code === 'CS101' ? 'lesson-01' : `lesson-${c.code.toLowerCase()}-${i + 1}`, titleEn: title, titleAr: title, durationSec: dur, positionSec: done ? dur : started ? Math.round(dur * 0.45) : 0, completed: done, watchedAt, course: { slug: c.slug, code: c.code, titleEn: c.titleEn, titleAr: c.titleAr }, topic: { titleEn: topic, titleAr: topic } };
  }));
  const watched = rows.filter((l) => l.watchedAt).sort((a, b) => b.watchedAt!.localeCompare(a.watchedAt!));
  return { lectures: rows, continueWatching: [...rows.filter((l) => !l.completed && l.positionSec > 0), ...watched.filter((l) => l.completed)].slice(0, 6), upNext: rows.filter((l) => !l.completed && !l.positionSec).slice(0, 4) };
}

export function notifications() {
  const n = (id: string, type: string, mins: number, titleEn: string, bodyEn: string, link: string | null, read: boolean) => ({ id, type, titleEn, titleAr: titleEn, bodyEn, bodyAr: bodyEn, link, readAt: read ? iso(Date.now() - mins * 60_000 + 60_000) : null, createdAt: iso(Date.now() - mins * 60_000) });
  return [
    n('notice-06', 'live-class', 25, 'CS101 class starts soon', 'Introduction to Computing — weekly class opens in about an hour.', '/portal/live', false),
    n('notice-05', 'ACADEMIC', 180, 'Week 3 graded assignment released', 'CS101 · due next week at 11:59 PM.', '/portal/courses/intro-to-computing', false),
    n('notice-04', 'payment', 60 * 26, 'Payment received', 'Financial Accounting — course fee. Your receipt is ready.', '/portal/payments', true),
    n('notice-03', 'ACADEMIC', 60 * 30, 'Results published', '2026 Summer results are now available in Results & CGPA.', '/portal/results', true),
    n('notice-02', 'enrollment', 60 * 24 * 4, 'You are enrolled in DS210', 'Foundations of Data Science is now in My courses.', '/portal/courses', true),
    n('notice-01', 'ACADEMIC', 60 * 24 * 9, 'Welcome to your student portal', 'Find your courses, classes, results and receipts here.', '/portal', true),
  ];
}

/** Timetable between two instants: the weekly class slots plus each course's weekly assignment deadline. */
export function schedule(fromIso: string | null, toIso: string | null) {
  const from = fromIso ? +new Date(fromIso) : Date.now() - 7 * DAY;
  const to = toIso ? +new Date(toIso) : Date.now() + 7 * DAY;
  const out: { kind: 'class' | 'deadline'; id: string; at: string; endsAt: string; titleEn: string; titleAr: string; code: string; status: string; teacher: string | null }[] = [];
  for (let d = from - DAY; d < to + DAY; d += DAY) {
    const day = new Date(d + 4 * 3600_000);
    const dow = ((day.getUTCDay() + 6) % 7) + 1;
    const ymd = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
    for (const s of SLOTS.filter((x) => x.dow === dow)) {
      const c = COURSES[s.c];
      const start = ymd + (s.hh - 4) * 3600_000;
      if (start < from || start >= to) continue;
      out.push({ kind: 'class', id: `cls-${c.code}-${start}`, at: iso(start), endsAt: iso(start + 90 * 60_000), titleEn: c.titleEn, titleAr: c.titleAr, code: c.code, status: start + 90 * 60_000 < Date.now() ? 'ENDED' : start < Date.now() ? 'LIVE' : 'SCHEDULED', teacher: c.teacher });
    }
    if (dow === 7) for (const c of COURSES.slice(0, 2)) {
      const due = ymd + 19 * 3600_000 + 59 * 60_000;
      if (due < from || due >= to) continue;
      out.push({ kind: 'deadline', id: `due-${c.code}-${due}`, at: iso(due), endsAt: iso(due), titleEn: `${c.code} weekly graded assignment`, titleAr: `${c.code} الواجب الأسبوعي`, code: c.code, status: due < Date.now() ? 'SUBMITTED' : 'PENDING', teacher: null });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
