import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/** Data retention: staff login history and the staff action trail are kept for 12 months, then deleted. */
@Injectable()
export class RetentionService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Retention');
  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    void this.purge();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'Asia/Dubai' })
  async purge() {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    try {
      const [logins, audit, notes] = await Promise.all([
        this.prisma.staffLogin.deleteMany({ where: { createdAt: { lt: cutoff } } }),
        this.prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
        this.prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff }, readAt: { not: null } } }),
      ]);
      if (logins.count || audit.count || notes.count) this.logger.log(`Purged ${logins.count} staff logins, ${audit.count} audit rows, ${notes.count} read notifications older than 12 months`);
      return { logins: logins.count, audit: audit.count, notifications: notes.count };
    } catch (e) {
      this.logger.error(`Retention purge failed: ${(e as Error).message}`);
      return null;
    }
  }
}
