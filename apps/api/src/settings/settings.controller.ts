import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';

const SettingBody = z.object({
  valueEn: z.string().trim().max(5000).nullable(),
  valueAr: z.string().trim().max(5000).nullable(),
  confirmation: z.enum(['CONFIRMED', 'CLIENT_CONFIRMATION_REQUIRED']),
  sourceUrl: z.url().max(1000).nullish(),
  note: z.string().trim().max(1000).nullish(),
});

@ApiTags('admin-settings')
@ApiBearerAuth()
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('cms.read')
  async list() {
    return { data: await this.prisma.siteSetting.findMany({ orderBy: { key: 'asc' } }) };
  }

  @Put(':key')
  @RequirePermissions('settings.write')
  async update(@Param('key') key: string, @Body(new ZodPipe(SettingBody)) body: z.infer<typeof SettingBody>, @CurrentUser() actor: AuthUser) {
    const k = z.string().regex(/^[a-z][a-zA-Z0-9_.-]{1,80}$/).parse(key);
    const before = await this.prisma.siteSetting.findUnique({ where: { key: k } });
    const row = await this.prisma.siteSetting.upsert({ where: { key: k }, create: { key: k, ...body }, update: body });
    await this.audit.log({ actorId: actor.id, action: 'settings.update', entityType: 'SiteSetting', entityId: k, metadata: { before: before ? { en: before.valueEn, ar: before.valueAr, confirmation: before.confirmation } : null, after: body } });
    return { data: row };
  }
}
