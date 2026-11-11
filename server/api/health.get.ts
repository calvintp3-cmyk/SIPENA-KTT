// server/api/health.get.ts
import { sql } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { db } from '../db';

export default defineEventHandler(async () => {
  const startMs = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - startMs;
    return {
      status: 'ok',
      service: 'sipena-ktt',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      db: {
        connected: true,
        latencyMs,
      },
    };
  } catch (err) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      message: 'Koneksi ke database PostgreSQL tidak tersedia.',
      data: {
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
});

