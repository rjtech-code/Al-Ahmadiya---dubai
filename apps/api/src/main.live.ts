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
  const port = cfg.LIVE_PORT ?? cfg.PORT;
  await app.listen(port, cfg.HOST);
  Logger.log(`Live class server listening on port ${port}; Socket.IO namespace /live`, 'LiveBootstrap');
}
void bootstrap();
