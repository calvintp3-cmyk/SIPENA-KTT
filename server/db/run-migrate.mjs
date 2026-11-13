// server/db/run-migrate.mjs
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const schemas = await pool.query(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name LIKE '%migration%'`);
  console.log('MIGRATION TABLES:', schemas.rows);

  for (const row of schemas.rows) {
    const data = await pool.query(`SELECT * FROM "${row.table_schema}"."${row.table_name}" ORDER BY created_at ASC`);
    console.log(`DATA IN ${row.table_schema}.${row.table_name}:`, data.rows);
  }
} catch (err) {
  console.error('ERROR:', err);
} finally {
  await pool.end();
}
