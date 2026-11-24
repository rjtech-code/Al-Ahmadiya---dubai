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
    const f = await this.storage.open(t.k, range);
    const name = t.n ? encodeURIComponent(t.n) : 'file';
    res.status(f.status);
    for (const [k, v] of Object.entries(f.headers)) res.setHeader(k, v);
    if (f.status === 416 || !f.body) return res.end();
    res.setHeader('Content-Type', t.m);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `${t.d}; filename*=UTF-8''${name}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return f.body.pipe(res);
  }
}
