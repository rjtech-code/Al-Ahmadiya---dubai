import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { LiveServerModule } from './live/live-server.module';
import { env } from './config/env';

async function bootstrap() {
  const cfg = env();
  const app = await NestFactory.create(LiveServerModule, { cors: { origin: cfg.CORS_ORIGINS.split(',').map((s) => s.trim()), credentials: true } });
  app.enableShutdownHooks();
  await app.listen(cfg.PORT, cfg.HOST);
  Logger.log(`Live signalling service listening on port ${cfg.PORT}; Socket.IO namespace /live`, 'LiveBootstrap');
}
void bootstrap();
