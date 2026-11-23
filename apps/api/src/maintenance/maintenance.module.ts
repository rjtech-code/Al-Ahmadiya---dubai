import { Module } from '@nestjs/common';
import { RetentionService } from './retention.service';
import { StaffLoginsController } from './staff-logins.controller';

@Module({ controllers: [StaffLoginsController], providers: [RetentionService] })
export class MaintenanceModule {}
