import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LiveController } from './live.controller';
import { LiveGateway } from './live.gateway';
import { LiveService } from './live.service';
import { LiveRoomsService } from './rooms.service';

@Module({ imports: [JwtModule.register({})], controllers: [LiveController], providers: [LiveService, LiveRoomsService, LiveGateway] })
export class LiveModule {}
