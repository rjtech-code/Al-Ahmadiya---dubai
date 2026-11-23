import { Module } from '@nestjs/common';
import { CmsAdminController } from './cms-admin.controller';
import { CmsAdminService } from './cms-admin.service';
import { CmsPublicController } from './cms-public.controller';

@Module({ controllers: [CmsPublicController, CmsAdminController], providers: [CmsAdminService] })
export class CmsModule {}
