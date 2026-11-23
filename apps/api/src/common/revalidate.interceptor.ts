import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { tap } from 'rxjs';
import { env } from '../config/env';

/**
 * After any successful admin write (CMS, programmes, courses, settings, live classes), asks the
 * website to drop its cached public data so changes appear immediately. Fire-and-forget.
 */
@Injectable()
export class RevalidateInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Revalidate');
  private timer: NodeJS.Timeout | null = null;

  intercept(ctx: ExecutionContext, next: CallHandler) {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest<Request>();
    const isAdminWrite = req.method !== 'GET' && /\/api\/v1\/admin\/(cms|academics|lms|settings|live)\b/.test(req.originalUrl);
    return next.handle().pipe(tap(() => { if (isAdminWrite) this.schedule(); }));
  }

  /** Debounced so bulk edits trigger one refresh. */
  private schedule() {
    const secret = env().REVALIDATE_SECRET;
    if (!secret) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      fetch(`${env().WEB_INTERNAL_URL ?? env().WEB_BASE_URL}/api/revalidate`, { method: 'POST', headers: { 'x-revalidate-secret': secret } })
        .then((r) => { if (!r.ok) this.logger.warn(`Website revalidation returned ${r.status}`); })
        .catch((e: Error) => this.logger.warn(`Website revalidation failed: ${e.message}`));
    }, 300);
  }
}
