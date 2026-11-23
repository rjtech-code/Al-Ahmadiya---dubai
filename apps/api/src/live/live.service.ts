import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/decorators';
import { QuizQuestion } from '../lms/lms.schemas';
import { assertFileType } from '../lms/uploads';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { seesAllCourses } from '../common/permissions';

export const ScheduleInput = z.object({
  courseId: z.uuid(),
  titleEn: z.string().trim().min(1).max(200),
  titleAr: z.string().trim().min(1).max(200),
  scheduledAt: z.coerce.date(),
  durationMin: z.coerce.number().int().min(10).max(600).default(60),
});

/** Recording upload: draft keeps it private; publish turns it into a lesson, optionally with notes and a quiz. */
const RecordingMeta = z.object({
  action: z.enum(['draft', 'publish']),
  titleEn: z.string().trim().min(1).max(200).optional(),
  titleAr: z.string().trim().min(1).max(200).optional(),
  descriptionEn: z.string().trim().max(5000).optional(),
  descriptionAr: z.string().trim().max(5000).optional(),
  notesEn: z.string().trim().max(50_000).optional(),
  notesAr: z.string().trim().max(50_000).optional(),
  quiz: z.string().max(200_000).optional(), // JSON array of questions
});

const VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];

@Injectable()
export class LiveService {
  constructor(
    private readonly prisma: PrismaService, private readonly storage: StorageService, private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  config() {
    // Our own media server; no third-party provider.
    return { data: { provider: 'native', socketPath: '/live' } };
  }

  /** Admins host any class; a teacher hosts classes of the courses assigned to them. */
  canHost(user: { id: string; permissions: string[] }, s: { hostId: string | null; course: { teacherId: string | null } }) {
    return seesAllCourses(user.permissions) || s.course.teacherId === user.id || s.hostId === user.id;
  }

  /** Session lookup for staff endpoints, enforcing ownership. */
  async owned(id: string, user: AuthUser) {
    const s = await this.get(id);
    if (!this.canHost(user, s)) throw new ForbiddenException({ code: 'NOT_YOUR_CLASS', message: 'This class belongs to another teacher.' });
    return s;
  }

  async list(user: AuthUser, courseId?: string) {
    return {
      data: await this.prisma.liveSession.findMany({
        where: { ...(courseId ? { courseId } : {}), ...(seesAllCourses(user.permissions) ? {} : { OR: [{ course: { teacherId: user.id } }, { hostId: user.id }] }) }, orderBy: { scheduledAt: 'desc' }, take: 200,
        include: { course: { select: { code: true, titleEn: true, slug: true } }, host: { select: { fullName: true } }, lesson: { select: { id: true, status: true } } },
      }),
    };
  }

  async get(id: string) {
    const s = await this.prisma.liveSession.findUnique({ where: { id }, include: { course: { select: { id: true, code: true, titleEn: true, titleAr: true, slug: true, teacherId: true } }, lesson: { select: { id: true, status: true } } } });
    if (!s) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Live class not found' });
    return s;
  }

  async schedule(body: z.infer<typeof ScheduleInput>, actor: AuthUser) {
    const course = await this.prisma.course.findFirst({ where: { id: body.courseId, deletedAt: null } });
    if (!course) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Course not found' });
    if (!course.onlineEnabled) throw new BadRequestException({ code: 'COURSE_NOT_ONLINE', message: 'Enable online learning for this course first.' });
    if (!seesAllCourses(actor.permissions) && course.teacherId !== actor.id) throw new ForbiddenException({ code: 'NOT_YOUR_COURSE', message: 'You can only schedule classes for your own courses.' });
    const s = await this.prisma.liveSession.create({ data: { ...body, hostId: actor.id, roomName: `alahmadiya-${randomBytes(12).toString('hex')}` } });
    await this.notifications.notifyCourse(course.id, {
      type: 'live-class', titleEn: `Class scheduled: ${s.titleEn}`, titleAr: `حصة مجدولة: ${s.titleAr}`,
      bodyEn: `${course.titleEn} · ${s.scheduledAt.toISOString()}`, bodyAr: course.titleAr, link: '/account#live',
    });
    await this.audit.log({ actorId: actor.id, action: 'live.schedule', entityType: 'LiveSession', entityId: s.id });
    return { data: s };
  }

  /** Teacher's "Go live now": an unscheduled class that opens immediately. */
  async goLiveNow(courseId: string, actor: AuthUser) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
    if (!course) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Course not found' });
    if (!seesAllCourses(actor.permissions) && course.teacherId !== actor.id) throw new ForbiddenException({ code: 'NOT_YOUR_COURSE', message: 'You can only start classes for your own courses.' });
    const now = new Date();
    const s = await this.prisma.liveSession.create({
      data: { courseId, hostId: actor.id, titleEn: `${course.titleEn} — live class`, titleAr: `${course.titleAr} — حصة مباشرة`, scheduledAt: now, startedAt: now, notifiedAt: now, status: 'LIVE', durationMin: 60, roomName: `alahmadiya-${randomBytes(12).toString('hex')}` },
    });
    await this.notifications.notifyCourse(courseId, {
      type: 'live-class', titleEn: `Live now: ${course.titleEn}`, titleAr: `مباشر الآن: ${course.titleAr}`, bodyEn: 'Your teacher started a live class — join now.', bodyAr: 'بدأ المعلم حصة مباشرة — انضم الآن.', link: `/account/live/${s.id}`,
    });
    await this.audit.log({ actorId: actor.id, action: 'live.golive', entityType: 'LiveSession', entityId: s.id });
    return { data: s };
  }

