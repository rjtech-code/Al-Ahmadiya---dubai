import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Post, Put, Query, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public, RequirePermissions } from '../common/decorators';
import { PageQuery } from '../common/pagination';
import { ZodPipe } from '../common/zod.pipe';
import * as S from './admissions.schemas';
import { AdmissionsService } from './admissions.service';

const AdminQuery = PageQuery.extend({
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_CORRECTION', 'DOCUMENTS_PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN']).optional(),
  q: z.string().trim().max(100).optional(),
});

@ApiTags('admissions')
@Controller()
export class AdmissionsController {
  constructor(private readonly svc: AdmissionsService) {}

  @Public()
  @Get('public/admissions/config')
  config() {
    return this.svc.config();
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('public/admissions/eligibility')
  eligibility(@Body(new ZodPipe(S.EligibilityBody)) body: z.infer<typeof S.EligibilityBody>) {
    return this.svc.checkEligibility(body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('public/admissions/status')
  status(@Body(new ZodPipe(S.StatusLookup)) body: z.infer<typeof S.StatusLookup>) {
    return this.svc.lookupStatus(body);
  }

  // Applicant (any authenticated user owns only their own applications)
  @ApiBearerAuth()
  @Get('applications/mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.svc.mine(user);
  }

  @ApiBearerAuth()
  @Post('applications')
  create(@CurrentUser() user: AuthUser) {
    return this.svc.createDraft(user);
  }

  @ApiBearerAuth()
  @Put('applications/:id/steps/:step')
  step(@Param('id', ParseUUIDPipe) id: string, @Param('step', ParseIntPipe) step: number, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.svc.saveStep(user, id, step, body);
  }

  @ApiBearerAuth()
  @Post('applications/:id/documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: S.MAX_DOC_BYTES, files: 1 } }))
  upload(@Param('id', ParseUUIDPipe) id: string, @Body('docType') docType: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthUser) {
    return this.svc.uploadDocument(user, id, docType, file);
  }

  @ApiBearerAuth()
  @HttpCode(204)
  @Delete('applications/:id/documents/:docId')
  deleteDoc(@Param('id', ParseUUIDPipe) id: string, @Param('docId', ParseUUIDPipe) docId: string, @CurrentUser() user: AuthUser) {
    return this.svc.deleteDocument(user, id, docId);
  }

  @ApiBearerAuth()
  @HttpCode(200)
  @Post('applications/:id/submit')
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.svc.submit(user, id);
  }

  // Admin
  @ApiBearerAuth()
  @RequirePermissions('admissions.read')
  @Get('admin/applications')
  adminList(@Query(new ZodPipe(AdminQuery)) q: z.infer<typeof AdminQuery>) {
    return this.svc.adminList(q);
  }

  @ApiBearerAuth()
  @RequirePermissions('admissions.read')
  @Get('admin/applications/:id')
  adminGet(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.svc.adminGet(id, user);
  }

  @ApiBearerAuth()
  @RequirePermissions('admissions.review')
  @Get('admin/applications/:id/documents/:docId')
  async adminDoc(@Param('id', ParseUUIDPipe) id: string, @Param('docId', ParseUUIDPipe) docId: string, @CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const { doc, buffer } = await this.svc.adminDocument(id, docId, user);
    res.set({ 'Content-Type': doc.mimeType, 'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.originalName)}"`, 'Cache-Control': 'no-store' });
    return new StreamableFile(buffer);
  }

  @ApiBearerAuth()
  @RequirePermissions('admissions.review')
  @HttpCode(200)
  @Post('admin/applications/:id/transition')
  transition(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(S.TransitionBody)) body: z.infer<typeof S.TransitionBody>, @CurrentUser() user: AuthUser) {
    return this.svc.transition(id, body.to, body.note, user);
  }
}
