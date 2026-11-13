// server/api/health.get.ts
import { sql } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { db } from '../db';

export default defineEventHandler(async () => {
  const startMs = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - startMs;
    const mem = process.memoryUsage();
    return {
      status: 'ok',
      service: 'sipena-ktt',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: {
        rss: Math.round(mem.rss / (1024 * 1024)),
        heapUsed: Math.round(mem.heapUsed / (1024 * 1024)),
        heapTotal: Math.round(mem.heapTotal / (1024 * 1024)),
      },
      db: {
        connected: true,
        latencyMs,
      },
    };
  } catch (err) {
    console.error('[Health] PostgreSQL connection check failed:', err);
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      message: 'Koneksi ke database PostgreSQL tidak tersedia.',
    });
  }
});

