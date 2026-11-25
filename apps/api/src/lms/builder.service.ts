import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/decorators';
import { LiveSchedulerService } from '../live/scheduler.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as S from './lms.schemas';
import { assertFileType } from './uploads';

const IMAGE_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
/** Public course images live under STORAGE_DIR/public and are served by FilesController. */
export const PUBLIC_IMAGE_PREFIX = '/api/v1/files/';

@Injectable()
export class CourseBuilderService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService, private readonly audit: AuditService, private readonly scheduler: LiveSchedulerService) {}

  async options() {
    const [departments, teachers] = await Promise.all([
      this.prisma.department.findMany({ where: { deletedAt: null }, orderBy: { nameEn: 'asc' }, select: { id: true, nameEn: true, college: { select: { nameEn: true } } } }),
      this.prisma.user.findMany({
        where: { deletedAt: null, isActive: true, roles: { some: { role: { permissions: { some: { permission: { key: 'teach.own' } } } } } } },
        orderBy: { fullName: 'asc' }, select: { id: true, fullName: true, email: true },
      }),
    ]);
    return { data: { departments, teachers } };
  }

  private data(b: z.infer<typeof S.CourseDetails>) {
    return {
      titleEn: b.titleEn, titleAr: b.titleAr, code: b.code, departmentId: b.departmentId, descriptionEn: b.descriptionEn || null, descriptionAr: b.descriptionAr || null,
      outcomesEn: b.outcomesEn, outcomesAr: b.outcomesAr, creditHours: b.creditHours, priceFils: Math.round(b.priceAed * 100), teacherId: b.teacherId ?? null, isFeatured: b.isFeatured,
    };
  }

  private async assertUniqueCode(code: string, exceptId?: string) {
    const clash = await this.prisma.course.findFirst({ where: { OR: [{ code }, { slug: code.toLowerCase() }], ...(exceptId ? { NOT: { id: exceptId } } : {}) } });
    if (clash) throw new ConflictException({ code: 'CODE_TAKEN', message: `Course code ${code} is already used by another course.` });
  }

  async create(b: z.infer<typeof S.CourseDetails>, actor: AuthUser) {
    await this.assertUniqueCode(b.code);
    const c = await this.prisma.course.create({
      data: { ...this.data(b), slug: b.code.toLowerCase(), courseType: 'Core', onlineEnabled: true, publishStatus: 'DRAFT', confirmation: 'CONFIRMED' },
    });
    await this.audit.log({ actorId: actor.id, action: 'lms.course.create', entityType: 'Course', entityId: c.id });
    return { data: c };
  }

  async update(id: string, b: z.infer<typeof S.CourseDetails>) {
    await this.get(id);
    await this.assertUniqueCode(b.code, id);
    return { data: await this.prisma.course.update({ where: { id }, data: { ...this.data(b), slug: b.code.toLowerCase(), onlineEnabled: true } }) };
  }

  private async get(id: string) {
    const c = await this.prisma.course.findFirst({ where: { id, deletedAt: null } });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Course not found' });
    return c;
  }

  async setImage(id: string, file: Express.Multer.File | undefined) {
    const c = await this.get(id);
    const mime = await assertFileType(file, Object.keys(IMAGE_EXT), 'image');
    const imagePath = await this.storage.putImage(file!.path, 'courses', IMAGE_EXT[mime]);
    await this.storage.removeImage(c.imagePath);
    return { data: await this.prisma.course.update({ where: { id }, data: { imagePath } }) };
  }

  // ── Topics ──
  async addTopic(courseId: string, b: z.infer<typeof S.TopicInput>) {
    await this.get(courseId);
    const last = await this.prisma.courseTopic.aggregate({ where: { courseId }, _max: { sortOrder: true } });
    return { data: await this.prisma.courseTopic.create({ data: { courseId, ...b, sortOrder: (last._max.sortOrder ?? 0) + 10 } }) };
  }

  async updateTopic(id: string, b: z.infer<typeof S.TopicInput>) {
    return { data: await this.prisma.courseTopic.update({ where: { id }, data: b }) };
  }

  async deleteTopic(id: string) {
    const t = await this.prisma.courseTopic.findUnique({ where: { id }, include: { _count: { select: { lessons: true } } } });
    if (!t) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Topic not found' });
    if (t._count.lessons) throw new ConflictException({ code: 'TOPIC_NOT_EMPTY', message: 'Delete or move the lectures in this topic first.' });
    await this.prisma.courseTopic.delete({ where: { id } });
  }

  async reorderTopics(courseId: string, ids: string[]) {
    await this.prisma.$transaction(ids.map((id, i) => this.prisma.courseTopic.updateMany({ where: { id, courseId }, data: { sortOrder: (i + 1) * 10 } })));
  }

  // ── Weekly live timetable ──
  async setLivePlan(courseId: string, p: z.infer<typeof S.LivePlan>, actor: AuthUser) {
    await this.get(courseId);
    await this.prisma.$transaction(async (tx) => {
      // Future classes generated from the old timetable are replaced.
      await tx.liveSession.deleteMany({ where: { courseId, slotId: { not: null }, status: 'SCHEDULED', scheduledAt: { gt: new Date() } } });
      await tx.liveSlot.deleteMany({ where: { courseId } });
      await tx.course.update({
        where: { id: courseId },
        data: { deliveryMode: p.enabled ? 'LIVE' : 'RECORDED', liveStartsOn: p.enabled ? new Date(p.startsOn!) : null, liveEndsOn: p.enabled ? new Date(p.endsOn!) : null },
      });
      if (p.enabled) await tx.liveSlot.createMany({ data: p.slots.map((s) => ({ courseId, ...s })) });
    });
    await this.scheduler.generate(courseId);
    await this.audit.log({ actorId: actor.id, action: 'lms.course.liveplan', entityType: 'Course', entityId: courseId, metadata: p });
    return { data: await this.prisma.liveSlot.findMany({ where: { courseId }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] }) };
  }

  async publish(courseId: string, publish: boolean, actor: AuthUser) {
    const c = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null }, include: { _count: { select: { lessons: true, liveSlots: true } } } });
    if (!c) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Course not found' });
    if (publish && !c._count.lessons && !c._count.liveSlots) throw new BadRequestException({ code: 'COURSE_EMPTY', message: 'Add at least one lecture or a live timetable before publishing.' });
    const updated = await this.prisma.course.update({ where: { id: courseId }, data: { publishStatus: publish ? 'PUBLISHED' : 'DRAFT', confirmation: 'CONFIRMED', onlineEnabled: true } });
    if (publish) await this.scheduler.generate(courseId);
    await this.audit.log({ actorId: actor.id, action: publish ? 'lms.course.publish' : 'lms.course.unpublish', entityType: 'Course', entityId: courseId });
    return { data: updated };
  }
}
