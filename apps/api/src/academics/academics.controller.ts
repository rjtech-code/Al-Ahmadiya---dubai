import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public, RequirePermissions } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { AcademicsService, CheckInput, CurriculumInput, RulesInput } from './academics.service';

@ApiTags('academics')
@Controller()
export class AcademicsController {
  constructor(private readonly svc: AcademicsService) {}

  @ApiBearerAuth() @RequirePermissions('academics.manage') @Get('admin/academics/programs')
  programs() { return this.svc.programs(); }

  @ApiBearerAuth() @RequirePermissions('academics.manage') @Get('admin/academics/programs/:id')
  program(@Param('id', ParseUUIDPipe) id: string) { return this.svc.program(id); }

  @ApiBearerAuth() @RequirePermissions('academics.manage') @Put('admin/academics/programs/:id/curriculum')
  curriculum(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(CurriculumInput)) b: z.infer<typeof CurriculumInput>, @CurrentUser() u: AuthUser) { return this.svc.setCurriculum(id, b, u); }

  @ApiBearerAuth() @RequirePermissions('academics.manage') @Put('admin/academics/programs/:id/eligibility')
  rules(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(RulesInput)) b: z.infer<typeof RulesInput>, @CurrentUser() u: AuthUser) { return this.svc.setRules(id, b, u); }

  @ApiBearerAuth() @RequirePermissions('academics.manage') @HttpCode(200) @Post('admin/academics/eligibility-check')
  adminCheck(@Body(new ZodPipe(CheckInput)) b: z.infer<typeof CheckInput>) { return this.svc.checkAll(b, 'admin'); }

  /** Public: "Which programmes can I apply for?" */
  @Public() @Throttle({ default: { limit: 20, ttl: 60_000 } }) @HttpCode(200) @Post('public/admissions/eligibility/all')
  publicCheck(@Body(new ZodPipe(CheckInput)) b: z.infer<typeof CheckInput>) { return this.svc.checkAll(b, 'public'); }

  @ApiBearerAuth() @Get('me/overview')
  overview(@CurrentUser() u: AuthUser) { return this.svc.overview(u); }
}
