import { Module } from '@nestjs/common';
import { LmsAdminService } from './lms-admin.service';
import { LmsLearnerService } from './lms-learner.service';
import { LmsController } from './lms.controller';

@Module({ controllers: [LmsController], providers: [LmsAdminService, LmsLearnerService], exports: [LmsAdminService] })
export class LmsModule {}
