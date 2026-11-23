import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthUser, CurrentUser, RequirePermissions } from '../common/decorators';
import { PageQuery } from '../common/pagination';
import { ZodPipe } from '../common/zod.pipe';
import { CmsAdminService } from './cms-admin.service';
import { CMS_RESOURCES } from './cms.registry';

const ListQuery = PageQuery.extend({ q: z.string().trim().max(100).optional(), status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional() });
const StatusBody = z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']) });

@ApiTags('admin-cms')
@ApiBearerAuth()
@Controller('admin/cms')
export class CmsAdminController {
  constructor(private readonly cms: CmsAdminService) {}

  @Get()
  @RequirePermissions('cms.read')
  resources() {
    return { data: Object.entries(CMS_RESOURCES).map(([key, d]) => ({ key, label: d.label, hasPublish: d.hasPublish })) };
  }

  @Get(':resource')
  @RequirePermissions('cms.read')
  list(@Param('resource') resource: string, @Query(new ZodPipe(ListQuery)) q: z.infer<typeof ListQuery>) {
    return this.cms.list(resource, q);
  }

  @Get(':resource/:id')
  @RequirePermissions('cms.read')
  get(@Param('resource') resource: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.cms.get(resource, id);
  }

  @Post(':resource')
  @RequirePermissions('cms.write')
  create(@Param('resource') resource: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.cms.create(resource, body, user.id, user.permissions.includes('cms.publish'));
  }

  @Put(':resource/:id')
  @RequirePermissions('cms.write')
  update(@Param('resource') resource: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.cms.update(resource, id, body, user.id, user.permissions.includes('cms.publish'));
  }

  @Post(':resource/:id/status')
  @HttpCode(200)
  @RequirePermissions('cms.publish')
  status(@Param('resource') resource: string, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(StatusBody)) body: z.infer<typeof StatusBody>, @CurrentUser() user: AuthUser) {
    return this.cms.setStatus(resource, id, body.status, user.id);
  }

  @Delete(':resource/:id')
  @HttpCode(204)
  @RequirePermissions('cms.publish')
  remove(@Param('resource') resource: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.cms.remove(resource, id, user.id);
  }
}