  async start(id: string, actor: AuthUser) {
    const s = await this.owned(id, actor);
    if (s.status === 'ENDED' || s.status === 'CANCELLED') throw new ConflictException({ code: 'SESSION_CLOSED', message: 'This class has already ended.' });
    const updated = await this.prisma.liveSession.update({ where: { id }, data: { status: 'LIVE', startedAt: s.startedAt ?? new Date(), hostId: actor.id } });
    if (s.status !== 'LIVE') {
      await this.notifications.notifyCourse(s.courseId, {
        type: 'live-class', titleEn: `Live now: ${s.titleEn}`, titleAr: `مباشر الآن: ${s.titleAr}`,
        bodyEn: `${s.course.titleEn} — join the class`, bodyAr: `${s.course.titleAr} — انضم إلى الحصة`, link: `/account/live/${s.id}`,
      });
    }
    return { data: updated };
  }

  async end(id: string, actor?: AuthUser) {
    if (actor) await this.owned(id, actor); else await this.get(id);
    const updated = await this.prisma.liveSession.update({ where: { id }, data: { status: 'ENDED', endedAt: new Date() } });
    return { data: updated };
  }

  /**
   * Attendance for every enrolled student (absent ones included):
   * PRESENT ≥ presentPercent of the class; LATE = present but first joined after lateAfterMin; PARTIAL; ABSENT.
   */
  async attendance(id: string, actor?: AuthUser) {
    if (actor) await this.owned(id, actor);
    const s = await this.prisma.liveSession.findUnique({ where: { id }, include: { attendance: { include: { user: { select: { fullName: true, email: true } } } } } });
    if (!s) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Live class not found' });
    const enrolled = await this.prisma.enrollment.findMany({ where: { courseId: s.courseId, status: 'ACTIVE' }, include: { user: { select: { id: true, fullName: true, email: true } } } });
    const start = s.startedAt ?? s.scheduledAt;
    const end = s.endedAt ?? new Date();
    const classSeconds = Math.max(1, Math.round((end.getTime() - start.getTime()) / 1000));
    const rows = enrolled.map((e) => {
      const a = s.attendance.find((x) => x.userId === e.user.id);
      const seconds = a?.totalSeconds ?? 0;
      const pct = Math.min(100, Math.round((seconds / classSeconds) * 100));
      const late = !!a && a.firstJoinedAt.getTime() > start.getTime() + s.lateAfterMin * 60_000;
      const status = !a ? 'ABSENT' : pct >= s.presentPercent ? (late ? 'LATE' : 'PRESENT') : 'PARTIAL';
      return { userId: e.user.id, name: e.user.fullName, email: e.user.email, firstJoinedAt: a?.firstJoinedAt ?? null, lastLeftAt: a?.lastLeftAt ?? null, joinCount: a?.joinCount ?? 0, minutes: Math.round(seconds / 60), percent: pct, status, onlineNow: false };
    });
    const count = (st: string) => rows.filter((r) => r.status === st).length;
    return { data: rows.sort((x, y) => x.name.localeCompare(y.name)), meta: { classMinutes: Math.round(classSeconds / 60), presentPercent: s.presentPercent, lateAfterMin: s.lateAfterMin, enrolled: rows.length, present: count('PRESENT'), late: count('LATE'), partial: count('PARTIAL'), absent: count('ABSENT') } };
  }

