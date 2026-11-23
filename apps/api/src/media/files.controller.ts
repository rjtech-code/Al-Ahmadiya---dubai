import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { stat } from 'node:fs/promises';
import { Public } from '../common/decorators';
import { StorageService } from '../storage/storage.service';

const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** Public images uploaded in the admin panel (course covers). Only files under storage/public are reachable. */
@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Public()
  @Get(':folder/:name')
  async get(@Param('folder') folder: string, @Param('name') name: string, @Res() res: Response) {
    const m = /^[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(name);
    if (!['courses'].includes(folder) || !m) throw new NotFoundException({ code: 'NOT_FOUND', message: 'File not found' });
    const key = `public/${folder}/${name}`;
    try { await stat(this.storage.pathFor(key)); } catch { throw new NotFoundException({ code: 'NOT_FOUND', message: 'File not found' }); }
    res.setHeader('Content-Type', TYPES[m[1]]);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    this.storage.stream(key).pipe(res);
  }
}
