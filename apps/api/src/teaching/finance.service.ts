import { Injectable, NotFoundException } from '@nestjs/common';
import { lastMonths } from '../common/dubai-time';
import { PrismaService } from '../prisma/prisma.service';

/** Finance view: what each student has bought, paid and still owes, with receipts. */
@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
    const [all, month, pending, payers] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: 'SUCCEEDED' }, _sum: { amountFils: true }, _count: { _all: true } }),
      this.prisma.payment.aggregate({ where: { status: 'SUCCEEDED', paidAt: { gte: monthStart } }, _sum: { amountFils: true } }),
      this.prisma.enrollment.findMany({ where: { status: 'PENDING_PAYMENT' }, select: { course: { select: { priceFils: true } } } }),
      this.prisma.payment.groupBy({ by: ['userId'], where: { status: 'SUCCEEDED' } }),
    ]);
    const months = lastMonths(6);
    const [monthly, pendingRows, recent] = await Promise.all([
      Promise.all(months.map((m) => this.prisma.payment.aggregate({ where: { status: 'SUCCEEDED', paidAt: { gte: m.start, lt: m.end } }, _sum: { amountFils: true } }))),
      this.prisma.enrollment.findMany({ where: { status: 'PENDING_PAYMENT' }, orderBy: { createdAt: 'asc' }, select: { createdAt: true, user: { select: { id: true, fullName: true, email: true } }, course: { select: { code: true, priceFils: true } } } }),
      this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, amountFils: true, currency: true, status: true, receiptNumber: true, paidAt: true, createdAt: true, purpose: true, user: { select: { id: true, fullName: true } } } }),
    ]);
    const now = Date.now();
    const age = (d: Date) => (now - d.getTime()) / 86_400_000;
    const bucket = (lo: number, hi: number) => pendingRows.filter((e) => age(e.createdAt) >= lo && age(e.createdAt) < hi).reduce((s, e) => s + (e.course.priceFils ?? 0), 0);
    return {
      data: {
        monthly: months.map((m, i) => ({ month: m.key, collectedFils: monthly[i]._sum.amountFils ?? 0 })),
        aging: [{ label: '0-30', fils: bucket(0, 31) }, { label: '31-60', fils: bucket(31, 61) }, { label: '61-90', fils: bucket(61, 91) }, { label: '90+', fils: bucket(91, Infinity) }],
        recent, dueStudents: pendingRows.slice(0, 6).map((e) => ({ ...e.user, course: e.course.code, fils: e.course.priceFils ?? 0, since: e.createdAt })),
        collectedFils: all._sum.amountFils ?? 0, payments: all._count._all, thisMonthFils: month._sum.amountFils ?? 0,
        dueFils: pending.reduce((s, e) => s + (e.course.priceFils ?? 0), 0), dueCount: pending.length, payingStudents: payers.length,
      },
    };
  }

  async students(q: string | undefined, page = 1) {
    const size = 25;
    const text = q?.trim();
    const where = {
      OR: [{ enrollments: { some: {} } }, { payments: { some: {} } }],
      ...(text ? { AND: [{ OR: [{ fullName: { contains: text, mode: 'insensitive' as const } }, { email: { contains: text, mode: 'insensitive' as const } }] }] } : {}),
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * size, take: size,
        select: {
          id: true, fullName: true, email: true,
          enrollments: { select: { status: true, course: { select: { code: true, titleEn: true, priceFils: true } } } },
          payments: { where: { status: 'SUCCEEDED' }, select: { amountFils: true, paidAt: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: users.map((u) => ({
        id: u.id, name: u.fullName, email: u.email,
        courses: u.enrollments.map((e) => ({ code: e.course.code, title: e.course.titleEn, status: e.status })),
        paidFils: u.payments.reduce((s, p) => s + p.amountFils, 0),
        dueFils: u.enrollments.filter((e) => e.status === 'PENDING_PAYMENT').reduce((s, e) => s + (e.course.priceFils ?? 0), 0),
        lastPaidAt: u.payments.map((p) => p.paidAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null,
      })),
      meta: { page, pageSize: size, total, totalPages: Math.max(1, Math.ceil(total / size)) },
    };
  }

  async student(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true, createdAt: true,
        enrollments: { orderBy: { createdAt: 'desc' }, select: { id: true, status: true, activatedAt: true, createdAt: true, course: { select: { code: true, titleEn: true, priceFils: true, currency: true } } } },
        payments: { orderBy: { createdAt: 'desc' }, select: { id: true, purpose: true, description: true, amountFils: true, currency: true, status: true, receiptNumber: true, paidAt: true, createdAt: true, provider: true } },
      },
    });
    if (!u) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Student not found' });
    const paidFils = u.payments.filter((p) => p.status === 'SUCCEEDED').reduce((s, p) => s + p.amountFils, 0);
    const dueFils = u.enrollments.filter((e) => e.status === 'PENDING_PAYMENT').reduce((s, e) => s + (e.course.priceFils ?? 0), 0);
    return { data: { ...u, paidFils, dueFils } };
  }
}
