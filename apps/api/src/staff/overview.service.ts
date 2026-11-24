import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../common/decorators';
import { dubaiDate, lastMonths, minutesBetween } from '../common/dubai-time';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 86_400_000;

/** Role dashboards (admissions, HR, head of department) and staff leave. All figures are live database counts. */
@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  // ── Admissions ──
  async admissions() {
    const months = lastMonths(6);
    const [byStatus, monthly, docsToVerify, recent] = await Promise.all([
      this.prisma.application.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      Promise.all(months.map((m) => this.prisma.application.count({ where: { deletedAt: null, submittedAt: { gte: m.start, lt: m.end } } }))),
      this.prisma.applicationDocument.count({ where: { status: 'UPLOADED', application: { status: { not: 'DRAFT' } } } }),
      this.prisma.application.findMany({
        where: { deletedAt: null, status: { not: 'DRAFT' } }, orderBy: { submittedAt: 'desc' }, take: 8,
        select: { id: true, reference: true, status: true, submittedAt: true, applicant: { select: { fullName: true } }, program: { select: { nameEn: true } } },
      }),
    ]);
    const c = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Record<string, number>;
    const n = (k: string) => c[k] ?? 0;
    const submitted = byStatus.filter((s) => s.status !== 'DRAFT').reduce((a, s) => a + s._count._all, 0);
    return {
      data: {
        totals: { submitted, inReview: n('SUBMITTED') + n('UNDER_REVIEW') + n('DOCUMENTS_PENDING') + n('RETURNED_FOR_CORRECTION'), approved: n('APPROVED'), rejected: n('REJECTED'), drafts: n('DRAFT'), docsToVerify },
        pipeline: [
          { stage: 'Submitted', count: submitted },
          { stage: 'Under review', count: n('UNDER_REVIEW') + n('DOCUMENTS_PENDING') + n('RETURNED_FOR_CORRECTION') + n('APPROVED') + n('REJECTED') },
          { stage: 'Decision made', count: n('APPROVED') + n('REJECTED') },
          { stage: 'Approved', count: n('APPROVED') },
        ],
        monthly: months.map((m, i) => ({ month: m.key, count: monthly[i] })),
        recent,
      },
    };
  }

  // ── HR ──
  async hr() {
    const today = new Date(`${dubaiDate(new Date())}T00:00:00Z`);
    const since30 = new Date(Date.now() - 30 * DAY);
    const staffWhere = { deletedAt: null, roles: { some: { role: { permissions: { some: {} } } } } };
    const [staff, active, newStaff, roles, signedToday, onLeave, pending, depts] = await Promise.all([
      this.prisma.user.count({ where: staffWhere }),
      this.prisma.user.count({ where: { ...staffWhere, isActive: true } }),
      this.prisma.user.count({ where: { ...staffWhere, createdAt: { gte: since30 } } }),
      this.prisma.role.findMany({ where: { permissions: { some: {} } }, select: { nameEn: true, _count: { select: { users: true } } }, orderBy: { nameEn: 'asc' } }),
      this.prisma.staffLogin.findMany({ where: { success: true, createdAt: { gte: new Date(today.getTime() - 4 * 3600_000) } }, distinct: ['userId'], select: { userId: true } }),
      this.prisma.leaveRequest.findMany({ where: { status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } }, select: { id: true, type: true, endDate: true, user: { select: { fullName: true } } } }),
      this.prisma.leaveRequest.findMany({ where: { status: 'PENDING' }, orderBy: { startDate: 'asc' }, take: 10, select: { id: true, type: true, startDate: true, endDate: true, reason: true, createdAt: true, user: { select: { fullName: true, email: true } } } }),
      this.prisma.department.findMany({ where: { deletedAt: null }, orderBy: { nameEn: 'asc' }, select: { id: true, nameEn: true, _count: { select: { staff: true } } } }),
    ]);
    return {
      data: {
        totals: { staff, active, inactive: staff - active, newStaff, signedInToday: signedToday.length, onLeaveToday: onLeave.length, pendingLeave: pending.length },
        byRole: roles.map((r) => ({ role: r.nameEn, count: r._count.users })).filter((r) => r.count > 0),
        byDepartment: depts.map((d) => ({ id: d.id, name: d.nameEn, count: d._count.staff })),
        onLeave, pending,
      },
    };
  }

  // ── Leave ──
  private assertStaff(user: AuthUser) {
    if (!user.permissions.length) throw new ForbiddenException({ code: 'STAFF_ONLY', message: 'Only staff can request leave.' });
  }

  async myLeave(user: AuthUser) {
    this.assertStaff(user);
    return { data: await this.prisma.leaveRequest.findMany({ where: { userId: user.id }, orderBy: { startDate: 'desc' }, take: 50 }) };
  }

  async requestLeave(user: AuthUser, b: { type: 'ANNUAL' | 'SICK' | 'CASUAL' | 'OTHER'; startDate: string; endDate: string; reason?: string | null }) {
    this.assertStaff(user);
    if (b.endDate < b.startDate) throw new BadRequestException({ code: 'INVALID_DATES', message: 'The end date must be on or after the start date.' });
    const overlap = await this.prisma.leaveRequest.count({ where: { userId: user.id, status: { in: ['PENDING', 'APPROVED'] }, startDate: { lte: new Date(b.endDate) }, endDate: { gte: new Date(b.startDate) } } });
    if (overlap) throw new ConflictException({ code: 'OVERLAP', message: 'You already have leave requested for these dates.' });
    const r = await this.prisma.leaveRequest.create({ data: { userId: user.id, type: b.type, startDate: new Date(b.startDate), endDate: new Date(b.endDate), reason: b.reason ?? null } });
    const hr = await this.prisma.user.findMany({ where: { isActive: true, deletedAt: null, roles: { some: { role: { permissions: { some: { permission: { key: 'hr.manage' } } } } } } }, select: { id: true } });
    await this.notifications.notify(hr.map((h) => h.id).filter((id) => id !== user.id), { type: 'leave', titleEn: `Leave request: ${b.type.toLowerCase()} leave`, titleAr: 'طلب إجازة', bodyEn: `${b.startDate} → ${b.endDate}`, link: '/admin/hr' });
    return { data: r };
  }

  async cancelLeave(user: AuthUser, id: string) {
    const r = await this.prisma.leaveRequest.findFirst({ where: { id, userId: user.id } });
    if (!r) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Leave request not found' });
    if (r.status !== 'PENDING') throw new ConflictException({ code: 'NOT_PENDING', message: 'Only pending requests can be cancelled.' });
    return { data: await this.prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } }) };
  }

  async leaveList(status?: string) {
    const st = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status ?? '') ? (status as 'PENDING') : undefined;
    return { data: await this.prisma.leaveRequest.findMany({ where: st ? { status: st } : {}, orderBy: { startDate: 'desc' }, take: 200, include: { user: { select: { fullName: true, email: true } }, decidedBy: { select: { fullName: true } } } }) };
  }

  async decideLeave(actor: AuthUser, id: string, status: 'APPROVED' | 'REJECTED', note: string | null) {
    const r = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Leave request not found' });
    if (r.status !== 'PENDING') throw new ConflictException({ code: 'NOT_PENDING', message: 'This request has already been decided.' });
    if (r.userId === actor.id) throw new ForbiddenException({ code: 'OWN_REQUEST', message: 'You cannot approve your own leave.' });
    const u = await this.prisma.leaveRequest.update({ where: { id }, data: { status, note, decidedById: actor.id, decidedAt: new Date() } });
    await this.notifications.notify([r.userId], { type: 'leave', titleEn: `Leave ${status === 'APPROVED' ? 'approved' : 'rejected'}`, titleAr: status === 'APPROVED' ? 'تمت الموافقة على الإجازة' : 'رُفض طلب الإجازة', bodyEn: note ?? undefined, link: '/admin/leave' });
    return { data: u };
  }

  // ── Head of department ──
  async departments(user: AuthUser) {
    const own = await this.prisma.user.findUnique({ where: { id: user.id }, select: { departmentId: true } });
    const all = user.permissions.includes('academics.manage');
    const rows = await this.prisma.department.findMany({ where: { deletedAt: null, ...(all ? {} : { id: own?.departmentId ?? '00000000-0000-0000-0000-000000000000' }) }, orderBy: { nameEn: 'asc' }, select: { id: true, nameEn: true } });
    return { data: rows, meta: { own: own?.departmentId ?? null } };
  }

  async department(user: AuthUser, departmentId: string) {
    const own = await this.prisma.user.findUnique({ where: { id: user.id }, select: { departmentId: true } });
    if (!user.permissions.includes('academics.manage') && own?.departmentId !== departmentId) throw new ForbiddenException({ code: 'NOT_YOUR_DEPARTMENT', message: 'You can only view your own department.' });
    const dept = await this.prisma.department.findFirst({ where: { id: departmentId, deletedAt: null }, select: { id: true, nameEn: true, nameAr: true, college: { select: { nameEn: true } } } });
    if (!dept) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Department not found' });
    const courses = await this.prisma.course.findMany({
      where: { departmentId, deletedAt: null }, orderBy: { code: 'asc' },
      select: { id: true, code: true, titleEn: true, publishStatus: true, onlineEnabled: true, teacher: { select: { id: true, fullName: true } }, liveSlots: true, _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } } },
    });
    const ids = courses.map((c) => c.id);
    const [enrolled, results, ended, staff] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { courseId: { in: ids }, status: 'ACTIVE' }, select: { userId: true, courseId: true, user: { select: { fullName: true, email: true } } } }),
      this.prisma.courseResult.findMany({ where: { courseId: { in: ids }, publishedAt: { not: null } }, select: { userId: true, courseId: true, marks: true, grade: true, gradePoints: true } }),
      this.prisma.liveSession.findMany({ where: { courseId: { in: ids }, status: 'ENDED' }, select: { courseId: true, attendance: { select: { userId: true } } } }),
      this.prisma.user.findMany({ where: { departmentId, deletedAt: null }, select: { id: true, fullName: true } }),
    ]);
    // Faculty = teachers of the department's courses plus staff assigned to the department.
    const faculty = new Map<string, string>();
    for (const c of courses) if (c.teacher) faculty.set(c.teacher.id, c.teacher.fullName);
    for (const s of staff) faculty.set(s.id, s.fullName);
    const workload = [...faculty].map(([id, name]) => {
      const mine = courses.filter((c) => c.teacher?.id === id);
      const weeklyMinutes = mine.reduce((s, c) => s + c.liveSlots.reduce((a, sl) => a + minutesBetween(sl.startTime, sl.endTime), 0), 0);
      return { id, name, courses: mine.map((c) => c.code), students: mine.reduce((s, c) => s + c._count.enrollments, 0), weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10 };
    }).sort((a, b) => b.courses.length - a.courses.length);

    // Average result per course (published marks only).
    const perCourse = courses.map((c) => {
      const r = results.filter((x) => x.courseId === c.id && x.marks !== null);
      return { code: c.code, students: c._count.enrollments, avgMarks: r.length ? Math.round(r.reduce((s, x) => s + (x.marks ?? 0), 0) / r.length) : null };
    });
    const withMarks = results.filter((r) => r.marks !== null);

    // At-risk: attendance below 75 % in a course (at least 2 classes held) or a failing published result.
    const risk = new Map<string, { name: string; email: string; reasons: string[] }>();
    const flag = (userId: string, reason: string) => {
      const e = enrolled.find((x) => x.userId === userId);
      if (!e) return;
      const cur = risk.get(userId) ?? { name: e.user.fullName, email: e.user.email, reasons: [] };
      cur.reasons.push(reason); risk.set(userId, cur);
    };
    for (const c of courses) {
      const held = ended.filter((s) => s.courseId === c.id);
      if (held.length < 2) continue;
      for (const e of enrolled.filter((x) => x.courseId === c.id)) {
        const attended = held.filter((s) => s.attendance.some((a) => a.userId === e.userId)).length;
        if (attended / held.length < 0.75) flag(e.userId, `${c.code}: attendance ${Math.round((attended / held.length) * 100)}%`);
      }
    }
    for (const r of results) if (r.gradePoints === 0) flag(r.userId, `${courses.find((c) => c.id === r.courseId)?.code}: grade ${r.grade}`);

    // Timetable conflicts: the same teacher in two weekly slots that overlap.
    const conflicts: { teacher: string; day: number; a: string; b: string; time: string }[] = [];
    const slots = courses.flatMap((c) => c.liveSlots.map((s) => ({ ...s, code: c.code, teacher: c.teacher })));
    for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
      const x = slots[i], y = slots[j];
      if (x.teacher && y.teacher?.id === x.teacher.id && x.weekday === y.weekday && x.startTime < y.endTime && y.startTime < x.endTime) {
        conflicts.push({ teacher: x.teacher.fullName, day: x.weekday, a: x.code, b: y.code, time: `${x.startTime > y.startTime ? x.startTime : y.startTime}` });
      }
    }
    return {
      data: {
        department: dept,
        totals: { faculty: faculty.size, students: new Set(enrolled.map((e) => e.userId)).size, courses: courses.length, avgMarks: withMarks.length ? Math.round(withMarks.reduce((s, r) => s + (r.marks ?? 0), 0) / withMarks.length) : null },
        workload, perCourse, atRisk: [...risk.entries()].map(([id, v]) => ({ id, ...v })).slice(0, 20), atRiskCount: risk.size, conflicts,
        unassigned: courses.filter((c) => !c.teacher && c.onlineEnabled).map((c) => ({ id: c.id, code: c.code, titleEn: c.titleEn })),
        months: lastMonths(1).map((m) => m.key),
      },
    };
  }
}
