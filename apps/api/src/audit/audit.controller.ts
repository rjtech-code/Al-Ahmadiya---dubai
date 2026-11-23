import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { RequirePermissions } from '../common/decorators';
import { PageQuery, pageArgs, pageMeta } from '../common/pagination';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

const AuditQuery = PageQuery.extend({ action: z.string().max(100).optional(), entityType: z.string().max(100).optional() });

@ApiTags('audit')
@ApiBearerAuth()
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('audit.read')
  async list(@Query(new ZodPipe(AuditQuery)) q: z.infer<typeof AuditQuery>) {
    const where = {
      ...(q.action ? { action: { startsWith: q.action } } : {}),
      ...(q.entityType ? { entityType: q.entityType } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, orderBy: { createdAt: 'desc' }, ...pageArgs(q),
        include: { actor: { select: { id: true, email: true, fullName: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(q, total) };
  }
}
