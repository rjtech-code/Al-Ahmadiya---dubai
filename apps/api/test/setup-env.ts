import { config } from 'dotenv';

config({ path: '.env', quiet: true });
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://pragati@localhost/al_ahmadiya_test?host=/var/run/postgresql';
process.env.STORAGE_DIR = './storage-test';
process.env.SHOW_DEMO_CONTENT = 'false';
process.env.PAYMENT_PROVIDER = 'test';
