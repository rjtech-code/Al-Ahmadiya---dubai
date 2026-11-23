import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { TeachingController } from './teaching.controller';
import { TeachingService } from './teaching.service';

@Module({ controllers: [TeachingController, FinanceController], providers: [TeachingService, FinanceService] })
export class TeachingModule {}
