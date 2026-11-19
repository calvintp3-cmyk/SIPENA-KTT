// scripts/retest-tw4-articles.ts
import 'dotenv/config';
import { pool } from '../server/db';
import { runScrapePipeline } from '../server/services/scraper/pipeline';
import { REGIONAL_PORTALS } from '../server/services/scraper/portals';
import { buildScraperPipelineRuntimeOptions } from '../server/utils/llm-config';
import { extractArticleContent } from '../server/services/scraper/extractor';
import { detectKttSubdistrict } from '../server/services/scraper/geo-filter';
import { MultiLlmRouter } from '../server/services/llm/router';
import { mapClassificationToPersistence } from '../server/services/llm/classifier';
import { safeFetchText } from '../server/utils/ssrf';
import { formatDateTimeWita, getQuarterFromDateWita } from '../shared/utils/period';
import { ScraperRunTypeEnum } from '../shared/enums/pdrb';

interface ArticleRow {
  id: string;
  url: string;
  title: string;
  source_portal: string;
  source_type: string;
  snippet_text: string;
  word_count: number;
  published_at: Date;
  quarter: number;
  year: number;
  subdistrict: string | null;
  is_economic_phenomenon: boolean | null;
  kbli_category: string | null;
  expenditure_component: string | null;
}

async function asyncPool<T, R>(
  concurrency: number,
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      const item = items[idx];
      if (item !== undefined) {
        results[idx] = await fn(item, idx);
      }
    }
  });

  await Promise.all(workers);
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const action = args.find((a) => !a.startsWith('--')) ?? 'refetch-db';
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limitVal = limitArg ? limitArg.split('=')[1] : null;
  const limit = limitVal === 'all' ? null : limitVal ? Number(limitVal) : null;

  console.log('='.repeat(75));
  console.log('SIPENA KTT — UJI COBA ULANG SCRAPING & REKLASIFIKASI TRIWULAN IV 2026');
  console.log('Rentang Waktu : 01 Oktober 2026 s.d. 18 November 2026');
  console.log(`Mode Operasi  : ${action.toUpperCase()} ${dryRun ? '(DRY-RUN / PREVIEW)' : '(LIVE DATABASE)'}`);
  console.log(`Batasan Limit : ${limit ? `${limit} artikel` : 'Semua artikel dalam rentang'}`);
  console.log('='.repeat(75));

  // TAHAP 1: RE-FETCH FULL BODY & REKLASIFIKASI ARTIKEL EKSISTING DI DATABASE
  if (action === 'all' || action === 'refetch-db') {
    console.log('\n[MODE A] Memperbarui Naskah Utuh & Reklasifikasi Artikel Database TW IV 2026...');

    let query = `
      SELECT 
        id, url, title, source_portal, source_type, snippet_text, word_count,
        published_at, quarter, year, subdistrict, is_economic_phenomenon,
        kbli_category, expenditure_component
      FROM articles
      WHERE published_at >= '2026-10-01T00:00:00+08:00'
        AND published_at <= '2026-11-18T23:59:59+08:00'
      ORDER BY published_at DESC
    `;
    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const { rows } = await pool.query<ArticleRow>(query);
    console.log(`Ditemukan ${rows.length} artikel di database dalam rentang Triwulan IV 2026.\n`);

    if (rows.length > 0) {
      const runtimeOpts = buildScraperPipelineRuntimeOptions();
      const llmRouter = new MultiLlmRouter({
        task: 'classify',
        maxCallsPerRun: 1000,
        ...(runtimeOpts.routerOptions ?? {}),
      });

      let updatedCount = 0;
      let refetchedCount = 0;
      let lokusCorrectedCount = 0;
      let econFlippedCount = 0;

      await asyncPool(3, rows, async (row, idx) => {
        console.log(`[${idx + 1}/${rows.length}] "${row.title.slice(0, 52)}..."`);
        console.log(`    Portal: ${row.source_portal} | Kata lama: ${row.word_count}`);

        let fullText = row.snippet_text;

        // Ambil ulang naskah utuh dari URL aslinya dengan extractor baru
        try {
          const fetchRes = await safeFetchText(row.url, { timeoutMs: 12_000 });
          if (fetchRes.body) {
            const extracted = extractArticleContent(fetchRes.body, row.published_at, fetchRes.finalUrl);
            if (extracted.isValidContent && extracted.wordCount > row.word_count) {
              fullText = extracted.snippetText;
              refetchedCount += 1;
              console.log(`    [REFETCH] Berhasil! ${row.word_count} kata -> ${extracted.wordCount} kata utuh`);
            }
          }
        } catch {
          console.log(`    [REFETCH] URL tidak dapat dijangkau, menggunakan teks eksisting.`);
        }

        const newSubdistrict = detectKttSubdistrict(row.title, fullText);
        if (newSubdistrict !== row.subdistrict) {
          lokusCorrectedCount += 1;
          console.log(`    [LOKUS] Koreksi Kecamatan: ${row.subdistrict ?? 'None'} -> ${newSubdistrict ?? 'None'}`);
        }

        // Jalankan klasifikasi ulang AI dengan konteks teks utuh
        const period = getQuarterFromDateWita(row.published_at);
        const classificationRes = await llmRouter.classifyArticle({
          title: row.title,
          sourcePortal: row.source_portal,
          sourceType: row.source_type as any,
          publishedAtWita: formatDateTimeWita(row.published_at),
          defaultQuarter: period.quarter,
          defaultYear: period.year,
          snippetText: fullText,
        });

        if (classificationRes.ok) {
          const mapped = mapClassificationToPersistence(
            classificationRes.classification,
            classificationRes.modelUsed,
            fullText,
          );

          if (mapped.isEconomicPhenomenon !== row.is_economic_phenomenon) {
            econFlippedCount += 1;
          }

          console.log(
            `    [AI EVAL] Sektor: ${mapped.kbliCategory ?? 'None'} | Pengeluaran: ${mapped.expenditureComponent ?? 'None'} | Fenomena: ${mapped.isEconomicPhenomenon ? 'YA' : 'TIDAK'} (${classificationRes.modelUsed})`,
          );

          if (!dryRun) {
            await pool.query(
              `UPDATE articles SET
                snippet_text = $1,
                word_count = $2,
                subdistrict = $3,
                is_economic_phenomenon = $4,
                summary = $5,
                kbli_category = $6,
                kbli_impact = $7,
                expenditure_component = $8,
                expenditure_impact = $9,
                secondary_kbli_category = $10,
                secondary_kbli_impact = $11,
                secondary_expenditure_component = $12,
                secondary_expenditure_impact = $13,
                llm_model = $14,
                llm_status = $15,
                updated_at = NOW()
              WHERE id = $16`,
              [
                fullText,
                fullText.split(/\s+/).filter(Boolean).length,
                newSubdistrict,
                mapped.isEconomicPhenomenon,
                mapped.summary,
                mapped.kbliCategory,
                mapped.kbliImpact,
                mapped.expenditureComponent,
                mapped.expenditureImpact,
                mapped.secondaryKbliCategory,
                mapped.secondaryKbliImpact,
                mapped.secondaryExpenditureComponent,
                mapped.secondaryExpenditureImpact,
                mapped.llmModel,
                mapped.llmStatus,
                row.id,
              ],
            );
            updatedCount += 1;
          }
        }
        console.log('');
      });

      console.log('='.repeat(75));
      console.log('REKAPITULASI HASIL MODE A:');
      console.log(`Total Artikel Dievaluasi     : ${rows.length}`);
      console.log(`Artikel Bertambah Teks Utuh  : ${refetchedCount}`);
      console.log(`Koreksi Lokus Kecamatan      : ${lokusCorrectedCount}`);
      console.log(`Perubahan Status Fenomena    : ${econFlippedCount}`);
      console.log(`Artikel Tersimpan ke Database: ${dryRun ? '0 (DRY-RUN)' : updatedCount}`);
      console.log('='.repeat(75));
    }
  }

  // TAHAP 2: LIVE HARVESTING ULANG DARI SELURUH PORTAL (1 OKT - 18 NOV 2026)
  if (action === 'all' || action === 'live-harvest') {
    console.log('\n[TAHAP 2] Menjalankan Live Harvest Baru ke Seluruh Portal (01 Okt - 18 Nov 2026)...');
    const activePortals = REGIONAL_PORTALS.filter((p) => p.isActive !== false);
    console.log(`Menyisir ${activePortals.length} portal regional dan Google/Bing News macro nasional.`);

    const runtimeOpts = buildScraperPipelineRuntimeOptions();
    try {
      const summary = await runScrapePipeline({
        runType: ScraperRunTypeEnum.MANUAL,
        mode: 'ALL',
        startDate: new Date('2026-10-01T00:00:00+08:00'),
        endDate: new Date('2026-11-18T23:59:59+08:00'),
        maxArticlesPerRun: limit,
        fetchTimeoutMs: 14_000,
        maxDurationMs: 15 * 60 * 1000,
        ...runtimeOpts,
      });

      console.log('\nHASIL LIVE HARVEST:');
      console.log(`Status            : ${summary.status}`);
      console.log(`Portal Diperiksa  : ${summary.portalsChecked}`);
      console.log(`Artikel Diunduh   : ${summary.articlesFetched}`);
      console.log(`Artikel Baru (DB) : ${summary.articlesInserted}`);
      console.log(`Artikel Duplikat  : ${summary.articlesDeduplicated}`);
      console.log(`Fenomena Ekonomi  : ${summary.economicCount}`);
      console.log(`Bukan Ekonomi     : ${summary.nonEconomicCount}`);
      console.log(`LLM Gagal         : ${summary.llmFailedCount}`);
      console.log(`Durasi            : ${(summary.durationMs / 1000).toFixed(1)}s`);
    } catch (err) {
      console.error('Live Harvest Error:', err);
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
