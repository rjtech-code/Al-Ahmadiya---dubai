import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './bootstrap';
import { env } from './config/env';

async function bootstrap() {
  const cfg = env(); // fail fast on invalid configuration
  const app = configureApp(await NestFactory.create(AppModule, { rawBody: true }));
  if (cfg.NODE_ENV !== 'production') setupSwagger(app);
  await app.listen(cfg.PORT, cfg.HOST);
  Logger.log(`API listening on port ${cfg.PORT} (host ${cfg.HOST}) at /api/v1${cfg.NODE_ENV !== 'production' ? ' (docs: /api/docs)' : ''}`, 'Bootstrap');
}
void bootstrap();
