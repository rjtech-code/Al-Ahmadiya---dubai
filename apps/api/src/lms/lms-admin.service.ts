import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { rm } from 'node:fs/promises';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/decorators';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as S from './lms.schemas';
import { assertFileType } from './uploads';

const VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
const ser = <T>(v: T) => JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? Number(x) : x))) as T;

@Injectable()
export class LmsAdminService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService, private readonly audit: AuditService, private readonly notifications: NotificationsService) {}

  async courses() {
    const rows = await this.prisma.course.findMany({
      where: { deletedAt: null }, orderBy: { code: 'asc' },
      select: {
        id: true, slug: true, code: true, titleEn: true, titleAr: true, publishStatus: true, confirmation: true, isDemo: true, onlineEnabled: true, deliveryMode: true, priceFils: true, currency: true,
        department: { select: { nameEn: true } },
        _count: { select: { lessons: true, notes: true, quizzes: true, liveSessions: true } },
        enrollments: { where: { status: 'ACTIVE' }, select: { id: true } },
      },
    });
    return { data: rows.map(({ enrollments, ...r }) => ({ ...r, activeStudents: enrollments.length })) };
  }

  async course(id: string) {
    const c = await this.prisma.course.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: { select: { id: true, nameEn: true } },
        lessons: { orderBy: { sortOrder: 'asc' } },
        notes: { orderBy: { sortOrder: 'asc' } },
        quizzes: { orderBy: { sortOrder: 'asc' } },
        liveSessions: { orderBy: { scheduledAt: 'desc' }, take: 50 },
        enrollments: { orderBy: { createdAt: 'desc' }, take: 200, include: { user: { select: { fullName: true, email: true } } } },
      },
    });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Course not found' });
    return { data: ser(c) };
  }

  async setOnline(id: string, body: z.infer<typeof S.OnlineSettings>, actor: AuthUser) {
    await this.course(id);
    const c = await this.prisma.course.update({
      where: { id },
      data: { onlineEnabled: body.onlineEnabled, deliveryMode: body.deliveryMode, priceFils: body.priceAed === null ? null : Math.round(body.priceAed * 100) },
    });
    await this.audit.log({ actorId: actor.id, action: 'lms.course.online', entityType: 'Course', entityId: id, metadata: body });
    return { data: c };
  }

  // ── Lessons ──
  async addLesson(courseId: string, meta: unknown, file: Express.Multer.File | undefined, actor: AuthUser) {
    await this.course(courseId);
    const m = S.LessonMeta.safeParse(meta);
    if (!m.success) { if (file) await rm(file.path, { force: true }); throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Validation failed', details: m.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }); }
    const mime = await assertFileType(file, VIDEO, 'video');
    const { key, bytes } = await this.storage.putFile(`courses/${courseId}/lessons`, file!.path);
    const last = await this.prisma.lesson.aggregate({ where: { courseId }, _max: { sortOrder: true } });
    const lesson = await this.prisma.lesson.create({ data: { courseId, ...m.data, videoKey: key, videoMime: mime, videoBytes: BigInt(bytes), sortOrder: (last._max.sortOrder ?? 0) + 10 } });
    if (lesson.status === 'PUBLISHED') await this.announceLesson(courseId, lesson.titleEn, lesson.titleAr);
    await this.audit.log({ actorId: actor.id, action: 'lms.lesson.create', entityType: 'Lesson', entityId: lesson.id });
    return { data: ser(lesson) };
  }

  async updateLesson(id: string, meta: unknown) {
    const before = await this.prisma.lesson.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lesson not found' });
    const m = S.LessonMeta.parse(meta);
    const lesson = await this.prisma.lesson.update({ where: { id }, data: m });
    if (before.status === 'DRAFT' && lesson.status === 'PUBLISHED') await this.announceLesson(lesson.courseId, lesson.titleEn, lesson.titleAr);
    return { data: ser(lesson) };
  }

  async replaceVideo(id: string, file: Express.Multer.File | undefined) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) { if (file) await rm(file.path, { force: true }); throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lesson not found' }); }
    const mime = await assertFileType(file, VIDEO, 'video');
    const { key, bytes } = await this.storage.putFile(`courses/${lesson.courseId}/lessons`, file!.path);
    if (lesson.videoKey) await this.storage.remove(lesson.videoKey);
    return { data: ser(await this.prisma.lesson.update({ where: { id }, data: { videoKey: key, videoMime: mime, videoBytes: BigInt(bytes) } })) };
  }

  async deleteLesson(id: string, actor: AuthUser) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Lesson not found' });
    await this.prisma.lesson.delete({ where: { id } });
    if (lesson.videoKey) await this.storage.remove(lesson.videoKey);
    await this.audit.log({ actorId: actor.id, action: 'lms.lesson.delete', entityType: 'Lesson', entityId: id });
  }

  async reorder(courseId: string, ids: string[]) {
    await this.prisma.$transaction(ids.map((id, i) => this.prisma.lesson.updateMany({ where: { id, courseId }, data: { sortOrder: (i + 1) * 10 } })));
    return this.course(courseId);
  }

  async lessonPreviewUrl(id: string) {
    const l = await this.prisma.lesson.findUnique({ where: { id } });
    if (!l?.videoKey) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Video not found' });
    return { data: { url: `/api/v1/media/${this.storage.sign({ key: l.videoKey, mime: l.videoMime ?? 'video/mp4' })}` } };
  }

  private announceLesson(courseId: string, titleEn: string, titleAr: string) {
    return this.prisma.course.findUniqueOrThrow({ where: { id: courseId } }).then((c) => this.notifications.notifyCourse(courseId, {
      type: 'lesson', titleEn: `New lecture: ${titleEn}`, titleAr: `محاضرة جديدة: ${titleAr}`, bodyEn: c.titleEn, bodyAr: c.titleAr, link: `/account/courses/${c.slug}`,
    }));
  }

  // ── Notes ──
  async addNote(courseId: string, body: unknown, file: Express.Multer.File | undefined) {
    await this.course(courseId);
    const n = S.NoteInput.safeParse(body);
    if (!n.success) { if (file) await rm(file.path, { force: true }); throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Validation failed', details: n.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }); }
    if (!file && !n.data.bodyEn && !n.data.bodyAr) throw new BadRequestException({ code: 'NOTE_EMPTY', message: 'Add a PDF file or write the note text' });
    let fileData = {};
    if (file) {
      const mime = await assertFileType(file, ['application/pdf'], 'PDF');
      const { key } = await this.storage.putFile(`courses/${courseId}/notes`, file.path);
      fileData = { fileKey: key, fileMime: mime, fileName: file.originalname.slice(0, 200) };
    }
    const last = await this.prisma.courseNote.aggregate({ where: { courseId }, _max: { sortOrder: true } });
    return { data: await this.prisma.courseNote.create({ data: { courseId, ...n.data, ...fileData, sortOrder: (last._max.sortOrder ?? 0) + 10 } }) };
  }

  async updateNote(id: string, body: unknown) {
    const n = S.NoteInput.parse(body);
    return { data: await this.prisma.courseNote.update({ where: { id }, data: n }) };
  }

  async deleteNote(id: string) {
    const n = await this.prisma.courseNote.findUnique({ where: { id } });
    if (!n) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Note not found' });
    await this.prisma.courseNote.delete({ where: { id } });
    if (n.fileKey) await this.storage.remove(n.fileKey);
  }

  // ── Quizzes ──
  async addQuiz(courseId: string, body: z.infer<typeof S.QuizInput>) {
    await this.course(courseId);
    const last = await this.prisma.quiz.aggregate({ where: { courseId }, _max: { sortOrder: true } });
    return { data: await this.prisma.quiz.create({ data: { courseId, ...body, sortOrder: (last._max.sortOrder ?? 0) + 10 } }) };
  }

  async updateQuiz(id: string, body: z.infer<typeof S.QuizInput>) {
    return { data: await this.prisma.quiz.update({ where: { id }, data: body }) };
  }

  async deleteQuiz(id: string) {
    await this.prisma.quiz.delete({ where: { id } });
  }
}
