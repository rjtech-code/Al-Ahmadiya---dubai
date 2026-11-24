import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthUser, CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { OverviewService } from './overview.service';

const LeaveInput = z.object({ type: z.enum(['ANNUAL', 'SICK', 'CASUAL', 'OTHER']), startDate: z.iso.date(), endDate: z.iso.date(), reason: z.string().trim().max(1000).nullable().optional() });
const Decision = z.object({ status: z.enum(['APPROVED', 'REJECTED']), note: z.string().trim().max(500).nullable().optional() });

@ApiTags('role-dashboards')
@ApiBearerAuth()
@Controller()
export class OverviewController {
  constructor(private readonly svc: OverviewService) {}

  @RequirePermissions('admissions.read') @Get('admin/overview/admissions') admissions() { return this.svc.admissions(); }
  @RequirePermissions('hr.manage') @Get('admin/overview/hr') hr() { return this.svc.hr(); }
  @RequirePermissions('hr.manage') @Get('admin/leave') leave(@Query('status') status?: string) { return this.svc.leaveList(status); }
  @RequirePermissions('hr.manage') @Put('admin/leave/:id') decide(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(Decision)) b: z.infer<typeof Decision>, @CurrentUser() u: AuthUser) { return this.svc.decideLeave(u, id, b.status, b.note ?? null); }
  @Get('me/leave') myLeave(@CurrentUser() u: AuthUser) { return this.svc.myLeave(u); }
  @Post('me/leave') request(@Body(new ZodPipe(LeaveInput)) b: z.infer<typeof LeaveInput>, @CurrentUser() u: AuthUser) { return this.svc.requestLeave(u, b); }
  @HttpCode(200) @Post('me/leave/:id/cancel') cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.cancelLeave(u, id); }
  @RequirePermissions('department.lead') @Get('admin/overview/departments') departments(@CurrentUser() u: AuthUser) { return this.svc.departments(u); }
  @RequirePermissions('department.lead') @Get('admin/overview/departments/:id') department(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.department(u, id); }
}
