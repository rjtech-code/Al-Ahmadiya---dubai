import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { open, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { diskStorage } from 'multer';
import { env } from '../config/env';

/** Large uploads (videos) are streamed to a temp dir on disk, never buffered in memory. */
export const diskUpload = (maxMb: number) => ({
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const dir = join(resolve(env().STORAGE_DIR), 'tmp');
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, _file, cb) => cb(null, randomUUID()),
  }),
  limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
});

const SIGS: Record<string, (b: Buffer) => boolean> = {
  'video/mp4': (b) => b.subarray(4, 8).toString('latin1') === 'ftyp',
  'video/quicktime': (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' || b.subarray(4, 8).toString('latin1') === 'moov',
  'video/webm': (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  'application/pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};

/** Verifies the file's real content type by magic bytes; deletes it and throws if it does not match. */
export async function assertFileType(file: Express.Multer.File | undefined, allowed: string[], label: string) {
  if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: `Choose a ${label} file to upload` });
  const mime = file.mimetype.split(';')[0];
  const sniff = SIGS[mime];
  let ok = false;
  if (allowed.includes(mime) && sniff) {
    const fh = await open(file.path, 'r');
    const buf = Buffer.alloc(16);
    await fh.read(buf, 0, 16, 0);
    await fh.close();
    ok = sniff(buf);
  }
  if (!ok) {
    await rm(file.path, { force: true });
    throw new BadRequestException({ code: 'FILE_TYPE', message: `Unsupported ${label} file. Allowed: ${allowed.join(', ')}` });
  }
  return mime;
}
