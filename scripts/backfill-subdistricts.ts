// scripts/backfill-subdistricts.ts
import { eq, isNull } from 'drizzle-orm';
import { db, pool } from '../server/db';
import { articles } from '../server/db/schema';
import { detectKttSubdistrict } from '../server/services/scraper/geo-filter';

async function main() {
  console.log('--- Memulai Backfill Granularitas Lokus Kecamatan KTT ---');

  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      snippetText: articles.snippetText,
      subdistrict: articles.subdistrict,
    })
    .from(articles);

  console.log(`Total artikel yang diperiksa: ${rows.length}`);

  let updatedCount = 0;
  const distribution: Record<string, number> = {
    'Sesayap': 0,
    'Sesayap Hilir': 0,
    'Tana Lia': 0,
    'Betayau': 0,
    'Muruk Rian': 0,
    'Umum / Makro KTT': 0,
  };

  for (const row of rows) {
    const detected = detectKttSubdistrict(row.title, row.snippetText);
    if (detected) {
      distribution[detected] = (distribution[detected] || 0) + 1;
      if (row.subdistrict !== detected) {
        await db
          .update(articles)
          .set({ subdistrict: detected })
          .where(eq(articles.id, row.id));
        updatedCount += 1;
      }
    } else {
      distribution['Umum / Makro KTT'] = (distribution['Umum / Makro KTT'] || 0) + 1;
    }
  }

  console.log(`\nSelesai! Berhasil memperbarui ${updatedCount} artikel.`);
  console.log('Distribusi Lokus Kecamatan di Database:');
  for (const [dist, count] of Object.entries(distribution)) {
    console.log(` - ${dist}: ${count} berita`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('Backfill error:', err);
  process.exit(1);
});
