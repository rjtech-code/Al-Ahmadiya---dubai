import { Controller, InternalServerErrorException, Post, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Pool } from 'pg';
import { Public } from '../common/decorators';
import { env } from '../config/env';

const DEMO_SQL_URL = process.env.DEMO_SQL_URL;

function decodeCopyField(field: string): string | null {
  if (field === '\\N') return null;
  let value = '';
  for (let i = 0; i < field.length; i += 1) {
    const char = field[i];
    if (char !== '\\') { value += char; continue; }
    const next = field[i + 1];
    if (next === undefined) { value += '\\'; continue; }
    const escapes: Record<string, string> = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\' };
    if (next in escapes) { value += escapes[next]; i += 1; }
    else if (next === 'x' && /^[0-9a-f]{1,2}$/i.test(field.slice(i + 2, i + 4))) {
      value += String.fromCharCode(parseInt(field.slice(i + 2, i + 4), 16)); i += 3;
    } else if (/[0-7]/.test(next)) {
      const octal = field.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] ?? next;
      value += String.fromCharCode(parseInt(octal, 8)); i += octal.length;
    } else { value += next; i += 1; }
  }
  return value;
}

function sqlLiteral(value: string | null): string {
  return value === null ? 'NULL' : "'" + value.replace(/'/g, "''") + "'";
}

/** Convert pg_dump COPY blocks into INSERTs for node-postgres' simple query protocol. */
function prepareDump(dump: string): { sql: string; tables: string[]; copiedRows: number } {
  const lines = dump.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  const tables = new Set<string>();
  let copiedRows = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^\\(restrict|unrestrict|connect|encoding|password|gset|set|echo|timing|if|endif)\b/i.test(trimmed)) continue;
    if (/^(BEGIN|COMMIT)\s*;?$/i.test(trimmed)) continue;
    if (/^(CREATE|DROP)\s+SCHEMA\s+(IF\s+NOT\s+EXISTS\s+)?public(?:\s+(?:CASCADE|RESTRICT))?\s*;?$/i.test(trimmed)) continue;
    if (/^(CREATE|DROP)\s+DATABASE\b/i.test(trimmed)) continue;
    if (/^(GRANT|REVOKE|ALTER\s+DEFAULT\s+PRIVILEGES)\b/i.test(trimmed)) continue;
    if (/^ALTER\s+.*\s+OWNER\s+TO\s+.*;$/i.test(trimmed)) continue;
    if (/^SET\s+(SESSION\s+)?AUTHORIZATION\b/i.test(trimmed)) continue;

    const copy = trimmed.match(/^COPY\s+(.+?)\s*\((.+)\)\s+FROM\s+stdin\s*;$/i);
    if (copy) {
      const table = copy[1].trim();
      const columns = copy[2].trim();
      tables.add(table);
      const rows: (string | null)[][] = [];
      while (i + 1 < lines.length && lines[i + 1].trim() !== '\\.') {
        i += 1;
        rows.push(lines[i].split('\t').map(decodeCopyField));
      }
      if (i + 1 < lines.length && lines[i + 1].trim() === '\\.') i += 1;
      for (let offset = 0; offset < rows.length; offset += 250) {
        const chunk = rows.slice(offset, offset + 250);
        const values = chunk.map((row) => '(' + row.map(sqlLiteral).join(', ') + ')').join(',\n');
        output.push('INSERT INTO ' + table + ' (' + columns + ') OVERRIDING SYSTEM VALUE VALUES\n' + values + ';');
      }
      copiedRows += rows.length;
      continue;
    }

    const insert = trimmed.match(/^INSERT\s+INTO\s+((?:"[^"]+"|[\w$]+)(?:\.(?:"[^"]+"|[\w$]+))?)/i);
    if (insert) tables.add(insert[1]);
    output.push(line);
  }
  return { sql: output.join('\n'), tables: [...tables], copiedRows };
}

@ApiTags('temporary-demo-import')
@Public()
@SkipThrottle()
@Controller('admin')
export class DemoImportController {
  @Post('demo-import')
  async importDemoData() {
    if (!DEMO_SQL_URL) throw new ServiceUnavailableException('DEMO_SQL_URL is not configured.');
    const source = await fetch(DEMO_SQL_URL).catch(() => null);
    if (!source?.ok) throw new ServiceUnavailableException('Could not download al_ahmadiya_demo.sql from GitHub.');
    const dump = await source.text();
    if (dump.trim().length < 100) throw new ServiceUnavailableException('The GitHub SQL file is empty or unavailable.');

    const prepared = prepareDump(dump);
    if (!prepared.sql.trim()) throw new ServiceUnavailableException('The SQL file did not contain executable SQL.');

    const pool = new Pool({ connectionString: env().DATABASE_URL, max: 1, connectionTimeoutMillis: 15000 });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
      await client.query(prepared.sql);
      await client.query('COMMIT');

      const tables = await Promise.all(prepared.tables.map(async (table) => {
        try {
          const result = await client.query('SELECT COUNT(*)::bigint AS count FROM ' + table);
          return { table, rows: Number(result.rows[0]?.count ?? 0) };
        } catch { return { table, rows: null }; }
      }));
      return {
        success: true,
        message: 'Demo data imported successfully.',
        source: 'al_ahmadiya_demo.sql',
        copiedRows: prepared.copiedRows,
        tables,
        totalRows: tables.reduce((sum, item) => sum + (item.rows ?? 0), 0),
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      const message = error instanceof Error ? error.message : 'Unknown database import error';
      throw new InternalServerErrorException('Demo import failed. Database changes were rolled back. ' + message);
    } finally {
      client.release();
      await pool.end();
    }
  }
}
