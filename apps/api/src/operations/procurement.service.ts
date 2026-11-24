import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

type Status = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'RECEIVED';
const NEXT: Record<Status, Status[]> = { SUBMITTED: ['APPROVED', 'REJECTED'], APPROVED: ['ORDERED'], ORDERED: ['RECEIVED'], REJECTED: [], RECEIVED: [] };
const COMMITTED: Status[] = ['APPROVED', 'ORDERED', 'RECEIVED'];

@Injectable()
export class ProcurementService {
  constructor(private readonly prisma: PrismaService) {}

  async list(status?: string) {
    const st = Object.keys(NEXT).includes(status ?? '') ? (status as Status) : undefined;
    return { data: await this.prisma.purchaseRequest.findMany({ where: st ? { status: st } : {}, orderBy: { createdAt: 'desc' }, take: 300, include: { requestedBy: { select: { fullName: true } }, approvedBy: { select: { fullName: true } } } }) };
  }

  async create(user: AuthUser, b: { title: string; category: string; vendor?: string | null; amountAed: number; priority: 'LOW' | 'MEDIUM' | 'HIGH'; notes?: string | null }) {
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseRequest.count({ where: { number: { startsWith: `PR-${year}-` } } });
    return {
      data: await this.prisma.purchaseRequest.create({
        data: { number: `PR-${year}-${String(count + 1).padStart(4, '0')}`, title: b.title, category: b.category, vendor: b.vendor ?? null, amountFils: Math.round(b.amountAed * 100), priority: b.priority, notes: b.notes ?? null, requestedById: user.id },
      }),
    };
  }

  async move(user: AuthUser, id: string, to: Status) {
    const r = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Purchase request not found' });
    if (!NEXT[r.status].includes(to)) throw new ConflictException({ code: 'INVALID_STEP', message: `A ${r.status.toLowerCase()} request cannot be marked ${to.toLowerCase()}.` });
    if ((to === 'APPROVED' || to === 'REJECTED') && r.requestedById === user.id && !user.permissions.includes('dashboard.read')) throw new ConflictException({ code: 'OWN_REQUEST', message: 'Someone else must approve your own request.' });
    const now = new Date();
    return {
      data: await this.prisma.purchaseRequest.update({
        where: { id },
        data: { status: to, ...(to === 'APPROVED' || to === 'REJECTED' ? { approvedById: user.id, decidedAt: now } : {}), ...(to === 'ORDERED' ? { orderedAt: now } : {}), ...(to === 'RECEIVED' ? { receivedAt: now } : {}) },
      }),
    };
  }

  async facilities() {
    return { data: await this.prisma.facility.findMany({ orderBy: { name: 'asc' } }) };
  }

  async saveFacility(b: { name: string; status: 'OPERATIONAL' | 'MAINTENANCE' | 'CLOSED'; note?: string | null }) {
    return { data: await this.prisma.facility.upsert({ where: { name: b.name }, create: { name: b.name, status: b.status, note: b.note ?? null }, update: { status: b.status, note: b.note ?? null } }) };
  }

  async deleteFacility(id: string) {
    await this.prisma.facility.delete({ where: { id } });
  }

  async overview() {
    const [rows, budget, facilities] = await Promise.all([
      this.prisma.purchaseRequest.findMany({ orderBy: { updatedAt: 'desc' }, include: { requestedBy: { select: { fullName: true } } } }),
      this.prisma.siteSetting.findUnique({ where: { key: 'procurement.budgetAed' } }),
      this.prisma.facility.findMany({ orderBy: { name: 'asc' } }),
    ]);
    const year = new Date().getFullYear();
    const thisYear = rows.filter((r) => r.createdAt.getFullYear() === year);
    const usedFils = thisYear.filter((r) => COMMITTED.includes(r.status)).reduce((s, r) => s + r.amountFils, 0);
    const budgetAed = budget?.valueEn ? Number(budget.valueEn.replace(/[^\d.]/g, '')) : NaN;
    return {
      data: {
        totals: { requests: thisYear.length, approved: thisYear.filter((r) => r.status !== 'SUBMITTED' && r.status !== 'REJECTED').length, orders: thisYear.filter((r) => r.status === 'ORDERED' || r.status === 'RECEIVED').length, pending: rows.filter((r) => r.status === 'SUBMITTED').length },
        budget: { usedFils, totalFils: Number.isFinite(budgetAed) && budgetAed > 0 ? Math.round(budgetAed * 100) : null },
        pending: rows.filter((r) => r.status === 'SUBMITTED').sort((a, b) => ['HIGH', 'MEDIUM', 'LOW'].indexOf(a.priority) - ['HIGH', 'MEDIUM', 'LOW'].indexOf(b.priority)).slice(0, 6),
        recent: rows.slice(0, 6).map((r) => ({ id: r.id, number: r.number, title: r.title, status: r.status, updatedAt: r.updatedAt })),
        facilities,
      },
    };
  }
}
