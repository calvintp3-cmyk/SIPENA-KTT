// server/db/run-migrate.mjs
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: 'server/db/migrations' });
  console.log('MIGRATION_SUCCESS');
} catch (err) {
  console.error('MIGRATION_FAILED:', err);
  process.exit(1);
} finally {
  await pool.end();
}
