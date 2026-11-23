import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';
import { LiveSchedulerService } from './scheduler.service';
import { LiveGateway } from './live.gateway';
import { LiveRoomsService } from './rooms.service';

/**
 * Single-service deployment: REST live-class management, Socket.IO signalling,
 * presence/chat/polls and the mediasoup room manager all run in the Core API
 * process. When a UDP-capable VPS is introduced, these providers can be moved
 * back into LiveServerModule without changing the frontend contract.
 */
@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [LiveController],
  providers: [LiveService, LiveSchedulerService, LiveGateway, LiveRoomsService],
  exports: [LiveService, LiveSchedulerService],
})
export class LiveModule {}
