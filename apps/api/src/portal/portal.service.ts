import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { rm } from 'node:fs/promises';
import type { AuthUser } from '../common/decorators';
import { assertFileType } from '../lms/uploads';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { gpa } from './grading';

const DAY = 86_400_000;

/** Student portal: everything is scoped to the signed-in student's own records and ACTIVE enrolments. */
@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private async courseIds(userId: string) {
    return (await this.prisma.enrollment.findMany({ where: { userId, status: 'ACTIVE' }, select: { courseId: true } })).map((e) => e.courseId);
  }

  private async enrolled(userId: string, courseId: string) {
    const e = await this.prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (e?.status !== 'ACTIVE') throw new ForbiddenException({ code: 'NOT_ENROLLED', message: 'You are not enrolled in this course.' });
  }

  // ── Courses with progress ──
  async courses(user: AuthUser) {
    const rows = await this.prisma.enrollment.findMany({
      where: { userId: user.id, status: 'ACTIVE' }, orderBy: { activatedAt: 'desc' },
      select: { activatedAt: true, course: { select: {
        id: true, slug: true, code: true, titleEn: true, titleAr: true, imagePath: true, deliveryMode: true, creditHours: true,
        teacher: { select: { fullName: true } }, instructor: { select: { fullNameEn: true, fullNameAr: true } },
        lessons: { where: { status: 'PUBLISHED' }, select: { id: true } },
        assignments: { where: { status: 'PUBLISHED' }, select: { id: true, dueAt: true, submissions: { where: { userId: user.id }, select: { id: true } } } },
        quizzes: { where: { status: 'PUBLISHED' }, select: { id: true, attempts: { where: { userId: user.id }, select: { id: true }, take: 1 } } },
        liveSessions: { where: { status: { in: ['SCHEDULED', 'LIVE'] } }, orderBy: { scheduledAt: 'asc' }, take: 1, select: { id: true, scheduledAt: true, status: true } },
      } } },
    });
    const done = await this.prisma.lessonProgress.findMany({ where: { userId: user.id, completedAt: { not: null } }, select: { lessonId: true } });
    const doneSet = new Set(done.map((d) => d.lessonId));
    return {
      data: rows.map(({ course: c, activatedAt }) => {
        const completed = c.lessons.filter((l) => doneSet.has(l.id)).length;
        return {
          id: c.id, slug: c.slug, code: c.code, titleEn: c.titleEn, titleAr: c.titleAr, imagePath: c.imagePath, deliveryMode: c.deliveryMode, creditHours: c.creditHours, enrolledAt: activatedAt,
          instructor: c.teacher?.fullName ?? c.instructor?.fullNameEn ?? null,
          lecturesDone: completed, lecturesTotal: c.lessons.length, progress: c.lessons.length ? Math.round((completed / c.lessons.length) * 100) : 0,
          pendingAssignments: c.assignments.filter((a) => !a.submissions.length && a.dueAt > new Date()).length,
          pendingQuizzes: c.quizzes.filter((q) => !q.attempts.length).length,
          nextClass: c.liveSessions[0] ?? null,
        };
      }),
    };
  }

  // ── Wishlist ──
  async wishlist(user: AuthUser) {
    const rows = await this.prisma.courseWishlist.findMany({
      where: { userId: user.id }, orderBy: { createdAt: 'desc' },
      select: { course: { select: { id: true, slug: true, code: true, titleEn: true, titleAr: true, imagePath: true, priceFils: true, currency: true, deliveryMode: true, publishStatus: true } } },
    });
    return { data: rows.map((r) => r.course).filter((c) => c.publishStatus === 'PUBLISHED') };
  }

  async addWish(user: AuthUser, slug: string) {
    const c = await this.prisma.course.findFirst({ where: { slug, deletedAt: null, publishStatus: 'PUBLISHED' } });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Course not found' });
    await this.prisma.courseWishlist.upsert({ where: { userId_courseId: { userId: user.id, courseId: c.id } }, create: { userId: user.id, courseId: c.id }, update: {} });
    return { data: { saved: true } };
  }

  async removeWish(user: AuthUser, slug: string) {
    const c = await this.prisma.course.findFirst({ where: { slug } });
    if (c) await this.prisma.courseWishlist.deleteMany({ where: { userId: user.id, courseId: c.id } });
    return { data: { saved: false } };
  }

  // ── Recorded lectures ──
  async lectures(user: AuthUser) {
    const ids = await this.courseIds(user.id);
    const [lessons, progress] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { courseId: { in: ids }, status: 'PUBLISHED' }, orderBy: [{ courseId: 'asc' }, { topic: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        select: { id: true, titleEn: true, titleAr: true, durationSec: true, createdAt: true, course: { select: { slug: true, code: true, titleEn: true, titleAr: true, imagePath: true } }, topic: { select: { titleEn: true, titleAr: true } } },
      }),
      this.prisma.lessonProgress.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } }),
    ]);
    const p = new Map(progress.map((x) => [x.lessonId, x]));
    const rows = lessons.map((l) => ({ ...l, positionSec: p.get(l.id)?.positionSec ?? 0, completed: !!p.get(l.id)?.completedAt, watchedAt: p.get(l.id)?.updatedAt ?? null }));
    const continueWatching = progress.filter((x) => !x.completedAt && x.positionSec > 0).map((x) => rows.find((r) => r.id === x.lessonId)).filter(Boolean).slice(0, 6);
    // Next lecture per course = first lecture not completed.
    const upNext = [...new Set(rows.map((r) => r.course.slug))].map((slug) => rows.find((r) => r.course.slug === slug && !r.completed)).filter(Boolean);
    return { data: { lectures: rows, continueWatching, upNext } };
  }

  // ── Schedule: live classes + assignment deadlines ──
  async schedule(user: AuthUser, from: Date, to: Date) {
    const ids = await this.courseIds(user.id);
    const [classes, assignments] = await Promise.all([
      this.prisma.liveSession.findMany({
        where: { courseId: { in: ids }, scheduledAt: { gte: from, lt: to } }, orderBy: { scheduledAt: 'asc' },
        select: { id: true, titleEn: true, titleAr: true, scheduledAt: true, durationMin: true, status: true, course: { select: { code: true, slug: true, titleEn: true, titleAr: true, teacher: { select: { fullName: true } } } } },
      }),
      this.prisma.assignment.findMany({
        where: { courseId: { in: ids }, status: 'PUBLISHED', dueAt: { gte: from, lt: to } }, orderBy: { dueAt: 'asc' },
        select: { id: true, titleEn: true, titleAr: true, dueAt: true, course: { select: { code: true, slug: true } }, submissions: { where: { userId: user.id }, select: { id: true } } },
      }),
    ]);
    return {
      data: [
        ...classes.map((c) => ({ kind: 'class' as const, id: c.id, at: c.scheduledAt, endsAt: new Date(c.scheduledAt.getTime() + c.durationMin * 60_000), titleEn: c.course.titleEn, titleAr: c.course.titleAr, code: c.course.code, status: c.status, teacher: c.course.teacher?.fullName ?? null })),
        ...assignments.map((a) => ({ kind: 'deadline' as const, id: a.id, at: a.dueAt, endsAt: a.dueAt, titleEn: a.titleEn, titleAr: a.titleAr, code: a.course.code, status: a.submissions.length ? 'SUBMITTED' : 'PENDING', teacher: null })),
      ].sort((x, y) => x.at.getTime() - y.at.getTime()),
    };
  }

  // ── Live classes (enrolled courses only) ──
  async live(user: AuthUser) {
    const ids = await this.courseIds(user.id);
    const rows = await this.prisma.liveSession.findMany({
      where: { courseId: { in: ids } }, orderBy: { scheduledAt: 'desc' }, take: 300,
      select: {
        id: true, titleEn: true, titleAr: true, scheduledAt: true, durationMin: true, status: true, recordingStatus: true,
        course: { select: { id: true, code: true, slug: true, titleEn: true, titleAr: true, teacher: { select: { fullName: true } } } },
        lesson: { select: { id: true } }, attendance: { where: { userId: user.id }, select: { totalSeconds: true } },
      },
    });
    return { data: rows.map(({ attendance, ...s }) => ({ ...s, attendedMinutes: attendance[0] ? Math.round(attendance[0].totalSeconds / 60) : null })) };
  }

  // ── Attendance ──
  async attendance(user: AuthUser) {
    const ids = await this.courseIds(user.id);
    const sessions = await this.prisma.liveSession.findMany({
      where: { courseId: { in: ids }, status: 'ENDED' }, orderBy: { scheduledAt: 'desc' },
      select: { id: true, scheduledAt: true, startedAt: true, endedAt: true, durationMin: true, presentPercent: true, lateAfterMin: true, course: { select: { id: true, code: true, titleEn: true, titleAr: true } }, attendance: { where: { userId: user.id } } },
    });
    const history = sessions.map((s) => {
      const a = s.attendance[0];
      const start = s.startedAt ?? s.scheduledAt;
      const length = Math.max(60, ((s.endedAt ?? new Date(start.getTime() + s.durationMin * 60_000)).getTime() - start.getTime()) / 1000);
      const pct = a ? Math.min(100, Math.round((a.totalSeconds / length) * 100)) : 0;
      const late = !!a && a.firstJoinedAt.getTime() > start.getTime() + s.lateAfterMin * 60_000;
      const status = !a ? 'ABSENT' : pct >= s.presentPercent ? (late ? 'LATE' : 'PRESENT') : 'PARTIAL';
      return { id: s.id, date: s.scheduledAt, course: s.course, status, minutes: a ? Math.round(a.totalSeconds / 60) : 0, joinedAt: a?.firstJoinedAt ?? null, leftAt: a?.lastLeftAt ?? null };
    });
    const counted = (rows: typeof history) => rows.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const byCourse = [...new Map(history.map((h) => [h.course.id, h.course])).values()].map((c) => {
      const rows = history.filter((h) => h.course.id === c.id);
      return { course: c, held: rows.length, attended: counted(rows), late: rows.filter((r) => r.status === 'LATE').length, absent: rows.filter((r) => r.status === 'ABSENT').length, percent: rows.length ? Math.round((counted(rows) / rows.length) * 100) : null };
    });
    return { data: { overall: history.length ? Math.round((counted(history) / history.length) * 100) : null, byCourse, history } };
  }

  // ── Assignments ──
  async assignments(user: AuthUser) {
    const ids = await this.courseIds(user.id);
    const rows = await this.prisma.assignment.findMany({
      where: { courseId: { in: ids }, status: 'PUBLISHED' }, orderBy: { dueAt: 'asc' },
      select: { id: true, titleEn: true, titleAr: true, dueAt: true, maxMarks: true, course: { select: { code: true, slug: true, titleEn: true, titleAr: true } }, submissions: { where: { userId: user.id } } },
    });
    const now = Date.now();
    return {
      data: rows.map(({ submissions, ...a }) => {
        const s = submissions[0];
        const state = s?.gradedAt ? 'GRADED' : s ? 'SUBMITTED' : a.dueAt.getTime() < now ? 'OVERDUE' : 'PENDING';
        return { ...a, state, marks: s?.gradedAt ? s.marks : null, submittedAt: s?.submittedAt ?? null };
      }),
    };
  }

  async assignment(user: AuthUser, id: string) {
    const a = await this.prisma.assignment.findUnique({ where: { id }, include: { course: { select: { code: true, slug: true, titleEn: true, titleAr: true } }, submissions: { where: { userId: user.id } } } });
    if (!a || a.status !== 'PUBLISHED') throw new NotFoundException({ code: 'NOT_FOUND', message: 'Assignment not found' });
    await this.enrolled(user.id, a.courseId);
    const { submissions, ...rest } = a;
    const s = submissions[0];
    return { data: { ...rest, submission: s ? { text: s.text, fileName: s.fileName, submittedAt: s.submittedAt, attempts: s.attempts, marks: s.gradedAt ? s.marks : null, feedback: s.gradedAt ? s.feedback : null, gradedAt: s.gradedAt } : null } };
  }

  async submit(user: AuthUser, id: string, text: string | undefined, file: Express.Multer.File | undefined) {
    const cleanup = () => (file ? rm(file.path, { force: true }) : Promise.resolve());
    const a = await this.prisma.assignment.findUnique({ where: { id } });
    if (!a || a.status !== 'PUBLISHED') { await cleanup(); throw new NotFoundException({ code: 'NOT_FOUND', message: 'Assignment not found' }); }
    await this.enrolled(user.id, a.courseId).catch(async (e: unknown) => { await cleanup(); throw e; });
    if (a.dueAt < new Date()) { await cleanup(); throw new ConflictException({ code: 'DEADLINE_PASSED', message: 'The deadline for this assignment has passed.' }); }
    const prev = await this.prisma.assignmentSubmission.findUnique({ where: { assignmentId_userId: { assignmentId: id, userId: user.id } } });
    if (prev?.gradedAt) { await cleanup(); throw new ConflictException({ code: 'ALREADY_GRADED', message: 'This assignment has already been graded.' }); }
    if (prev && !a.allowResubmit) { await cleanup(); throw new ConflictException({ code: 'NO_RESUBMIT', message: 'Resubmission is not allowed for this assignment.' }); }
    const body = text?.trim().slice(0, 20_000) || null;
    if (!body && !file) throw new BadRequestException({ code: 'EMPTY', message: 'Write your answer or attach a PDF.' });
    let fileData: { fileKey?: string; fileName?: string } = {};
    if (file) {
      const mime = await assertFileType(file, ['application/pdf'], 'PDF');
      const { key } = await this.storage.putFile(`assignments/${id}`, file.path, 'pdf', mime);
      if (prev?.fileKey) await this.storage.remove(prev.fileKey);
      fileData = { fileKey: key, fileName: file.originalname.slice(0, 200) };
    }
    const s = await this.prisma.assignmentSubmission.upsert({
      where: { assignmentId_userId: { assignmentId: id, userId: user.id } },
      create: { assignmentId: id, userId: user.id, text: body, ...fileData },
      update: { text: body, ...fileData, submittedAt: new Date(), attempts: { increment: 1 } },
    });
    return { data: { submittedAt: s.submittedAt, attempts: s.attempts } };
  }

  // ── Quizzes across courses ──
  async quizzes(user: AuthUser) {
    const ids = await this.courseIds(user.id);
    const rows = await this.prisma.quiz.findMany({
      where: { courseId: { in: ids }, status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' },
      select: { id: true, titleEn: true, titleAr: true, passPercent: true, questions: true, course: { select: { slug: true, code: true, titleEn: true, titleAr: true } }, attempts: { where: { userId: user.id }, orderBy: { createdAt: 'desc' }, select: { score: true, total: true, passed: true, createdAt: true } } },
    });
    return { data: rows.map(({ questions, attempts, ...q }) => ({ ...q, questionCount: (questions as unknown[]).length, attempts: attempts.length, best: attempts.reduce<{ score: number; total: number } | null>((b, a) => (!b || a.score > b.score ? { score: a.score, total: a.total } : b), null), passed: attempts.some((a) => a.passed), lastAt: attempts[0]?.createdAt ?? null })) };
  }

  // ── Results & CGPA ──
  async results(user: AuthUser) {
    const rows = await this.prisma.courseResult.findMany({
      where: { userId: user.id, publishedAt: { not: null } }, orderBy: [{ term: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, term: true, marks: true, grade: true, gradePoints: true, creditHours: true, publishedAt: true, course: { select: { code: true, titleEn: true, titleAr: true } } },
    });
    const terms = [...new Set(rows.map((r) => r.term))].map((term) => {
      const t = rows.filter((r) => r.term === term);
      return { term, gpa: gpa(t), credits: t.reduce((s, r) => s + r.creditHours, 0), courses: t };
    });
    const earned = rows.filter((r) => r.gradePoints > 0).reduce((s, r) => s + r.creditHours, 0);
    return { data: { cgpa: gpa(rows), creditsEarned: earned, terms } };
  }

  // ── Documents (uploaded during admission) ──
  async documents(user: AuthUser) {
    const docs = await this.prisma.applicationDocument.findMany({
      where: { application: { applicantId: user.id } }, orderBy: { createdAt: 'desc' },
      select: { id: true, docType: true, originalName: true, sizeBytes: true, status: true, createdAt: true, application: { select: { id: true, reference: true } } },
    });
    return { data: docs };
  }

  // ── Profile ──
  async profile(user: AuthUser) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { id: true, fullName: true, email: true, phone: true, locale: true, createdAt: true } });
    const app = await this.prisma.application.findFirst({ where: { applicantId: user.id }, orderBy: { createdAt: 'desc' }, select: { reference: true, status: true, personal: true, contact: true, academic: true, program: { select: { nameEn: true, nameAr: true, degreeLevel: true, department: { select: { nameEn: true, nameAr: true } } } } } });
    return { data: { ...u, studentId: `AAU-${u.id.slice(0, 8).toUpperCase()}`, application: app } };
  }

  async updateProfile(user: AuthUser, body: { fullName?: string; phone?: string | null; locale?: string }) {
    const fullName = body.fullName?.trim();
    if (fullName !== undefined && (fullName.length < 2 || fullName.length > 150)) throw new BadRequestException({ code: 'INVALID_NAME', message: 'Enter your full name' });
    const phone = body.phone?.trim() || null;
    if (phone && !/^[+\d\s()-]{6,40}$/.test(phone)) throw new BadRequestException({ code: 'INVALID_PHONE', message: 'Enter a valid phone number' });
    const u = await this.prisma.user.update({ where: { id: user.id }, data: { ...(fullName ? { fullName } : {}), phone, ...(body.locale === 'en' || body.locale === 'ar' ? { locale: body.locale } : {}) }, select: { fullName: true, phone: true, locale: true } });
    return { data: u };
  }

  // ── Dashboard: one call for the home screen ──
  async dashboard(user: AuthUser) {
    const now = new Date();
    const dayStart = new Date(now); dayStart.setUTCHours(-4, 0, 0, 0); // midnight in Dubai
    if (dayStart > now) dayStart.setTime(dayStart.getTime() - DAY);
    const [courses, todays, assignments, quizzes, results, attendance, notifications, wish, lectures] = await Promise.all([
      this.courses(user), this.schedule(user, dayStart, new Date(dayStart.getTime() + DAY)), this.assignments(user), this.quizzes(user),
      this.results(user), this.attendance(user),
      this.prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.wishlist(user), this.lectures(user),
    ]);
    const upcoming = await this.prisma.liveSession.findFirst({
      where: { courseId: { in: courses.data.map((c) => c.id) }, status: { in: ['LIVE', 'SCHEDULED'] }, scheduledAt: { gte: new Date(now.getTime() - 3 * 3600_000) } },
      orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }], select: { id: true, scheduledAt: true, durationMin: true, status: true, course: { select: { code: true, titleEn: true, titleAr: true, imagePath: true, teacher: { select: { fullName: true } } } } },
    });
    const ids = courses.data.map((c) => c.id);
    const [upcomingCount, recent] = await Promise.all([
      this.prisma.liveSession.count({ where: { courseId: { in: ids }, status: { in: ['SCHEDULED', 'LIVE'] }, scheduledAt: { lte: new Date(now.getTime() + 7 * DAY) } } }),
      this.prisma.lesson.findMany({
        where: { courseId: { in: ids }, status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' }, take: 4,
        select: { id: true, titleEn: true, titleAr: true, durationSec: true, createdAt: true, course: { select: { slug: true, code: true, titleEn: true, titleAr: true, imagePath: true } } },
      }),
    ]);
    return {
      data: {
        cgpa: results.data.cgpa, creditsEarned: results.data.creditsEarned, attendance: attendance.data.overall,
        courses: courses.data, today: todays.data, nextClass: upcoming,
        pendingAssignments: assignments.data.filter((a) => a.state === 'PENDING').slice(0, 5),
        pendingQuizzes: quizzes.data.filter((q) => !q.attempts).slice(0, 5),
        continueWatching: lectures.data.continueWatching.slice(0, 3), upNext: lectures.data.upNext.slice(0, 3),
        latestResults: results.data.terms.at(-1) ?? null, notifications, wishlist: wish.data.slice(0, 4),
        upcomingCount, recentLectures: recent,
      },
    };
  }
}
