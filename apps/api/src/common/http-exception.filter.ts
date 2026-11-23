import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client';

/** Uniform error envelope: { error: { code, message, details? } }. Never leaks stack traces. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      // Gateway handlers return their own error acks; never crash the socket.
      this.logger.error(exception instanceof Error ? exception.message : String(exception));
      return;
    }
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        code = typeof b.code === 'string' ? b.code : HttpStatus[status] ?? 'ERROR';
        message = typeof b.message === 'string' ? b.message : Array.isArray(b.message) ? b.message.join('; ') : exception.message;
        details = b.details;
      } else {
        code = HttpStatus[status] ?? 'ERROR';
        message = String(body);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = 'UNIQUE_CONSTRAINT';
        message = 'A record with this value already exists';
        details = exception.meta?.target;
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'NOT_FOUND';
        message = 'Record not found';
      } else if (exception.code === 'P2003') {
        status = HttpStatus.CONFLICT;
        code = 'FOREIGN_KEY_CONSTRAINT';
        message = 'Related record constraint failed';
      }
    }

    if (status >= 500) this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });
  }
}
