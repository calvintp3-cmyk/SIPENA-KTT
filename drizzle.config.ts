// drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Fallback URL tanpa kredensial hanya dipakai saat `drizzle-kit generate` offline;
    // eksekusi `drizzle-kit migrate` wajib menyetel DATABASE_URL pada .env.
    url: process.env.DATABASE_URL || 'postgresql://127.0.0.1:5432/sipena_ktt',
  },
  verbose: true,
  strict: true,
});

