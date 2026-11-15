// scripts/backfill-historical-national.ts
import 'dotenv/config';
import { ScraperRunTypeEnum } from '../shared/enums/pdrb';
import { runScrapePipeline } from '../server/services/scraper/pipeline';
import { buildScraperPipelineRuntimeOptions } from '../server/utils/llm-config';
import { pool } from '../server/db';

async function main() {
  const args = process.argv.slice(2);
  const isPilot = args.includes('--pilot');
  const maxArg = args.find((a) => a.startsWith('--max='));
  const startArg = args.find((a) => a.startsWith('--start='));
  const endArg = args.find((a) => a.startsWith('--end='));
  const concurrencyArg = args.find((a) => a.startsWith('--concurrency='));
  const enableGdelt = args.includes('--enable-gdelt');

  const startDate = startArg
    ? new Date(startArg.split('=')[1] + 'T00:00:00+08:00')
    : new Date('2026-07-01T00:00:00+08:00');

  const endDate = endArg
    ? new Date(endArg.split('=')[1] + 'T23:59:59+08:00')
    : new Date('2026-11-14T23:59:59+08:00');

  const maxArticles = maxArg
    ? Number(maxArg.split('=')[1])
    : isPilot
      ? 15
      : 120;

  const concurrency = concurrencyArg
    ? Math.max(1, Math.min(6, Number(concurrencyArg.split('=')[1])))
    : 3;

  console.log('='.repeat(75));
  console.log('SIPENA KTT - HISTORICAL NATIONAL NEWS BACKFILL RUNNER');
  console.log('='.repeat(75));
  console.log(`Rentang Tanggal  : ${startDate.toISOString().slice(0, 10)} s.d. ${endDate.toISOString().slice(0, 10)}`);
  console.log(`Batas Artikel    : ${maxArticles} artikel (${isPilot ? 'MODE PILOT TEST' : 'MODE BATCH LENGKAP'})`);
  console.log(`Paralelisme      : ${concurrency} concurrent workers`);
  console.log(`GDELT Macro      : ${enableGdelt ? 'AKTIF' : 'NON-AKTIF (Google News + Bing News RSS Fokus)'}`);
  console.log(`Waktu Mulai      : ${new Date().toLocaleString('id-ID')}`);
  console.log('='.repeat(75));

  const runtimeOpts = buildScraperPipelineRuntimeOptions();

  try {
    const summary = await runScrapePipeline({
      runType: ScraperRunTypeEnum.MANUAL,
      mode: 'NATIONAL_ONLY',
      triggeredBy: null,
      startDate,
      endDate,
      maxArticlesPerRun: maxArticles,
      fetchTimeoutMs: 8_000,
      fetchConcurrency: concurrency,
      maxDurationMs: 15 * 60 * 1000, // 15 menit batas pengaman
      enableGdeltMacro: enableGdelt,
      ...runtimeOpts,
      routerOptions: {
        ...(runtimeOpts.routerOptions ?? {}),
        maxCallsPerRun: 3000,
      },
    });

    console.log('\n' + '='.repeat(75));
    console.log('HASIL EKSEKUSI HISTORICAL NATIONAL BACKFILL:');
    console.log('='.repeat(75));
    console.log(`Status                    : ${summary.status}`);
    console.log(`Kata Kunci Diperiksa      : ${summary.keywordsChecked}`);
    console.log(`Artikel Diserap (Fetch)   : ${summary.articlesFetched}`);
    console.log(`Artikel Terduplikasi (Skip): ${summary.articlesDeduplicated}`);
    console.log(`Artikel Baru Masuk DB     : ${summary.articlesInserted}`);
    console.log(`  - Fenomena Ekonomi KTT  : ${summary.economicCount}`);
    console.log(`  - Non-Ekonomi/Luar KTT  : ${summary.nonEconomicCount}`);
    console.log(`  - Gagal Klasifikasi AI  : ${summary.llmFailedCount}`);
    console.log(`Total Token AI Terpakai   : ${summary.totalTokens} tokens`);
    console.log(`Rata-rata Waktu Respons AI: ${summary.avgResponseTimeMs} ms`);
    console.log(`Durasi Total Eksekusi     : ${(summary.durationMs / 1000).toFixed(1)} detik`);
    console.log('='.repeat(75));

    // Cetak distribusi artikel nasional terkini di DB
    const dist = await pool.query(`
      SELECT 
        COUNT(*) as total_national,
        COUNT(CASE WHEN is_economic_phenomenon = true THEN 1 END) as econ,
        COUNT(CASE WHEN is_economic_phenomenon = false THEN 1 END) as non_econ
      FROM articles
      WHERE source_type = 'NATIONAL'
    `);
    console.log('\nDistribusi Berita Nasional di Database Saat Ini:');
    console.table(dist.rows);

    const kbliDist = await pool.query(`
      SELECT kbli_category, COUNT(*) as count
      FROM articles
      WHERE source_type = 'NATIONAL' AND is_economic_phenomenon = true
      GROUP BY kbli_category
      ORDER BY count DESC
    `);
    console.log('\nDistribusi KBLI 2025 Berita Nasional:');
    console.table(kbliDist.rows);
  } catch (err) {
    console.error('Fatal National Backfill Error:', err);
  } finally {
    await pool.end();
  }
}

main();
