import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, RequirePermissions } from '../common/decorators';
import { TeachingService } from './teaching.service';

const AssignmentInput = z.object({
  titleEn: z.string().trim().min(2).max(200), titleAr: z.string().trim().min(2).max(200),
  instructionsEn: z.string().trim().max(10_000).nullable().optional(), instructionsAr: z.string().trim().max(10_000).nullable().optional(),
  dueAt: z.coerce.date(), maxMarks: z.coerce.number().int().min(1).max(1000).default(10), allowResubmit: z.boolean().default(true),
});
const GradeInput = z.object({ marks: z.coerce.number().int().min(0).max(1000), feedback: z.string().trim().max(5000).nullable().optional() });
const ResultsInput = z.object({ term: z.string().trim().min(2).max(40), publish: z.boolean().default(false), entries: z.array(z.object({ userId: z.uuid(), marks: z.coerce.number().int().min(0).max(100) })).max(1000) });

@ApiTags('teaching')
@ApiBearerAuth()
@Controller('teach')
export class TeachingController {
  constructor(private readonly svc: TeachingService) {}

  @RequirePermissions('teach.own') @Get('overview') overview(@CurrentUser() u: AuthUser) { return this.svc.overview(u); }
  @RequirePermissions('teach.own') @Get('courses/:id/students') students(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.students(u, id); }
  @RequirePermissions('teach.own') @Get('courses/:id/students/:userId') student(@Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string, @CurrentUser() u: AuthUser) { return this.svc.student(u, id, userId); }

  @RequirePermissions('teach.own') @Get('courses/:id/assignments') assignments(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.assignments(u, id); }
  @RequirePermissions('teach.own') @Post('courses/:id/assignments') createAssignment(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(AssignmentInput)) b: z.infer<typeof AssignmentInput>, @CurrentUser() u: AuthUser) { return this.svc.createAssignment(u, id, { ...b, instructionsEn: b.instructionsEn ?? null, instructionsAr: b.instructionsAr ?? null }); }
  @RequirePermissions('teach.own') @HttpCode(204) @Delete('assignments/:id') deleteAssignment(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.deleteAssignment(u, id); }
  @RequirePermissions('teach.own') @Get('assignments/:id/submissions') submissions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.submissions(u, id); }
  @RequirePermissions('teach.own') @Put('submissions/:id/grade') grade(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(GradeInput)) b: z.infer<typeof GradeInput>, @CurrentUser() u: AuthUser) { return this.svc.grade(u, id, b.marks, b.feedback ?? null); }
  @RequirePermissions('teach.own') @Get('courses/:id/results') results(@Param('id', ParseUUIDPipe) id: string, @Query('term') term: string, @CurrentUser() u: AuthUser) { return this.svc.results(u, id, term || 'Term 1'); }
  @RequirePermissions('teach.own') @Put('courses/:id/results') saveResults(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(ResultsInput)) b: z.infer<typeof ResultsInput>, @CurrentUser() u: AuthUser) { return this.svc.saveResults(u, id, b.term, b.entries, b.publish); }
}
