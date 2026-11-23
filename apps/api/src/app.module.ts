import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AcademicsModule } from './academics/academics.module';
import { LiveModule } from './live/live.module';
import { LmsModule } from './lms/lms.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RevalidateInterceptor } from './common/revalidate.interceptor';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdmissionsModule } from './admissions/admissions.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CmsModule } from './cms/cms.module';
import { env } from './config/env';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { DashboardController } from './dashboard/dashboard.controller';
import { EngagementModule } from './engagement/engagement.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
      // Automated test suites exercise auth endpoints far faster than real users.
      skipIf: (ctx) => env().NODE_ENV === 'test' || ctx.getType() !== 'http',
    }),
    ScheduleModule.forRoot(),
    PrismaModule, StorageModule, AuditModule, NotificationsModule, AuthModule, UsersModule, SettingsModule, CmsModule, EngagementModule, AdmissionsModule,
    PaymentsModule, LmsModule, LiveModule, AcademicsModule, MediaModule, MaintenanceModule,
  ],
  controllers: [HealthController, DashboardController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: RevalidateInterceptor },
  ],
})
export class AppModule {}
