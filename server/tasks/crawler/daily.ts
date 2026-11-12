// server/tasks/crawler/daily.ts
import { defineTask } from 'nitropack/runtime';
import { useRuntimeConfig } from 'nitropack/runtime';
import { ScraperRunTypeEnum } from '../../../shared/enums/pdrb';
import {
  runScrapePipeline,
  ScrapeConflictError,
  type ScrapeRunSummary,
} from '../../services/scraper/pipeline';
import { buildScraperPipelineRuntimeOptions } from '../../utils/llm-config';

export type DailyCrawlerTaskResult =
  | { skipped: true; reason: string }
  | { skipped: false; summary: ScrapeRunSummary };

export default defineTask<DailyCrawlerTaskResult>({
  meta: {
    name: 'crawler:daily',
    description:
      'Menjalankan crawler berita harian SIPENA KTT (4 portal regional + Bing/Google News nasional + geo filter) & klasifikasi Multi-LLM (Gemini, Groq, OpenRouter) pada 04:00 WITA.',
  },
  async run() {
    const config = useRuntimeConfig();
    if (!config.enableNitroCron) {
      return {
        result: {
          skipped: true,
          reason: 'ENABLE_NITRO_CRON=false',
        },
      };
    }

    try {
      const summary = await runScrapePipeline({
        runType: ScraperRunTypeEnum.SCHEDULED,
        mode: 'ALL',
        ...buildScraperPipelineRuntimeOptions(config),
      });
      return {
        result: {
          skipped: false,
          summary,
        },
      };
    } catch (err) {
      if (err instanceof ScrapeConflictError) {
        return {
          result: {
            skipped: true,
            reason: err.message,
          },
        };
      }
      throw err;
    }
  },
});
