import { productionProblems, type Env } from './env';

const good: Env = {
  NODE_ENV: 'production', PORT: 4000, HOST: '127.0.0.1',
  DATABASE_URL: 'postgresql://u:p@db.internal:5432/app?sslmode=require',
  JWT_ACCESS_SECRET: 'a'.repeat(64), JWT_ACCESS_TTL_SECONDS: 900, REFRESH_TTL_DAYS: 14, COOKIE_SECRET: 'b'.repeat(64),
  CORS_ORIGINS: 'https://site.ae', WEB_BASE_URL: 'https://site.ae', WEB_INTERNAL_URL: 'http://127.0.0.1:3000',
  STORAGE_DIR: '/var/lib/app', SHOW_DEMO_CONTENT: false, PAYMENT_PROVIDER: 'razorpay',
  RAZORPAY_KEY_ID: 'rzp_live_abc', RAZORPAY_KEY_SECRET: 's3cr3t', RAZORPAY_WEBHOOK_SECRET: 'whsec',
  LIVE_LISTEN_IP: '0.0.0.0', LIVE_ANNOUNCED_IP: '203.0.113.10', LIVE_RTC_MIN_PORT: 40000, LIVE_RTC_MAX_PORT: 40200,
  MAX_VIDEO_MB: 2048, REVALIDATE_SECRET: 'c'.repeat(32),
};

describe('productionProblems', () => {
  it('accepts a complete production configuration', () => {
    expect(productionProblems(good)).toEqual([]);
  });
  it('rejects development values', () => {
    const p = productionProblems({
      ...good, JWT_ACCESS_SECRET: 'replace-with-64-hex-chars'.padEnd(64, 'x'), WEB_BASE_URL: 'http://localhost:3000', CORS_ORIGINS: 'http://localhost:3000',
      LIVE_ANNOUNCED_IP: '127.0.0.1', DATABASE_URL: 'postgresql://u:p@db.remote:5432/app', REVALIDATE_SECRET: undefined, RAZORPAY_WEBHOOK_SECRET: undefined,
    });
    expect(p.join('\n')).toMatch(/JWT_ACCESS_SECRET/);
    expect(p).toHaveLength(7);
  });
  it('allows a local database without sslmode', () => {
    expect(productionProblems({ ...good, DATABASE_URL: 'postgresql://app@localhost/app' })).toEqual([]);
  });
});
