import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { LiveGateway } from './live.gateway';
import { LiveRoomsService } from './rooms.service';

/** Dedicated real-time service. Shares the primary database for JWT/user/session validation. */
@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [LiveGateway, LiveRoomsService],
})
export class LiveServerModule {}
