import { Module } from '@nestjs/common';
import { DemoImportController } from './demo-import.controller';

@Module({ controllers: [DemoImportController] })
export class DemoImportModule {}
