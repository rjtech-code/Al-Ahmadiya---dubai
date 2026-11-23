import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { RequirePermissions } from '../common/decorators';
import { PageQuery, pageArgs, pageMeta } from '../common/pagination';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

const Q = PageQuery.extend({ q: z.string().trim().max(120).optional(), result: z.enum(['success', 'failed']).optional() });

@ApiTags('admin-security')
@ApiBearerAuth()
@Controller('admin/staff-logins')
export class StaffLoginsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Staff-only sign-in history (applicants/students are never recorded). Retained for 12 months. */
  @Get()
  @RequirePermissions('security.read')
  async list(@Query(new ZodPipe(Q)) q: z.infer<typeof Q>) {
    const where = {
      ...(q.q ? { email: { contains: q.q, mode: 'insensitive' as const } } : {}),
      ...(q.result ? { success: q.result === 'success' } : {}),
    };
    const [rows, total, last30] = await Promise.all([
      this.prisma.staffLogin.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q), include: { user: { select: { fullName: true, roles: { select: { role: { select: { nameEn: true } } } } } } } }),
      this.prisma.staffLogin.count({ where }),
      this.prisma.staffLogin.groupBy({ by: ['success'], _count: { _all: true }, where: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
    ]);
    return { data: rows, meta: { ...pageMeta(q, total), last30Days: Object.fromEntries(last30.map((g) => [g.success ? 'success' : 'failed', g._count._all])) } };
  }
}
