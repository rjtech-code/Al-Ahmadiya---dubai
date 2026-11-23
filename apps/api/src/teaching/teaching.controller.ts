import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, RequirePermissions } from '../common/decorators';
import { TeachingService } from './teaching.service';

@ApiTags('teaching')
@ApiBearerAuth()
@Controller('teach')
export class TeachingController {
  constructor(private readonly svc: TeachingService) {}

  @RequirePermissions('teach.own') @Get('overview') overview(@CurrentUser() u: AuthUser) { return this.svc.overview(u); }
  @RequirePermissions('teach.own') @Get('courses/:id/students') students(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.students(u, id); }
  @RequirePermissions('teach.own') @Get('courses/:id/students/:userId') student(@Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string, @CurrentUser() u: AuthUser) { return this.svc.student(u, id, userId); }
}
