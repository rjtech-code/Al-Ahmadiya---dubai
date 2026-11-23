import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthUser, CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { env } from '../config/env';
import { diskUpload } from '../lms/uploads';
import { LiveService, ScheduleInput } from './live.service';

@ApiTags('live')
@ApiBearerAuth()
@Controller()
export class LiveController {
  constructor(private readonly svc: LiveService) {}

  @RequirePermissions('live.host') @Get('admin/live/config') config() { return this.svc.config(); }
  @RequirePermissions('live.host') @Get('admin/live/sessions') list(@CurrentUser() u: AuthUser, @Query('courseId') courseId?: string) { return this.svc.list(u, courseId); }
  @RequirePermissions('live.host') @Get('admin/live/sessions/:id') async get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return { data: await this.svc.owned(id, u), meta: this.svc.config().data }; }
  @RequirePermissions('live.host') @Get('admin/live/sessions/:id/attendance') attendance(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.attendance(id, u); }
  @RequirePermissions('live.host') @Post('admin/live/courses/:courseId/now') goLive(@Param('courseId', ParseUUIDPipe) courseId: string, @CurrentUser() u: AuthUser) { return this.svc.goLiveNow(courseId, u); }
  @RequirePermissions('live.host') @Post('admin/live/sessions') schedule(@Body(new ZodPipe(ScheduleInput)) b: z.infer<typeof ScheduleInput>, @CurrentUser() u: AuthUser) { return this.svc.schedule(b, u); }
  @RequirePermissions('live.host') @HttpCode(200) @Post('admin/live/sessions/:id/start') start(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.start(id, u); }
  @RequirePermissions('live.host') @HttpCode(200) @Post('admin/live/sessions/:id/end') end(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.end(id, u); }
  @RequirePermissions('live.host') @HttpCode(200) @Post('admin/live/sessions/:id/cancel') cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.cancel(id, u); }

  @RequirePermissions('live.host') @Post('admin/live/sessions/:id/recording')
  @UseInterceptors(FileInterceptor('video', diskUpload(env().MAX_VIDEO_MB)))
  recording(@Param('id', ParseUUIDPipe) id: string, @Body() b: unknown, @UploadedFile() f: Express.Multer.File | undefined, @CurrentUser() u: AuthUser) { return this.svc.uploadRecording(id, b, f, u); }

  @RequirePermissions('live.host') @HttpCode(200) @Post('admin/live/sessions/:id/publish')
  publish(@Param('id', ParseUUIDPipe) id: string, @Body() b: unknown, @CurrentUser() u: AuthUser) { return this.svc.publishDraft(id, b, u); }

  @RequirePermissions('live.host') @Get('admin/live/sessions/:id/recording-url') recordingUrl(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.recordingUrl(id, u); }

  @Get('me/live') mine(@CurrentUser() u: AuthUser) { return this.svc.mine(u); }
  @Get('me/live/:id/join') join(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.join(u, id); }
}
