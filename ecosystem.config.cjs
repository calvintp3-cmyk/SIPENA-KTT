// ecosystem.config.cjs
const fs = require('node:fs');
const path = require('node:path');

/**
 * Muat variabel lingkungan dari file `.env` agar `process.env.*` dan Nitro `runtimeConfig`
 * tersedia sejak proses `node .output/server/index.mjs` pertama kali dijalankan oleh PM2.
 */
function loadDotenvSafe(envFilePath) {
  if (!fs.existsSync(envFilePath)) {
    return {};
  }

  try {
    const dotenv = require('dotenv');
    const result = dotenv.config({ path: envFilePath, quiet: true });
    return result.parsed || {};
  } catch {
    return {};
  }
}

const envPath = path.join(__dirname, '.env');
const parsedEnv = loadDotenvSafe(envPath);

module.exports = {
  apps: [
    {
      name: 'sipena-ktt',
      cwd: __dirname,
      script: '.output/server/index.mjs',
      // Wajib fork mode + 1 instance agar Nitro scheduledTasks (04:00 & 06:30 WITA) tidak berjalan ganda
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '900M',
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 10000,
      env: {
        ...parsedEnv,
        NODE_ENV: 'production',
        NITRO_HOST: parsedEnv.NITRO_HOST || '127.0.0.1',
        HOST: parsedEnv.NITRO_HOST || '127.0.0.1',
        NITRO_PORT: Number(parsedEnv.NITRO_PORT || 3002),
        PORT: Number(parsedEnv.NITRO_PORT || 3002),
        // Sinkronkan juga alias NUXT_ agar runtimeConfig selalu konsisten di Nitro production
        ...(parsedEnv.CRON_SECRET && !parsedEnv.NUXT_CRON_SECRET
          ? { NUXT_CRON_SECRET: parsedEnv.CRON_SECRET }
          : {}),
        ...(parsedEnv.DATABASE_URL && !parsedEnv.NUXT_DATABASE_URL
          ? { NUXT_DATABASE_URL: parsedEnv.DATABASE_URL }
          : {}),
        ...(parsedEnv.GEMINI_API_KEY && !parsedEnv.NUXT_GEMINI_API_KEY
          ? { NUXT_GEMINI_API_KEY: parsedEnv.GEMINI_API_KEY }
          : {}),
        ...(parsedEnv.NUXT_SESSION_PASSWORD
          ? { NUXT_SESSION_PASSWORD: parsedEnv.NUXT_SESSION_PASSWORD }
          : {}),
        ...(parsedEnv.GOOGLE_CLIENT_ID && !parsedEnv.NUXT_GOOGLE_CLIENT_ID
          ? { NUXT_GOOGLE_CLIENT_ID: parsedEnv.GOOGLE_CLIENT_ID }
          : {}),
        ...(parsedEnv.GOOGLE_CLIENT_SECRET && !parsedEnv.NUXT_GOOGLE_CLIENT_SECRET
          ? { NUXT_GOOGLE_CLIENT_SECRET: parsedEnv.GOOGLE_CLIENT_SECRET }
          : {}),
        ...(parsedEnv.GOOGLE_REDIRECT_URI && !parsedEnv.NUXT_GOOGLE_REDIRECT_URI
          ? { NUXT_GOOGLE_REDIRECT_URI: parsedEnv.GOOGLE_REDIRECT_URI }
          : {}),
      },
      out_file: '/var/log/sipena/sipena-out.log',
      error_file: '/var/log/sipena/sipena-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};

