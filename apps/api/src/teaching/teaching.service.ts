import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../common/decorators';
import { seesAllCourses } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';

/** Teacher dashboard: own courses, upcoming classes and each student's progress. */
@Injectable()
export class TeachingService {
  constructor(private readonly prisma: PrismaService) {}

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
}
