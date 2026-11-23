import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('admin/finance')
export class FinanceController {
  constructor(private readonly svc: FinanceService) {}

  @RequirePermissions('payments.read') @Get('summary') summary() { return this.svc.summary(); }
  @RequirePermissions('payments.read') @Get('students') students(@Query('q') q?: string, @Query('page') page?: string) { return this.svc.students(q, Math.max(1, Number(page) || 1)); }
  @RequirePermissions('payments.read') @Get('students/:id') student(@Param('id', ParseUUIDPipe) id: string) { return this.svc.student(id); }
}
