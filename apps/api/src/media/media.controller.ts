import { Controller, ForbiddenException, Get, Headers, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../common/decorators';
import { StorageService } from '../storage/storage.service';

/**
 * Serves private media (lesson videos, notes, recordings) via short-lived HMAC-signed tokens issued
 * only after the API has checked enrollment/permissions. Supports HTTP Range for video seeking.
 */
@ApiTags('media')
@Public()
@SkipThrottle()
@Controller('media')
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Get(':token')
  async serve(@Param('token') token: string, @Headers('range') range: string | undefined, @Res() res: Response) {
    const t = this.storage.verify(token);
    if (!t) throw new ForbiddenException({ code: 'MEDIA_LINK_EXPIRED', message: 'This media link is invalid or has expired.' });
    const size = await this.storage.size(t.k);
    const name = t.n ? encodeURIComponent(t.n) : 'file';
    res.setHeader('Content-Type', t.m);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `${t.d}; filename*=UTF-8''${name}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
    if (m) {
      const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      if (start >= size || start > end) {
        res.status(416).setHeader('Content-Range', `bytes */${size}`);
        return res.end();
      }
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', String(end - start + 1));
      return this.storage.stream(t.k, { start, end }).pipe(res);
    }
    res.setHeader('Content-Length', String(size));
    return this.storage.stream(t.k).pipe(res);
  }
}
