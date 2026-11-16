// scripts/targeted-harvest-sectors.ts
import 'dotenv/config';
import { pool } from '../server/db';
import { runScrapePipeline } from '../server/services/scraper/pipeline';
import { REGIONAL_PORTALS } from '../server/services/scraper/portals';
import { buildScraperPipelineRuntimeOptions } from '../server/utils/llm-config';
import { ScraperRunTypeEnum } from '../shared/enums/pdrb';

async function main() {
  console.log('='.repeat(70));
  console.log('SIPENA KTT — TARGETED HARVEST SECTOR DATA GAPS (2026)');
  console.log('='.repeat(70));
  const activePortals = REGIONAL_PORTALS.filter((p) => p.isActive !== false);
  console.log(`Portals aktif: ${activePortals.length} portal regional Kaltara`);

  const runtimeOpts = buildScraperPipelineRuntimeOptions();

  try {
    const summary = await runScrapePipeline({
      runType: ScraperRunTypeEnum.MANUAL,
      mode: 'ALL',
      triggeredBy: null,
      startDate: new Date('2026-01-01T00:00:00+08:00'),
      endDate: new Date('2026-11-16T23:59:59+08:00'),
      maxArticlesPerRun: 40,
      fetchTimeoutMs: 14_000,
      maxDurationMs: 20 * 60 * 1000,
      ...runtimeOpts,
    });

    console.log('\nHASIL TARGETED HARVEST:');
    console.log(`Status             : ${summary.status}`);
    console.log(`Portals Checked    : ${summary.portalsChecked}`);
    console.log(`Articles Fetched   : ${summary.articlesFetched}`);
    console.log(`Articles Deduped   : ${summary.articlesDeduplicated}`);
    console.log(`Articles Inserted  : ${summary.articlesInserted}`);
    console.log(`Economic (Verified): ${summary.economicCount}`);
    console.log(`Ignored/Non-Econ   : ${summary.nonEconomicCount}`);
    console.log(`LLM Failed         : ${summary.llmFailedCount}`);
    console.log(`Duration           : ${(summary.durationMs / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error('Targeted Harvest Error:', err);
  } finally {
    await pool.end();
  }
}

void main();