  async cancel(id: string, actor: AuthUser) {
    const s = await this.owned(id, actor);
    if (s.status === 'LIVE') throw new ConflictException({ code: 'SESSION_LIVE', message: 'End the class instead of cancelling it.' });
    return { data: await this.prisma.liveSession.update({ where: { id }, data: { status: 'CANCELLED' } }) };
  }

  /** Teacher's post-class choice: save the recording as a draft, or publish it as a lesson (+ notes + quiz). */
  async uploadRecording(id: string, body: unknown, file: Express.Multer.File | undefined, actor: AuthUser) {
    const s = await this.owned(id, actor).catch(async (e: unknown) => { if (file) await rm(file.path, { force: true }); throw e; });
    const m = RecordingMeta.safeParse(body);
    if (!m.success) { if (file) await rm(file.path, { force: true }); throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Validation failed', details: m.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }); }
    if (file) {
      const mime = await assertFileType(file, VIDEO, 'video');
      const { key } = await this.storage.putFile(`courses/${s.courseId}/recordings`, file.path);
      if (s.recordingKey && s.recordingStatus !== 'PUBLISHED') await this.storage.remove(s.recordingKey);
      await this.prisma.liveSession.update({ where: { id }, data: { recordingKey: key, recordingMime: mime, recordingStatus: 'DRAFT', status: s.status === 'LIVE' ? 'ENDED' : s.status, endedAt: s.endedAt ?? new Date() } });
    }
    const fresh = await this.get(id);
    if (!fresh.recordingKey) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Upload the class recording first' });
    if (m.data.action === 'draft') return { data: fresh };
    return this.publish(fresh.id, m.data, actor);
  }

  private async publish(id: string, meta: z.infer<typeof RecordingMeta>, actor: AuthUser) {
    const s = await this.get(id);
    if (s.lesson) throw new ConflictException({ code: 'ALREADY_PUBLISHED', message: 'This recording is already published.' });
    let questions: z.infer<typeof QuizQuestion>[] | null = null;
    if (meta.quiz && meta.quiz.trim()) {
      const parsed = z.array(QuizQuestion).min(1).max(100).safeParse(JSON.parse(meta.quiz));
      if (!parsed.success) throw new BadRequestException({ code: 'INVALID_QUIZ', message: 'Quiz questions are invalid' });
      questions = parsed.data;
    }
    const titleEn = meta.titleEn ?? s.titleEn, titleAr = meta.titleAr ?? s.titleAr;
    const lesson = await this.prisma.$transaction(async (tx) => {
      const last = await tx.lesson.aggregate({ where: { courseId: s.courseId }, _max: { sortOrder: true } });
      const bytes = await this.storage.size(s.recordingKey!);
      const l = await tx.lesson.create({
        data: { courseId: s.courseId, titleEn, titleAr, descriptionEn: meta.descriptionEn, descriptionAr: meta.descriptionAr, videoKey: s.recordingKey, videoMime: s.recordingMime, videoBytes: BigInt(bytes), status: 'PUBLISHED', liveSessionId: s.id, sortOrder: (last._max.sortOrder ?? 0) + 10 },
      });
      if (meta.notesEn || meta.notesAr) await tx.courseNote.create({ data: { courseId: s.courseId, lessonId: l.id, titleEn: `Notes: ${titleEn}`, titleAr: `ملاحظات: ${titleAr}`, bodyEn: meta.notesEn, bodyAr: meta.notesAr } });
      if (questions) await tx.quiz.create({ data: { courseId: s.courseId, lessonId: l.id, titleEn: `Quiz: ${titleEn}`, titleAr: `اختبار: ${titleAr}`, questions } });
      await tx.liveSession.update({ where: { id: s.id }, data: { recordingStatus: 'PUBLISHED' } });
      await this.notifications.notifyCourse(s.courseId, { type: 'lesson', titleEn: `Recording available: ${titleEn}`, titleAr: `التسجيل متاح: ${titleAr}`, link: `/account/courses/${s.course.slug}` }, tx);
      return l;
    });
    await this.audit.log({ actorId: actor.id, action: 'live.recording.publish', entityType: 'LiveSession', entityId: s.id });
    return { data: { ...(await this.get(id)), lessonId: lesson.id } };
  }

  async publishDraft(id: string, body: unknown, actor: AuthUser) {
    await this.owned(id, actor);
    const m = RecordingMeta.parse({ ...(body as object), action: 'publish' });
    return this.publish(id, m, actor);
  }

  async recordingUrl(id: string, actor: AuthUser) {
    const s = await this.owned(id, actor);
    if (!s.recordingKey) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No recording uploaded' });
    return { data: { url: `/api/v1/media/${this.storage.sign({ key: s.recordingKey, mime: s.recordingMime ?? 'video/webm', name: `${s.titleEn}.webm`, disposition: 'attachment' })}` } };
  }

  // ── Students ──
  async mine(user: AuthUser) {
    const enrolled = await this.prisma.enrollment.findMany({ where: { userId: user.id, status: 'ACTIVE' }, select: { courseId: true } });
    const since = new Date(Date.now() - 7 * 86_400_000);
    return {
      data: await this.prisma.liveSession.findMany({
        where: { courseId: { in: enrolled.map((e) => e.courseId) }, OR: [{ status: { in: ['SCHEDULED', 'LIVE'] } }, { status: 'ENDED', endedAt: { gte: since } }] },
        orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }],
        select: { id: true, titleEn: true, titleAr: true, scheduledAt: true, durationMin: true, status: true, course: { select: { slug: true, titleEn: true, titleAr: true } }, lesson: { select: { id: true } }, attendance: { where: { userId: user.id }, select: { totalSeconds: true, firstJoinedAt: true } } },
      }),
    };
  }

  /** Central gate: only students with an ACTIVE (paid) enrollment can join, and only while the class is live. */
  async join(user: AuthUser, id: string) {
    const s = await this.get(id);
    const e = await this.prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: s.courseId } } });
    if (e?.status !== 'ACTIVE' && !this.canHost(user, s)) throw new ForbiddenException({ code: 'NOT_ENROLLED', message: 'Only enrolled students can join this class.' });
    if (s.status !== 'LIVE') throw new ConflictException({ code: 'NOT_LIVE', message: s.status === 'SCHEDULED' ? 'The class has not started yet.' : 'This class has ended.' });
    return { data: { sessionId: s.id, titleEn: s.titleEn, titleAr: s.titleAr, course: s.course } };
  }
}
