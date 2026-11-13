// server/db/run-migrate.mjs
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

try {
  // Rekonsiliasi riwayat migrasi 0005 jika kolom sudah ada di DB fisik
  const check005 = await pool.query(
    "SELECT id FROM drizzle.__drizzle_migrations WHERE created_at = '1794548661925'",
  );
  if (check005.rows.length === 0) {
    console.log('Merekam 0005_gigantic_anita_blake ke drizzle.__drizzle_migrations...');
    await pool.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
      ['49c770354b6b40013d0ff08e51df3f21bbd2c51fcdc69ead57da4b3c93cdcff0', '1794548661925'],
    );
  }

  console.log('Menjalankan Drizzle ORM migrator...');
  await migrate(db, { migrationsFolder: 'server/db/migrations' });
  console.log('MIGRATION_SUCCESS');
} catch (err) {
  console.error('MIGRATION_FAILED:', err);
  process.exit(1);
} finally {
  await pool.end();
}
