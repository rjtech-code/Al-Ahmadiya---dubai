import { Module } from '@nestjs/common';
import { LibraryService } from './library.service';
import { OperationsController } from './operations.controller';
import { ProcurementService } from './procurement.service';
import { RecordsService } from './records.service';

@Module({ controllers: [OperationsController], providers: [LibraryService, ProcurementService, RecordsService] })
export class OperationsModule {}
