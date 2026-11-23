import { Module } from '@nestjs/common';
import { AdmissionsModule } from '../admissions/admissions.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({ imports: [AdmissionsModule], controllers: [PaymentsController], providers: [PaymentsService] })
export class PaymentsModule {}
