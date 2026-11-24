import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../common/decorators';
import { lastMonths } from '../common/dubai-time';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 86_400_000;
const LOAN_DAYS = 14;
type ItemInput = { type: 'BOOK' | 'EBOOK' | 'JOURNAL' | 'DATABASE' | 'PAPER'; title: string; author?: string | null; isbn?: string | null; subject?: string | null; year?: number | null; url?: string | null; copies: number; isPublic: boolean };

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  private withAvailability<T extends { copies: number; type: string; loans: { id: string }[] }>(i: T) {
    const { loans, ...rest } = i;
    return { ...rest, onLoan: loans.length, available: i.type === 'BOOK' ? Math.max(0, i.copies - loans.length) : null };
  }

  async catalogue(q: string | undefined, type: string | undefined, publicOnly: boolean) {
    const text = q?.trim();
    const rows = await this.prisma.libraryItem.findMany({
      where: {
        ...(publicOnly ? { isPublic: true } : {}),
        ...(type && ['BOOK', 'EBOOK', 'JOURNAL', 'DATABASE', 'PAPER'].includes(type) ? { type: type as 'BOOK' } : {}),
        ...(text ? { OR: [{ title: { contains: text, mode: 'insensitive' as const } }, { author: { contains: text, mode: 'insensitive' as const } }, { subject: { contains: text, mode: 'insensitive' as const } }, { isbn: { contains: text } }] } : {}),
      },
      orderBy: { title: 'asc' }, take: 200, include: { loans: { where: { returnedAt: null }, select: { id: true } } },
    });
    return { data: rows.map((r) => this.withAvailability(r)) };
  }

  async createItem(b: ItemInput) {
    if (b.type !== 'BOOK' && !b.url) throw new BadRequestException({ code: 'URL_REQUIRED', message: 'Digital resources need a link.' });
    return { data: await this.prisma.libraryItem.create({ data: { ...b, copies: b.type === 'BOOK' ? b.copies : 0 } }) };
  }

  async updateItem(id: string, b: ItemInput) {
    return { data: await this.prisma.libraryItem.update({ where: { id }, data: { ...b, copies: b.type === 'BOOK' ? b.copies : 0 } }) };
  }

  async deleteItem(id: string) {
    if (await this.prisma.libraryLoan.count({ where: { itemId: id } })) throw new ConflictException({ code: 'HAS_LOANS', message: 'This item has loan history and cannot be deleted. Mark it as not public instead.' });
    await this.prisma.libraryItem.delete({ where: { id } });
  }

  async issue(itemId: string, email: string, days = LOAN_DAYS) {
    const [item, user] = await Promise.all([
      this.prisma.libraryItem.findUnique({ where: { id: itemId }, include: { loans: { where: { returnedAt: null }, select: { id: true } } } }),
      this.prisma.user.findFirst({ where: { email: email.toLowerCase(), deletedAt: null } }),
    ]);
    if (!item) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Item not found' });
    if (item.type !== 'BOOK') throw new BadRequestException({ code: 'DIGITAL', message: 'Digital resources are not issued.' });
    if (!user) throw new NotFoundException({ code: 'NO_USER', message: 'No account with that email.' });
    if (item.loans.length >= item.copies) throw new ConflictException({ code: 'UNAVAILABLE', message: 'All copies are on loan.' });
    const loan = await this.prisma.libraryLoan.create({ data: { itemId, userId: user.id, dueAt: new Date(Date.now() + days * DAY) } });
    await this.notifications.notify([user.id], { type: 'library', titleEn: `Book issued: ${item.title}`, titleAr: `تمت إعارة كتاب: ${item.title}`, bodyEn: `Due ${loan.dueAt.toISOString().slice(0, 10)}`, link: '/portal/library' });
    return { data: loan };
  }

  async returnLoan(id: string) {
    const l = await this.prisma.libraryLoan.findUnique({ where: { id } });
    if (!l) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Loan not found' });
    if (l.returnedAt) throw new ConflictException({ code: 'RETURNED', message: 'Already returned.' });
    return { data: await this.prisma.libraryLoan.update({ where: { id }, data: { returnedAt: new Date() } }) };
  }

  async renew(id: string, user?: AuthUser) {
    const l = await this.prisma.libraryLoan.findUnique({ where: { id } });
    if (!l || (user && l.userId !== user.id)) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Loan not found' });
    if (l.returnedAt) throw new ConflictException({ code: 'RETURNED', message: 'Already returned.' });
    if (l.renewals >= 2) throw new ConflictException({ code: 'RENEW_LIMIT', message: 'This loan has already been renewed twice.' });
    return { data: await this.prisma.libraryLoan.update({ where: { id }, data: { dueAt: new Date(Math.max(l.dueAt.getTime(), Date.now()) + LOAN_DAYS * DAY), renewals: { increment: 1 } } }) };
  }

  async loans(open = true) {
    return { data: await this.prisma.libraryLoan.findMany({ where: open ? { returnedAt: null } : {}, orderBy: { dueAt: 'asc' }, take: 300, include: { item: { select: { title: true, author: true } }, user: { select: { fullName: true, email: true } } } }) };
  }

  async mine(user: AuthUser) {
    return { data: await this.prisma.libraryLoan.findMany({ where: { userId: user.id }, orderBy: [{ returnedAt: 'asc' }, { dueAt: 'asc' }], take: 50, include: { item: { select: { title: true, author: true } } } }) };
  }

  async overview() {
    const now = new Date();
    const months = lastMonths(6);
    const [byType, copies, open, monthly, digital] = await Promise.all([
      this.prisma.libraryItem.groupBy({ by: ['type'], _count: { _all: true } }),
      this.prisma.libraryItem.aggregate({ where: { type: 'BOOK' }, _sum: { copies: true } }),
      this.prisma.libraryLoan.findMany({ where: { returnedAt: null }, orderBy: { dueAt: 'asc' }, include: { item: { select: { title: true } }, user: { select: { id: true, fullName: true } } } }),
      Promise.all(months.map((m) => this.prisma.libraryLoan.count({ where: { issuedAt: { gte: m.start, lt: m.end } } }))),
      this.prisma.libraryItem.findMany({ where: { type: { not: 'BOOK' } }, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, type: true, title: true, url: true } }),
    ]);
    const count = (t: string) => byType.find((b) => b.type === t)?._count._all ?? 0;
    const overdue = open.filter((l) => l.dueAt < now);
    const borrowers = [...new Map(open.map((l) => [l.user.id, { name: l.user.fullName, items: open.filter((x) => x.user.id === l.user.id).length, nextDue: l.dueAt }])).values()];
    return {
      data: {
        totals: { titles: count('BOOK'), copies: copies._sum.copies ?? 0, eResources: count('EBOOK') + count('JOURNAL') + count('DATABASE') + count('PAPER'), activeBorrowers: borrowers.length, onLoan: open.length, overdue: overdue.length, thisMonth: monthly.at(-1) ?? 0 },
        byType: { ebooks: count('EBOOK'), journals: count('JOURNAL'), databases: count('DATABASE'), papers: count('PAPER') },
        monthly: months.map((m, i) => ({ month: m.key, count: monthly[i] })),
        dueSoon: open.slice(0, 8).map((l) => ({ id: l.id, title: l.item.title, borrower: l.user.fullName, dueAt: l.dueAt, overdue: l.dueAt < now })),
        borrowers: borrowers.slice(0, 6), digital,
      },
    };
  }
}
