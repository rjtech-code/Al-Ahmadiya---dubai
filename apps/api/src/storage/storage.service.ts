import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

/** Result of opening a stored file for an HTTP response (supports Range for video seeking). */
export interface OpenedFile { status: 200 | 206 | 416; headers: Record<string, string>; body?: Readable }

/**
 * Where files live:
 *  - images (course covers, site photos) → Cloudinary, public URLs;
 *  - videos (lectures, class recordings) → Cloudinary, private ("authenticated"), streamed through the API
 *    only after enrolment is checked — the Cloudinary URL is never shown to the browser;
 *  - PDFs and applicants' documents → PostgreSQL (StoredFile table).
 * Without CLOUDINARY_URL (local development only) images and videos stay on local disk.
 *
 * Key formats: `db:<id>` · `cld:video:<format>:<public_id>` · anything else = local disk path.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger('Storage');
  private root = resolve(env().STORAGE_DIR);
  private readonly cloud: boolean;

  constructor(private readonly prisma: PrismaService) {
    const url = env().CLOUDINARY_URL;
    this.cloud = !!url;
    if (url) {
      const u = new URL(url);
      cloudinary.config({ cloud_name: u.hostname, api_key: decodeURIComponent(u.username), api_secret: decodeURIComponent(u.password), secure: true });
    } else if (env().NODE_ENV === 'production') {
      this.logger.warn('CLOUDINARY_URL is not set: images and videos are being saved on this server\'s disk, which Render wipes on every deploy.');
    }
  }

  get usesCloudinary() { return this.cloud; }

  // ── Local disk (development fallback + upload temp files) ──
  pathFor(key: string) {
    const p = resolve(join(this.root, key));
    if (!p.startsWith(this.root + sep)) throw new Error('Invalid storage key');
    return p;
  }

  tmpDir() {
    return join(this.root, 'tmp');
  }

  private folder(sub: string) {
    return `${env().CLOUDINARY_FOLDER}/${sub}`;
  }

  // ── Writing ──

  /** Small private file already in memory (applicants' documents) → database. */
  async put(_prefix: string, data: Buffer, mime = 'application/octet-stream') {
    const sha256 = createHash('sha256').update(data).digest('hex');
    const f = await this.prisma.storedFile.create({ data: { mime, bytes: data.length, sha256, data: new Uint8Array(data) } });
    return { key: `db:${f.id}`, sha256 };
  }

  /** Uploaded temp file → videos to Cloudinary, PDFs to the database. The temp file is always removed. */
  async putFile(prefix: string, tmpPath: string, kind: 'video' | 'pdf', mime: string): Promise<{ key: string; bytes: number }> {
    try {
      if (kind === 'pdf') {
        const data = await readFile(tmpPath);
        const { key } = await this.put(prefix, data, mime);
        return { key, bytes: data.length };
      }
      if (this.cloud) {
        const r = await new Promise<{ public_id: string; format: string; bytes: number }>((ok, fail) => {
          void cloudinary.uploader.upload_large(tmpPath, { resource_type: 'video', type: 'authenticated', folder: this.folder(prefix), chunk_size: 20_000_000 },
            (err, res) => (err || !res ? fail(err ?? new Error('Upload failed')) : ok(res as { public_id: string; format: string; bytes: number })));
        });
        return { key: `cld:video:${r.format}:${r.public_id}`, bytes: r.bytes };
      }
      const key = `${prefix}/${randomUUID()}`;
      const p = this.pathFor(key);
      await mkdir(dirname(p), { recursive: true });
      await rename(tmpPath, p);
      return { key, bytes: (await stat(p)).size };
    } finally {
      await rm(tmpPath, { force: true });
    }
  }

  /** Public image (course cover) → Cloudinary URL (or a local URL in development). */
  async putImage(tmpPath: string, sub: string, ext: string): Promise<string> {
    try {
      if (this.cloud) {
        const r = await cloudinary.uploader.upload(tmpPath, { resource_type: 'image', folder: this.folder(sub) });
        return r.secure_url;
      }
      const key = `public/${sub}/${randomUUID()}.${ext}`;
      const p = this.pathFor(key);
      await mkdir(dirname(p), { recursive: true });
      await rename(tmpPath, p);
      return `/api/v1/files/${key.slice('public/'.length)}`;
    } finally {
      await rm(tmpPath, { force: true });
    }
  }

  /** Deletes an image previously returned by putImage (ignored for other URLs). */
  async removeImage(url: string | null | undefined) {
    if (!url) return;
    const cld = /res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+)\.\w+$/.exec(url);
    if (cld && this.cloud) { await cloudinary.uploader.destroy(cld[1], { resource_type: 'image' }).catch(() => undefined); return; }
    if (url.startsWith('/api/v1/files/')) await rm(this.pathFor(`public/${url.slice('/api/v1/files/'.length)}`), { force: true });
  }

  // ── Reading ──

  private cld(key: string) {
    const [, type, format, ...rest] = key.split(':');
    return { type: type as 'video', format, publicId: rest.join(':') };
  }

  private cldUrl(key: string) {
    const c = this.cld(key);
    return cloudinary.url(c.publicId, { resource_type: c.type, type: 'authenticated', sign_url: true, secure: true, format: c.format });
  }

  async get(key: string): Promise<Buffer> {
    if (key.startsWith('db:')) {
      const f = await this.prisma.storedFile.findUniqueOrThrow({ where: { id: key.slice(3) } });
      return Buffer.from(f.data);
    }
    if (key.startsWith('cld:')) return Buffer.from(await (await fetch(this.cldUrl(key))).arrayBuffer());
    return readFile(this.pathFor(key));
  }

  async size(key: string): Promise<number> {
    if (key.startsWith('db:')) return (await this.prisma.storedFile.findUniqueOrThrow({ where: { id: key.slice(3) }, select: { bytes: true } })).bytes;
    if (key.startsWith('cld:')) {
      const c = this.cld(key);
      return ((await cloudinary.api.resource(c.publicId, { resource_type: c.type, type: 'authenticated' })) as { bytes: number }).bytes;
    }
    return (await stat(this.pathFor(key))).size;
  }

  /** Local-disk stream (development images). */
  stream(key: string, range?: { start: number; end: number }) {
    return createReadStream(this.pathFor(key), range);
  }

  /** Opens any stored file for an HTTP response, honouring a Range header. */
  async open(key: string, rangeHeader?: string): Promise<OpenedFile> {
    if (key.startsWith('cld:')) {
      const r = await fetch(this.cldUrl(key), { headers: rangeHeader ? { Range: rangeHeader } : {} });
      if (!r.ok && r.status !== 206) {
        this.logger.warn(`Cloudinary returned ${r.status} for ${this.cld(key).publicId}`);
        return { status: r.status === 416 ? 416 : 200, headers: {}, body: Readable.from([]) };
      }
      const headers: Record<string, string> = {};
      for (const h of ['content-length', 'content-range']) { const v = r.headers.get(h); if (v) headers[h] = v; }
      return { status: r.status === 206 ? 206 : 200, headers, body: r.body ? Readable.fromWeb(r.body as WebReadableStream) : undefined };
    }
    const size = await this.size(key);
    const m = rangeHeader && /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    let start = 0, end = size - 1, status: 200 | 206 = 200;
    if (m) {
      start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
      end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      if (start >= size || start > end) return { status: 416, headers: { 'content-range': `bytes */${size}` } };
      status = 206;
    }
    const headers: Record<string, string> = { 'content-length': String(end - start + 1), ...(status === 206 ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}) };
    if (key.startsWith('db:')) return { status, headers, body: Readable.from([(await this.get(key)).subarray(start, end + 1)]) };
    return { status, headers, body: this.stream(key, { start, end }) };
  }

  async remove(key: string) {
    if (key.startsWith('db:')) { await this.prisma.storedFile.deleteMany({ where: { id: key.slice(3) } }); return; }
    if (key.startsWith('cld:')) {
      const c = this.cld(key);
      if (this.cloud) await cloudinary.uploader.destroy(c.publicId, { resource_type: c.type, type: 'authenticated', invalidate: true }).catch((e: unknown) => this.logger.warn(`Cloudinary delete failed: ${(e as Error).message}`));
      return;
    }
    await rm(this.pathFor(key), { force: true });
  }

  // ── Signed media tokens (stateless, short-lived) ──
  private secret() {
    return `${env().COOKIE_SECRET}:media`;
  }

  sign(payload: { key: string; mime: string; name?: string; disposition?: 'inline' | 'attachment'; ttlSec?: number }) {
    const body = Buffer.from(JSON.stringify({ k: payload.key, m: payload.mime, n: payload.name, d: payload.disposition ?? 'inline', e: Math.floor(Date.now() / 1000) + (payload.ttlSec ?? 7200) })).toString('base64url');
    const sig = createHmac('sha256', this.secret()).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  verify(token: string): { k: string; m: string; n?: string; d: 'inline' | 'attachment' } | null {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = createHmac('sha256', this.secret()).update(body).digest();
    const given = Buffer.from(sig, 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString()) as { k: string; m: string; n?: string; d: 'inline' | 'attachment'; e: number };
    if (data.e < Date.now() / 1000) return null;
    return data;
  }
}
