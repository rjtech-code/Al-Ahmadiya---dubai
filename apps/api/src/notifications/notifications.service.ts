import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationInput { type: string; titleEn: string; titleAr: string; bodyEn?: string; bodyAr?: string; link?: string }

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  notify(userIds: string[], n: NotificationInput, tx?: Prisma.TransactionClient) {
    if (!userIds.length) return Promise.resolve({ count: 0 });
    return (tx ?? this.prisma).notification.createMany({ data: [...new Set(userIds)].map((userId) => ({ userId, ...n })) });
  }

  /** Notify every student with an ACTIVE enrollment in the course. */
  async notifyCourse(courseId: string, n: NotificationInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const enrolled = await db.enrollment.findMany({ where: { courseId, status: 'ACTIVE' }, select: { userId: true } });
    return this.notify(enrolled.map((e) => e.userId), n, tx);
  }
}
