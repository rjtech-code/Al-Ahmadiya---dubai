import { Module } from '@nestjs/common';
import { LiveModule } from '../live/live.module';
import { CourseBuilderService } from './builder.service';
import { LmsAdminService } from './lms-admin.service';
import { LmsLearnerService } from './lms-learner.service';
import { LmsController } from './lms.controller';

@Module({ imports: [LiveModule], controllers: [LmsController], providers: [LmsAdminService, LmsLearnerService, CourseBuilderService], exports: [LmsAdminService] })
export class LmsModule {}
