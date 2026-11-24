import { Module } from '@nestjs/common';
import { AcademicsModule } from './academics/academics.module';
import { AdmissionsModule } from './admissions/admissions.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CmsModule } from './cms/cms.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EngagementModule } from './engagement/engagement.module';
import { HealthModule } from './health/health.module';
import { LmsModule } from './lms/lms.module';
import { LiveModule } from './live/live.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { StorageModule } from './storage/storage.module';
import { SystemModule } from './system/system.module';
import { TeachingModule } from './teaching/teaching.module';
import { PortalModule } from './portal/portal.module';
import { StaffModule } from './staff/staff.module';
import { UsersModule } from './users/users.module';

/**
 * Single-process deployment composition.
 * Exactly 20 domain/infrastructure modules are mounted in one Nest application;
 * no extra Render service is required for the Core API.
 */
@Module({
  imports: [
    SystemModule,
    PrismaModule,
    StorageModule,
    AuditModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    SettingsModule,
    CmsModule,
    EngagementModule,
    AdmissionsModule,
    PaymentsModule,
    LmsModule,
    LiveModule,
    TeachingModule, PortalModule, StaffModule,
    AcademicsModule,
    MediaModule,
    MaintenanceModule,
    DashboardModule,
    HealthModule,
  ],
})
export class AppModule {}
