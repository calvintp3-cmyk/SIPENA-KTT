// scripts/check-counts.ts
import 'dotenv/config';
import { pool } from '../server/db';

async function main() {
  const res = await pool.query(`
    SELECT quarter, year, count(*), count(*) FILTER (WHERE is_economic_phenomenon = true) as economic_count
    FROM articles
    GROUP BY quarter, year
    ORDER BY year DESC, quarter DESC
  `);
  console.log('ARTICLES_BY_QUARTER:');
  console.table(res.rows);
  await pool.end();
}

main().catch(console.error);
