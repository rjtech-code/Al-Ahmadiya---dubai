import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { diskUpload } from '../lms/uploads';
import { PortalService } from './portal.service';

/** Student portal. Every route returns only the signed-in student's own data. */
@ApiTags('student-portal')
@ApiBearerAuth()
@Controller('me/portal')
export class PortalController {
  constructor(private readonly svc: PortalService) {}

  @Get('dashboard') dashboard(@CurrentUser() u: AuthUser) { return this.svc.dashboard(u); }
  @Get('courses') courses(@CurrentUser() u: AuthUser) { return this.svc.courses(u); }
  @Get('wishlist') wishlist(@CurrentUser() u: AuthUser) { return this.svc.wishlist(u); }
  @HttpCode(200) @Post('wishlist/:slug') addWish(@Param('slug') slug: string, @CurrentUser() u: AuthUser) { return this.svc.addWish(u, slug); }
  @Delete('wishlist/:slug') removeWish(@Param('slug') slug: string, @CurrentUser() u: AuthUser) { return this.svc.removeWish(u, slug); }
  @Get('lectures') lectures(@CurrentUser() u: AuthUser) { return this.svc.lectures(u); }
  @Get('live') live(@CurrentUser() u: AuthUser) { return this.svc.live(u); }
  @Get('schedule') schedule(@CurrentUser() u: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    const f = from ? new Date(from) : new Date(Date.now() - 86_400_000);
    const t = to ? new Date(to) : new Date(f.getTime() + 7 * 86_400_000);
    if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime()) || t <= f || t.getTime() - f.getTime() > 62 * 86_400_000) return { data: [] };
    return this.svc.schedule(u, f, t);
  }
  @Get('attendance') attendance(@CurrentUser() u: AuthUser) { return this.svc.attendance(u); }
  @Get('assignments') assignments(@CurrentUser() u: AuthUser) { return this.svc.assignments(u); }
  @Get('assignments/:id') assignment(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.assignment(u, id); }
  @HttpCode(200) @Post('assignments/:id/submission') @UseInterceptors(FileInterceptor('file', diskUpload(20)))
  submit(@Param('id', ParseUUIDPipe) id: string, @Body() b: { text?: string }, @UploadedFile() f: Express.Multer.File | undefined, @CurrentUser() u: AuthUser) { return this.svc.submit(u, id, b?.text, f); }
  @Get('quizzes') quizzes(@CurrentUser() u: AuthUser) { return this.svc.quizzes(u); }
  @Get('results') results(@CurrentUser() u: AuthUser) { return this.svc.results(u); }
  @Get('documents') documents(@CurrentUser() u: AuthUser) { return this.svc.documents(u); }
  @Get('profile') profile(@CurrentUser() u: AuthUser) { return this.svc.profile(u); }
  @Put('profile') updateProfile(@Body() b: { fullName?: string; phone?: string | null; locale?: string }, @CurrentUser() u: AuthUser) { return this.svc.updateProfile(u, b ?? {}); }
}
