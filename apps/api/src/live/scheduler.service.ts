import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'node:crypto';
import { addDays, dubaiDate, dubaiInstant, isoWeekday, minutesBetween } from '../common/dubai-time';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { LiveService } from './live.service';

const LOOKAHEAD_DAYS = 7;
const AUTO_END_GRACE_MIN = 30;

/**
 * Turns each course's weekly timetable into live classes:
 *  - creates the classes for the next 7 days (so students and teachers see them in advance);
 *  - at the start time, opens the class and notifies enrolled students and the teacher;
 *  - closes classes left open 30 minutes past their end time.
 */
@Injectable()
export class LiveSchedulerService {
  private readonly logger = new Logger('LiveScheduler');
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService, private readonly live: LiveService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    if (this.running || process.env.NODE_ENV === 'test') return;
    this.running = true;
    try {
      await this.generate();
      await this.openDue();
      await this.closeStale();
    } catch (e) {
      this.logger.error(`Scheduler run failed: ${(e as Error).message}`);
    } finally { this.running = false; }
  }

  /** Creates upcoming classes from timetables (idempotent: one class per slot per date). */
  async generate(courseId?: string, now = new Date()) {
    const today = dubaiDate(now);
    const courses = await this.prisma.course.findMany({
      where: { ...(courseId ? { id: courseId } : {}), deletedAt: null, publishStatus: 'PUBLISHED', deliveryMode: 'LIVE', liveStartsOn: { not: null }, liveSlots: { some: {} } },
      include: { liveSlots: true },
    });
    let created = 0;
    for (const c of courses) {
      const from = dubaiDate(c.liveStartsOn!) > today ? dubaiDate(c.liveStartsOn!) : today;
      const until = c.liveEndsOn ? dubaiDate(c.liveEndsOn) : addDays(today, LOOKAHEAD_DAYS);
      const rows = [];
      for (let d = from; d <= addDays(today, LOOKAHEAD_DAYS) && d <= until; d = addDays(d, 1)) {
        for (const s of c.liveSlots.filter((x) => x.weekday === isoWeekday(d))) {
          const start = dubaiInstant(d, s.startTime);
          const durationMin = minutesBetween(s.startTime, s.endTime);
          if (start.getTime() + durationMin * 60_000 <= now.getTime()) continue;
          rows.push({
            courseId: c.id, slotId: s.id, hostId: c.teacherId, scheduledAt: start, durationMin,
            titleEn: `${c.titleEn} — live class`, titleAr: `${c.titleAr} — حصة مباشرة`, roomName: `alahmadiya-${randomBytes(12).toString('hex')}`,
          });
        }
      }
      if (rows.length) created += (await this.prisma.liveSession.createMany({ data: rows, skipDuplicates: true })).count;
    }
    return created;
  }

  /** At the start time: open the class and tell everyone. */
  async openDue(now = new Date()) {
    const due = await this.prisma.liveSession.findMany({
      where: { status: 'SCHEDULED', notifiedAt: null, scheduledAt: { lte: now } },
      include: { course: { select: { titleEn: true, titleAr: true, teacherId: true } } }, take: 100,
    });
    for (const s of due) {
      const endsAt = s.scheduledAt.getTime() + s.durationMin * 60_000;
      if (endsAt <= now.getTime()) {
        await this.prisma.liveSession.update({ where: { id: s.id }, data: { status: 'CANCELLED', notifiedAt: now } });
        continue;
      }
      const claimed = await this.prisma.liveSession.updateMany({ where: { id: s.id, status: 'SCHEDULED', notifiedAt: null }, data: { status: 'LIVE', startedAt: s.scheduledAt, notifiedAt: now } });
      if (!claimed.count) continue;
      await this.notifications.notifyCourse(s.courseId, {
        type: 'live-class', titleEn: `Live class starting now: ${s.course.titleEn}`, titleAr: `الحصة المباشرة تبدأ الآن: ${s.course.titleAr}`,
        bodyEn: 'Tap to join the class.', bodyAr: 'اضغط للانضمام إلى الحصة.', link: `/portal/live/${s.id}`,
      });
      const teacher = s.hostId ?? s.course.teacherId;
      if (teacher) await this.notifications.notify([teacher], { type: 'live-class', titleEn: `Your class is starting: ${s.course.titleEn}`, titleAr: `حصتك تبدأ الآن: ${s.course.titleAr}`, link: `/admin/live/${s.id}` });
    }
    return due.length;
  }

  async closeStale(now = new Date()) {
    const live = await this.prisma.liveSession.findMany({ where: { status: 'LIVE' }, select: { id: true, startedAt: true, scheduledAt: true, durationMin: true } });
    for (const s of live) {
      const start = (s.startedAt ?? s.scheduledAt).getTime();
      if (start + (s.durationMin + AUTO_END_GRACE_MIN) * 60_000 < now.getTime()) await this.live.end(s.id);
    }
  }
}
