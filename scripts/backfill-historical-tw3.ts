// scripts/backfill-historical-tw3.ts
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

  const startDate = startArg
    ? new Date(startArg.split('=')[1] + 'T00:00:00+08:00')
    : new Date('2026-07-01T00:00:00+08:00');

  const endDate = endArg
    ? new Date(endArg.split('=')[1] + 'T23:59:59+08:00')
    : new Date('2026-11-14T23:59:59+08:00');

  const maxArticles = maxArg
    ? Number(maxArg.split('=')[1])
    : isPilot
      ? 20
      : 100;

  console.log('='.repeat(70));
  console.log('SIPENA KTT - HISTORICAL BACKFILL RUNNER');
  console.log('='.repeat(70));
  console.log(`Rentang Tanggal : ${startDate.toISOString().slice(0, 10)} s.d. ${endDate.toISOString().slice(0, 10)}`);
  console.log(`Batas Artikel   : ${maxArticles} artikel (${isPilot ? 'MODE PILOT TEST' : 'MODE BATCH'})`);
  console.log(`Waktu Mulai     : ${new Date().toLocaleString('id-ID')}`);
  console.log('='.repeat(70));

  const runtimeOpts = buildScraperPipelineRuntimeOptions();

  try {
    const summary = await runScrapePipeline({
      runType: ScraperRunTypeEnum.MANUAL,
      mode: 'REGIONAL_ONLY',
      triggeredBy: null,
      startDate,
      endDate,
      maxArticlesPerRun: maxArticles,
      maxDurationMs: 25 * 60 * 1000, // 25 minutes
      ...runtimeOpts,
    });

    console.log('\n' + '='.repeat(70));
    console.log('HASIL EKSEKUSI HISTORICAL BACKFILL:');
    console.log('='.repeat(70));
    console.log(`Status                  : ${summary.status}`);
    console.log(`Portal Diperiksa        : ${summary.portalsChecked}`);
    console.log(`Artikel Diserap (Fetch) : ${summary.articlesFetched}`);
    console.log(`Artikel Terduplikasi    : ${summary.articlesDeduplicated}`);
    console.log(`Artikel Masuk DB        : ${summary.articlesInserted}`);
    console.log(`  - Fenomena Ekonomi    : ${summary.economicCount}`);
    console.log(`  - Non-Ekonomi/Lainnya : ${summary.nonEconomicCount}`);
    console.log(`  - LLM Gagal/Timeout   : ${summary.llmFailedCount}`);
    console.log(`Total Token AI          : ${summary.totalTokens} tokens`);
    console.log(`Durasi Eksekusi         : ${(summary.durationMs / 1000).toFixed(1)} detik`);
    console.log('='.repeat(70));
  } catch (err) {
    console.error('Backfill Error:', err);
  } finally {
    await pool.end();
  }
}

main();
