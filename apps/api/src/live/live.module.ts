import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';
import { LiveSchedulerService } from './scheduler.service';

/** Core API: REST scheduling, enrollment checks, attendance records and recordings.
 * WebSocket signalling + mediasoup are hosted by LiveServerModule in the live service.
 */
@Module({
  imports: [JwtModule.register({})],
  controllers: [LiveController],
  providers: [LiveService, LiveSchedulerService],
  exports: [LiveService, LiveSchedulerService],
})
export class LiveModule {}
