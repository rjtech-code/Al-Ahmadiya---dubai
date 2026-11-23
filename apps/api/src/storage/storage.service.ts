import { Injectable } from '@nestjs/common';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { env } from '../config/env';

/**
 * Private object storage abstraction. The local-filesystem driver is for
 * development only; production uses a UAE-region bucket (see DEPLOYMENT.md).
 * Keys are never exposed as public URLs; media is served through short-lived signed tokens.
 */
@Injectable()
export class StorageService {
  private root = resolve(env().STORAGE_DIR);

  pathFor(key: string) {
    const p = resolve(join(this.root, key));
    if (!p.startsWith(this.root + sep)) throw new Error('Invalid storage key');
    return p;
  }

  tmpDir() {
    return join(this.root, 'tmp');
  }

  async put(prefix: string, data: Buffer) {
    const key = `${prefix}/${randomUUID()}`;
    const p = this.pathFor(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data, { mode: 0o600 });
    return { key, sha256: createHash('sha256').update(data).digest('hex') };
  }

  /** Moves an already-written temp file (e.g. a large video upload) into storage without buffering it. */
  async putFile(prefix: string, tmpPath: string) {
    const key = `${prefix}/${randomUUID()}`;
    const p = this.pathFor(key);
    await mkdir(dirname(p), { recursive: true });
    await rename(tmpPath, p);
    return { key, bytes: (await stat(p)).size };
  }

  get(key: string) {
    return readFile(this.pathFor(key));
  }

  async size(key: string) {
    return (await stat(this.pathFor(key))).size;
  }

  stream(key: string, range?: { start: number; end: number }) {
    return createReadStream(this.pathFor(key), range);
  }

  async remove(key: string) {
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
