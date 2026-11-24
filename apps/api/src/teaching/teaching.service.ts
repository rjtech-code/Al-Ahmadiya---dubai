import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../common/decorators';
import { seesAllCourses } from '../common/permissions';
import { NotificationsService } from '../notifications/notifications.service';
import { gradeFor } from '../portal/grading';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

/** Teacher dashboard: own courses, upcoming classes and each student's progress. */
@Injectable()
export class TeachingService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService, private readonly storage: StorageService) {}

  private scope(user: AuthUser) {
    return seesAllCourses(user.permissions) ? {} : { teacherId: user.id };
  }

  private async course(user: AuthUser, id: string) {
    const c = await this.prisma.course.findFirst({ where: { id, deletedAt: null } });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Course not found' });
    if (!seesAllCourses(user.permissions) && c.teacherId !== user.id) throw new ForbiddenException({ code: 'NOT_YOUR_COURSE', message: 'This course is assigned to another teacher.' });
    return c;
  }

  async overview(user: AuthUser) {
    const courses = await this.prisma.course.findMany({
      where: { deletedAt: null, onlineEnabled: true, ...this.scope(user) }, orderBy: { code: 'asc' },
      select: {
        id: true, code: true, slug: true, titleEn: true, imagePath: true, deliveryMode: true, publishStatus: true,
        _count: { select: { lessons: { where: { status: 'PUBLISHED' } }, quizzes: true, enrollments: { where: { status: 'ACTIVE' } } } },
      },
    });
    const ids = courses.map((c) => c.id);
    const now = new Date();
    const classes = await this.prisma.liveSession.findMany({
      where: { courseId: { in: ids }, OR: [{ status: 'LIVE' }, { status: 'SCHEDULED', scheduledAt: { lte: new Date(now.getTime() + 7 * 86_400_000) } }] },
      orderBy: { scheduledAt: 'asc' }, take: 50,
      select: { id: true, titleEn: true, scheduledAt: true, durationMin: true, status: true, course: { select: { id: true, code: true, titleEn: true } } },
    });
    return { data: { courses: courses.map(({ _count, ...c }) => ({ ...c, students: _count.enrollments, lectures: _count.lessons, quizzes: _count.quizzes })), classes } };
  }

  /** One row per enrolled student: lectures watched, quizzes, live-class attendance. */
  async students(user: AuthUser, courseId: string) {
    const c = await this.course(user, courseId);
    const [enrolled, lessons, quizzes, ended] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { courseId, status: 'ACTIVE' }, include: { user: { select: { id: true, fullName: true, email: true } } }, orderBy: { activatedAt: 'asc' } }),
      this.prisma.lesson.findMany({ where: { courseId, status: 'PUBLISHED' }, select: { id: true } }),
      this.prisma.quiz.findMany({ where: { courseId, status: 'PUBLISHED' }, select: { id: true } }),
      this.prisma.liveSession.findMany({ where: { courseId, status: 'ENDED' }, select: { id: true } }),
    ]);
    const userIds = enrolled.map((e) => e.userId);
    const [progress, attempts, attendance] = await Promise.all([
      this.prisma.lessonProgress.findMany({ where: { userId: { in: userIds }, lessonId: { in: lessons.map((l) => l.id) } }, select: { userId: true, completedAt: true, updatedAt: true } }),
      this.prisma.quizAttempt.findMany({ where: { userId: { in: userIds }, quizId: { in: quizzes.map((q) => q.id) } }, select: { userId: true, quizId: true, passed: true, score: true, total: true, createdAt: true } }),
      this.prisma.liveAttendance.findMany({ where: { userId: { in: userIds }, sessionId: { in: ended.map((s) => s.id) } }, select: { userId: true } }),
    ]);
    const rows = enrolled.map((e) => {
      const p = progress.filter((x) => x.userId === e.userId);
      const a = attempts.filter((x) => x.userId === e.userId);
      const last = [...p.map((x) => x.updatedAt), ...a.map((x) => x.createdAt)].sort((x, y) => y.getTime() - x.getTime())[0] ?? null;
      const attended = attendance.filter((x) => x.userId === e.userId).length;
      return {
        userId: e.userId, name: e.user.fullName, email: e.user.email, enrolledAt: e.activatedAt,
        lecturesDone: p.filter((x) => x.completedAt).length, lecturesTotal: lessons.length,
        quizzesPassed: new Set(a.filter((x) => x.passed).map((x) => x.quizId)).size, quizzesTried: new Set(a.map((x) => x.quizId)).size, quizzesTotal: quizzes.length,
        classesAttended: attended, classesHeld: ended.length, attendancePercent: ended.length ? Math.round((attended / ended.length) * 100) : null,
        lastActive: last,
      };
    });
    return { data: rows, meta: { course: { id: c.id, code: c.code, titleEn: c.titleEn, slug: c.slug } } };
  }

  /** Detail for one student in a course. */
  async student(user: AuthUser, courseId: string, userId: string) {
    await this.course(user, courseId);
    const e = await this.prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, include: { user: { select: { fullName: true, email: true } } } });
    if (!e) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Student is not enrolled in this course' });
    const [lessons, quizzes, sessions] = await Promise.all([
      this.prisma.lesson.findMany({ where: { courseId, status: 'PUBLISHED' }, orderBy: [{ topic: { sortOrder: 'asc' } }, { sortOrder: 'asc' }], select: { id: true, titleEn: true, progress: { where: { userId }, select: { completedAt: true, positionSec: true } } } }),
      this.prisma.quiz.findMany({ where: { courseId, status: 'PUBLISHED' }, orderBy: { sortOrder: 'asc' }, select: { id: true, titleEn: true, attempts: { where: { userId }, orderBy: { createdAt: 'desc' }, select: { score: true, total: true, passed: true, createdAt: true } } } }),
      this.prisma.liveSession.findMany({ where: { courseId, status: 'ENDED' }, orderBy: { scheduledAt: 'desc' }, take: 60, select: { id: true, titleEn: true, scheduledAt: true, attendance: { where: { userId }, select: { totalSeconds: true, firstJoinedAt: true } } } }),
    ]);
    return {
      data: {
        student: { id: userId, ...e.user, enrolledAt: e.activatedAt },
        lectures: lessons.map((l) => ({ id: l.id, titleEn: l.titleEn, completedAt: l.progress[0]?.completedAt ?? null, watchedSec: l.progress[0]?.positionSec ?? 0 })),
        quizzes: quizzes.map((q) => ({ id: q.id, titleEn: q.titleEn, attempts: q.attempts.length, best: q.attempts.reduce<{ score: number; total: number } | null>((b, a) => (!b || a.score > b.score ? { score: a.score, total: a.total } : b), null), passed: q.attempts.some((a) => a.passed) })),
        classes: sessions.map((s) => ({ id: s.id, titleEn: s.titleEn, scheduledAt: s.scheduledAt, attended: s.attendance.length > 0, minutes: Math.round((s.attendance[0]?.totalSeconds ?? 0) / 60) })),
      },
    };
  }

  // ── Assignments ──
  async assignments(user: AuthUser, courseId: string) {
    await this.course(user, courseId);
    const [rows, students] = await Promise.all([
      this.prisma.assignment.findMany({ where: { courseId }, orderBy: { dueAt: 'desc' }, include: { submissions: { select: { gradedAt: true } } } }),
      this.prisma.enrollment.count({ where: { courseId, status: 'ACTIVE' } }),
    ]);
    return { data: rows.map(({ submissions, ...a }) => ({ ...a, submitted: submissions.length, graded: submissions.filter((s) => s.gradedAt).length, students })) };
  }

  async createAssignment(user: AuthUser, courseId: string, b: { titleEn: string; titleAr: string; instructionsEn?: string | null; instructionsAr?: string | null; dueAt: Date; maxMarks: number; allowResubmit: boolean }) {
    const c = await this.course(user, courseId);
    const a = await this.prisma.assignment.create({ data: { courseId, ...b } });
    if (c.publishStatus === 'PUBLISHED') await this.notifications.notifyCourse(courseId, { type: 'assignment', titleEn: `New assignment: ${a.titleEn}`, titleAr: `واجب جديد: ${a.titleAr}`, bodyEn: `${c.titleEn} · due ${a.dueAt.toISOString().slice(0, 10)}`, bodyAr: c.titleAr, link: `/portal/assignments/${a.id}` });
    return { data: a };
  }

  async deleteAssignment(user: AuthUser, id: string) {
    const a = await this.prisma.assignment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Assignment not found' });
    await this.course(user, a.courseId);
    await this.prisma.assignment.delete({ where: { id } });
  }

  async submissions(user: AuthUser, assignmentId: string) {
    const a = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!a) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Assignment not found' });
    await this.course(user, a.courseId);
    const rows = await this.prisma.assignmentSubmission.findMany({ where: { assignmentId }, orderBy: { submittedAt: 'asc' }, include: { user: { select: { fullName: true, email: true } } } });
    return {
      data: rows.map((s) => ({
        id: s.id, student: s.user, text: s.text, fileName: s.fileName, submittedAt: s.submittedAt, attempts: s.attempts, marks: s.marks, feedback: s.feedback, gradedAt: s.gradedAt, late: s.submittedAt > a.dueAt,
        fileUrl: s.fileKey ? `/api/v1/media/${this.storage.sign({ key: s.fileKey, mime: 'application/pdf', name: s.fileName ?? 'submission.pdf', ttlSec: 3600 })}` : null,
      })),
      meta: { assignment: a },
    };
  }

  async grade(user: AuthUser, submissionId: string, marks: number, feedback: string | null) {
    const s = await this.prisma.assignmentSubmission.findUnique({ where: { id: submissionId }, include: { assignment: true } });
    if (!s) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Submission not found' });
    await this.course(user, s.assignment.courseId);
    if (marks < 0 || marks > s.assignment.maxMarks) throw new ForbiddenException({ code: 'INVALID_MARKS', message: `Marks must be between 0 and ${s.assignment.maxMarks}` });
    const g = await this.prisma.assignmentSubmission.update({ where: { id: submissionId }, data: { marks, feedback, gradedAt: new Date() } });
    await this.notifications.notify([s.userId], { type: 'assignment', titleEn: `Assignment graded: ${s.assignment.titleEn}`, titleAr: `تم تقييم الواجب: ${s.assignment.titleAr}`, bodyEn: `${marks}/${s.assignment.maxMarks}`, bodyAr: `${marks}/${s.assignment.maxMarks}`, link: `/portal/assignments/${s.assignmentId}` });
    return { data: g };
  }

  // ── Final results ──
  async results(user: AuthUser, courseId: string, term: string) {
    const c = await this.course(user, courseId);
    const [enrolled, rows] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { courseId, status: 'ACTIVE' }, include: { user: { select: { id: true, fullName: true, email: true } } } }),
      this.prisma.courseResult.findMany({ where: { courseId, term } }),
    ]);
    return { data: enrolled.map((e) => ({ student: e.user, result: rows.find((r) => r.userId === e.userId) ?? null })), meta: { creditHours: c.creditHours } };
  }

  /** Saves marks (grade and points come from the grading scale); `publish` releases them to students. */
  async saveResults(user: AuthUser, courseId: string, term: string, entries: { userId: string; marks: number }[], publish: boolean) {
    const c = await this.course(user, courseId);
    const now = new Date();
    for (const e of entries) {
      const enrolled = await this.prisma.enrollment.findUnique({ where: { userId_courseId: { userId: e.userId, courseId } } });
      if (enrolled?.status !== 'ACTIVE') continue;
      const g = gradeFor(e.marks);
      await this.prisma.courseResult.upsert({
        where: { userId_courseId_term: { userId: e.userId, courseId, term } },
        create: { userId: e.userId, courseId, term, marks: e.marks, grade: g.grade, gradePoints: g.points, creditHours: c.creditHours, enteredById: user.id, publishedAt: publish ? now : null },
        update: { marks: e.marks, grade: g.grade, gradePoints: g.points, creditHours: c.creditHours, enteredById: user.id, ...(publish ? { publishedAt: now } : {}) },
      });
    }
    if (publish) await this.notifications.notify(entries.map((e) => e.userId), { type: 'result', titleEn: `Result published: ${c.titleEn}`, titleAr: `تم نشر النتيجة: ${c.titleAr}`, link: '/portal/results' });
    return this.results(user, courseId, term);
  }
}
