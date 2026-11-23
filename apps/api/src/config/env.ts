import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  /** Bind address; 127.0.0.1 in production so only the reverse proxy can reach the API. */
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(14),
  COOKIE_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  WEB_BASE_URL: z.string().url().default('http://localhost:3000'),
  /** Where the API reaches the website server-side (cache revalidation). Defaults to WEB_BASE_URL. */
  WEB_INTERNAL_URL: z.string().url().optional(),
  STORAGE_DIR: z.string().default('./storage'),
  SHOW_DEMO_CONTENT: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  /** razorpay = live/test Razorpay keys; test = built-in development gateway (never allowed in production). */
  PAYMENT_PROVIDER: z.enum(['razorpay', 'test', 'none']).default('none'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  /** Live classes run on our own mediasoup SFU (no third-party service). */
  LIVE_LISTEN_IP: z.string().default('0.0.0.0'),
  /** Public IP/hostname clients use to reach the media server (server's public IP in production). */
  LIVE_ANNOUNCED_IP: z.string().default('127.0.0.1'),
  LIVE_RTC_MIN_PORT: z.coerce.number().int().default(40000),
  LIVE_RTC_MAX_PORT: z.coerce.number().int().default(40200),
  MAX_VIDEO_MB: z.coerce.number().int().positive().default(2048),
  /** Shared with the website: refreshes cached public pages after admin changes. */
  REVALIDATE_SECRET: z.string().min(16).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
    }
    if (parsed.data.NODE_ENV === 'production') {
      const problems = productionProblems(parsed.data);
      if (problems.length) throw new Error(`Unsafe production configuration:\n - ${problems.join('\n - ')}`);
    }
    if (parsed.data.NODE_ENV === 'production' && parsed.data.SHOW_DEMO_CONTENT) {
      throw new Error('SHOW_DEMO_CONTENT must not be enabled in production');
    }
    if (parsed.data.NODE_ENV === 'production' && parsed.data.PAYMENT_PROVIDER === 'test') {
      throw new Error('The test payment gateway must not be enabled in production');
    }
    if (parsed.data.PAYMENT_PROVIDER === 'razorpay' && !(parsed.data.RAZORPAY_KEY_ID && parsed.data.RAZORPAY_KEY_SECRET)) {
      throw new Error('PAYMENT_PROVIDER=razorpay requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
    }
    cached = parsed.data;
  }
  return cached;
}

const PLACEHOLDER = /replace|changeme|change-me|xxxx|example|set-a-strong/i;

/** Settings that are acceptable on a laptop but must never reach a live server. */
export function productionProblems(e: Env): string[] {
  const p: string[] = [];
  for (const k of ['JWT_ACCESS_SECRET', 'COOKIE_SECRET'] as const) {
    if (e[k].length < 64 || PLACEHOLDER.test(e[k])) p.push(`${k} must be a random value of at least 64 characters (openssl rand -hex 32)`);
  }
  if (e.JWT_ACCESS_SECRET === e.COOKIE_SECRET) p.push('JWT_ACCESS_SECRET and COOKIE_SECRET must be different');
  if (!e.REVALIDATE_SECRET || e.REVALIDATE_SECRET.length < 32 || PLACEHOLDER.test(e.REVALIDATE_SECRET)) p.push('REVALIDATE_SECRET must be set to a random value of at least 32 characters');
  if (!e.WEB_BASE_URL.startsWith('https://')) p.push('WEB_BASE_URL must use https://');
  const origins = e.CORS_ORIGINS.split(',').map((s) => s.trim());
  if (origins.some((o) => !o.startsWith('https://'))) p.push('CORS_ORIGINS must list https:// origins only');
  if (!/localhost|127\.0\.0\.1|host=\/|@\//.test(e.DATABASE_URL) && !/sslmode=/.test(e.DATABASE_URL)) p.push('DATABASE_URL for a remote database must include sslmode=require (or verify-full)');
  if (['127.0.0.1', 'localhost', '0.0.0.0'].includes(e.LIVE_ANNOUNCED_IP)) p.push("LIVE_ANNOUNCED_IP must be the server's public IP or hostname");
  if (e.PAYMENT_PROVIDER === 'razorpay') {
    if (!e.RAZORPAY_WEBHOOK_SECRET || PLACEHOLDER.test(e.RAZORPAY_WEBHOOK_SECRET)) p.push('RAZORPAY_WEBHOOK_SECRET is required with PAYMENT_PROVIDER=razorpay');
    if ([e.RAZORPAY_KEY_ID, e.RAZORPAY_KEY_SECRET].some((v) => !v || PLACEHOLDER.test(v))) p.push('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET still hold placeholder values');
  }
  return p;
}
