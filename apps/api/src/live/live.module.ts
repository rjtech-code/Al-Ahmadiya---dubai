import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';
import { LiveSchedulerService } from './scheduler.service';

/**
 * Render single-service profile:
 * keeps live-class scheduling, management, recordings and database workflows in
 * the Core API. The mediasoup SFU / UDP gateway remains in live-server.module
 * for the later VPS deployment, where UDP ports can be exposed safely.
 */
@Module({
  imports: [PrismaModule],
  controllers: [LiveController],
  providers: [LiveService, LiveSchedulerService],
  exports: [LiveService, LiveSchedulerService],
})
export class LiveModule {}
