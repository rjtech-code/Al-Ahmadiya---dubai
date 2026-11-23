import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

type Question = { textEn: string; textAr: string; options: { en: string; ar: string }[]; correct: number };
const ser = <T>(v: T) => JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? Number(x) : x))) as T;

/** Everything a student sees is gated by an ACTIVE enrollment (staff with lms.manage may preview). */
@Injectable()
export class LmsLearnerService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private async access(user: AuthUser, courseId: string) {
    if (user.permissions.includes('lms.manage')) return true;
    const e = await this.prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
    if (e?.status !== 'ACTIVE') throw new ForbiddenException({ code: 'NOT_ENROLLED', message: 'Enrol in this course to access its content.' });
    return true;
  }

  async myCourses(user: AuthUser) {
    const rows = await this.prisma.enrollment.findMany({
      where: { userId: user.id, status: 'ACTIVE' }, orderBy: { activatedAt: 'desc' },
      include: { course: { select: { id: true, slug: true, code: true, titleEn: true, titleAr: true, imagePath: true, deliveryMode: true, _count: { select: { lessons: { where: { status: 'PUBLISHED' } }, notes: { where: { status: 'PUBLISHED' } }, quizzes: { where: { status: 'PUBLISHED' } } } } } } },
    });
    return { data: rows };
  }

  async enrollmentStatus(user: AuthUser, slug: string) {
    const course = await this.prisma.course.findUnique({ where: { slug } });
    if (!course) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Course not found' });
    const e = await this.prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } });
    return { data: { status: e?.status ?? 'NONE' } };
  }

  async course(user: AuthUser, slug: string) {
    const c = await this.prisma.course.findFirst({
      where: { slug, deletedAt: null },
      include: {
        lessons: { where: { status: 'PUBLISHED' }, orderBy: { sortOrder: 'asc' }, select: { id: true, titleEn: true, titleAr: true, descriptionEn: true, descriptionAr: true, durationSec: true, videoKey: true } },
        notes: { where: { status: 'PUBLISHED' }, orderBy: { sortOrder: 'asc' }, select: { id: true, titleEn: true, titleAr: true, bodyEn: true, bodyAr: true, fileName: true, fileKey: true, lessonId: true } },
        quizzes: { where: { status: 'PUBLISHED' }, orderBy: { sortOrder: 'asc' } },
        liveSessions: { where: { status: { in: ['SCHEDULED', 'LIVE'] } }, orderBy: { scheduledAt: 'asc' }, select: { id: true, titleEn: true, titleAr: true, scheduledAt: true, durationMin: true, status: true } },
      },
    });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Course not found' });
    await this.access(user, c.id);
    const attempts = await this.prisma.quizAttempt.findMany({ where: { userId: user.id, quizId: { in: c.quizzes.map((q) => q.id) } }, orderBy: { createdAt: 'desc' } });
    return {
      data: ser({
        id: c.id, slug: c.slug, code: c.code, titleEn: c.titleEn, titleAr: c.titleAr, deliveryMode: c.deliveryMode, imagePath: c.imagePath,
        lessons: c.lessons.map(({ videoKey, ...l }) => ({ ...l, hasVideo: !!videoKey })),
        notes: c.notes.map(({ fileKey, ...n }) => ({ ...n, hasFile: !!fileKey })),
        // Correct answers are never sent to the browser.
        quizzes: c.quizzes.map((q) => ({
          id: q.id, titleEn: q.titleEn, titleAr: q.titleAr, passPercent: q.passPercent, lessonId: q.lessonId,
          questions: (q.questions as Question[]).map(({ correct: _c, ...rest }) => rest),
          lastAttempt: attempts.find((a) => a.quizId === q.id) ?? null,
        })),
        liveSessions: c.liveSessions,
      }),
    };
  }

  async lessonUrl(user: AuthUser, id: string) {
    const l = await this.prisma.lesson.findUnique({ where: { id } });
    if (!l || l.status !== 'PUBLISHED' || !l.videoKey) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lecture not found' });
    await this.access(user, l.courseId);
    return { data: { url: `/api/v1/media/${this.storage.sign({ key: l.videoKey, mime: l.videoMime ?? 'video/mp4', ttlSec: 4 * 3600 })}` } };
  }

  async noteUrl(user: AuthUser, id: string, download: boolean) {
    const n = await this.prisma.courseNote.findUnique({ where: { id } });
    if (!n || n.status !== 'PUBLISHED' || !n.fileKey) throw new NotFoundException({ code: 'NOT_FOUND', message: 'File not found' });
    await this.access(user, n.courseId);
    return { data: { url: `/api/v1/media/${this.storage.sign({ key: n.fileKey, mime: n.fileMime ?? 'application/pdf', name: n.fileName ?? 'notes.pdf', disposition: download ? 'attachment' : 'inline', ttlSec: 3600 })}` } };
  }

  async attempt(user: AuthUser, quizId: string, answers: number[]) {
    const q = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!q || q.status !== 'PUBLISHED') throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quiz not found' });
    await this.access(user, q.courseId);
    const questions = q.questions as Question[];
    const score = questions.reduce((s, qq, i) => s + (answers[i] === qq.correct ? 1 : 0), 0);
    const passed = questions.length ? (score / questions.length) * 100 >= q.passPercent : false;
    const a = await this.prisma.quizAttempt.create({ data: { quizId, userId: user.id, answers, score, total: questions.length, passed } });
    return { data: { ...a, correct: questions.map((qq) => qq.correct) } };
  }
}
