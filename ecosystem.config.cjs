/**
 * PM2 process file for the production server.
 *   pm2 start ecosystem.config.cjs && pm2 save
 * Secrets are read from apps/api/.env and apps/web/.env.production.local on the server (never committed).
 */
module.exports = {
  apps: [
    {
      name: 'ahmadiya-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      // One process: the live-class media server keeps room state in memory.
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '1500M',
      kill_timeout: 10000,
      time: true,
    },
    {
      // Live-class server (mediasoup + Socket.IO). Runs on the VPS that has UDP ports open.
      name: 'ahmadiya-live',
      cwd: './apps/api',
      script: 'dist-live/main.live.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '1500M',
      time: true,
    },
    {
      name: 'ahmadiya-web',
      cwd: './apps/web',
      script: '../../node_modules/next/dist/bin/next',
      args: 'start --port 3000 --hostname 127.0.0.1',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '1000M',
      time: true,
    },
  ],
};
