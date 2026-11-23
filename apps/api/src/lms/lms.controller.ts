import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthUser, CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { env } from '../config/env';
import { CourseBuilderService } from './builder.service';
import { LmsAdminService } from './lms-admin.service';
import { LmsLearnerService } from './lms-learner.service';
import * as S from './lms.schemas';
import { diskUpload } from './uploads';

@ApiTags('lms')
@ApiBearerAuth()
@Controller()
export class LmsController {
  constructor(private readonly admin: LmsAdminService, private readonly learner: LmsLearnerService, private readonly builder: CourseBuilderService) {}

  // ── Admin: step-by-step course builder ──
  @RequirePermissions('lms.manage') @Get('admin/lms/options')
  options() { return this.builder.options(); }

  @RequirePermissions('lms.manage') @Post('admin/lms/courses')
  create(@Body(new ZodPipe(S.CourseDetails)) b: z.infer<typeof S.CourseDetails>, @CurrentUser() u: AuthUser) { return this.builder.create(b, u); }

  @RequirePermissions('lms.manage') @Put('admin/lms/courses/:id/details')
  details(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.CourseDetails)) b: z.infer<typeof S.CourseDetails>) { return this.builder.update(id, b); }

  @RequirePermissions('lms.manage') @Post('admin/lms/courses/:id/image')
  @UseInterceptors(FileInterceptor('image', diskUpload(8)))
  image(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() f: Express.Multer.File | undefined) { return this.builder.setImage(id, f); }

  @RequirePermissions('lms.manage') @Post('admin/lms/courses/:id/topics')
  addTopic(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.TopicInput)) b: z.infer<typeof S.TopicInput>) { return this.builder.addTopic(id, b); }

  @RequirePermissions('lms.manage') @Put('admin/lms/topics/:id')
  updateTopic(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.TopicInput)) b: z.infer<typeof S.TopicInput>) { return this.builder.updateTopic(id, b); }

  @RequirePermissions('lms.manage') @HttpCode(204) @Delete('admin/lms/topics/:id')
  deleteTopic(@Param('id', ParseUUIDPipe) id: string) { return this.builder.deleteTopic(id); }

  @RequirePermissions('lms.manage') @HttpCode(204) @Post('admin/lms/courses/:id/topics/reorder')
  reorderTopics(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.Reorder)) b: z.infer<typeof S.Reorder>) { return this.builder.reorderTopics(id, b.ids); }

  @RequirePermissions('lms.manage') @Put('admin/lms/courses/:id/live-plan')
  livePlan(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.LivePlan)) b: z.infer<typeof S.LivePlan>, @CurrentUser() u: AuthUser) { return this.builder.setLivePlan(id, b, u); }

  @RequirePermissions('lms.manage') @HttpCode(200) @Post('admin/lms/courses/:id/publish')
  publish(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.PublishInput)) b: z.infer<typeof S.PublishInput>, @CurrentUser() u: AuthUser) { return this.builder.publish(id, b.publish, u); }

  // ── Admin: course builder ──
  @RequirePermissions('lms.manage') @Get('admin/lms/courses')
  courses() { return this.admin.courses(); }

  @RequirePermissions('lms.manage') @Get('admin/lms/courses/:id')
  course(@Param('id', ParseUUIDPipe) id: string) { return this.admin.course(id); }

  @RequirePermissions('lms.manage') @Put('admin/lms/courses/:id/online')
  online(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.OnlineSettings)) b: z.infer<typeof S.OnlineSettings>, @CurrentUser() u: AuthUser) { return this.admin.setOnline(id, b, u); }

  @RequirePermissions('lms.manage') @Post('admin/lms/courses/:id/lessons')
  @UseInterceptors(FileInterceptor('video', diskUpload(env().MAX_VIDEO_MB)))
  addLesson(@Param('id', ParseUUIDPipe) id: string, @Body() b: unknown, @UploadedFile() f: Express.Multer.File | undefined, @CurrentUser() u: AuthUser) { return this.admin.addLesson(id, b, f, u); }

  @RequirePermissions('lms.manage') @Put('admin/lms/lessons/:id')
  updateLesson(@Param('id', ParseUUIDPipe) id: string, @Body() b: unknown) { return this.admin.updateLesson(id, b); }

  @RequirePermissions('lms.manage') @Post('admin/lms/lessons/:id/video')
  @UseInterceptors(FileInterceptor('video', diskUpload(env().MAX_VIDEO_MB)))
  replaceVideo(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() f: Express.Multer.File | undefined) { return this.admin.replaceVideo(id, f); }

  @RequirePermissions('lms.manage') @Get('admin/lms/lessons/:id/preview')
  preview(@Param('id', ParseUUIDPipe) id: string) { return this.admin.lessonPreviewUrl(id); }

  @RequirePermissions('lms.manage') @HttpCode(204) @Delete('admin/lms/lessons/:id')
  deleteLesson(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.admin.deleteLesson(id, u); }

  @RequirePermissions('lms.manage') @HttpCode(200) @Post('admin/lms/courses/:id/lessons/reorder')
  reorder(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.Reorder)) b: z.infer<typeof S.Reorder>) { return this.admin.reorder(id, b.ids); }

  @RequirePermissions('lms.manage') @Post('admin/lms/courses/:id/notes')
  @UseInterceptors(FileInterceptor('file', diskUpload(50)))
  addNote(@Param('id', ParseUUIDPipe) id: string, @Body() b: unknown, @UploadedFile() f: Express.Multer.File | undefined) { return this.admin.addNote(id, b, f); }

  @RequirePermissions('lms.manage') @Put('admin/lms/notes/:id')
  updateNote(@Param('id', ParseUUIDPipe) id: string, @Body() b: unknown) { return this.admin.updateNote(id, b); }

  @RequirePermissions('lms.manage') @HttpCode(204) @Delete('admin/lms/notes/:id')
  deleteNote(@Param('id', ParseUUIDPipe) id: string) { return this.admin.deleteNote(id); }

  @RequirePermissions('lms.manage') @Post('admin/lms/courses/:id/quizzes')
  addQuiz(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.QuizInput)) b: z.infer<typeof S.QuizInput>) { return this.admin.addQuiz(id, b); }

  @RequirePermissions('lms.manage') @Put('admin/lms/quizzes/:id')
  updateQuiz(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.QuizInput)) b: z.infer<typeof S.QuizInput>) { return this.admin.updateQuiz(id, b); }

  @RequirePermissions('lms.manage') @HttpCode(204) @Delete('admin/lms/quizzes/:id')
  deleteQuiz(@Param('id', ParseUUIDPipe) id: string) { return this.admin.deleteQuiz(id); }

  // ── Student ──
  @Get('me/courses')
  myCourses(@CurrentUser() u: AuthUser) { return this.learner.myCourses(u); }

  @Get('me/courses/:slug')
  learn(@Param('slug') slug: string, @CurrentUser() u: AuthUser) { return this.learner.course(u, slug); }

  @Get('me/enrollments/:slug')
  enrollment(@Param('slug') slug: string, @CurrentUser() u: AuthUser) { return this.learner.enrollmentStatus(u, slug); }

  @Get('me/lessons/:id/url')
  lessonUrl(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.learner.lessonUrl(u, id); }

  @Get('me/notes/:id/url')
  noteUrl(@Param('id', ParseUUIDPipe) id: string, @Query('download') d: string | undefined, @CurrentUser() u: AuthUser) { return this.learner.noteUrl(u, id, d === '1'); }

  @HttpCode(200) @Post('me/lessons/:id/progress')
  progress(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.ProgressInput)) b: z.infer<typeof S.ProgressInput>, @CurrentUser() u: AuthUser) { return this.learner.progress(u, id, b.positionSec, b.completed); }

  @HttpCode(200) @Post('me/quizzes/:id/attempts')
  attempt(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.Attempt)) b: z.infer<typeof S.Attempt>, @CurrentUser() u: AuthUser) { return this.learner.attempt(u, id, b.answers); }
}
