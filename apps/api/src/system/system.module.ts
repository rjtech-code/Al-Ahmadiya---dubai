import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { env } from '../config/env';
import { AllExceptionsFilter } from '../common/http-exception.filter';
import { RevalidateInterceptor } from '../common/revalidate.interceptor';

/** Cross-cutting platform concerns: scheduling, rate limits and HTTP pipeline. */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
      skipIf: (ctx) => env().NODE_ENV === 'test' || ctx.getType() !== 'http',
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: RevalidateInterceptor },
  ],
})
export class SystemModule {}
