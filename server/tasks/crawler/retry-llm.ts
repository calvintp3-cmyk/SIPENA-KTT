// server/tasks/crawler/retry-llm.ts
import { defineTask, useRuntimeConfig } from 'nitropack/runtime';
import {
  runRetryFailedLlmBatch,
  ScrapeConflictError,
  type RetryLlmSummary,
} from '../../services/scraper/pipeline';
import { buildScraperPipelineRuntimeOptions } from '../../utils/llm-config';

export type RetryLlmTaskResult =
  | { skipped: true; reason: string }
  | { skipped: false; summary: RetryLlmSummary };

export default defineTask<RetryLlmTaskResult>({
  meta: {
    name: 'crawler:retry-llm',
    description:
      'Memproses ulang artikel berstatus llm_status = FAILED menggunakan pipeline Multi-LLM (Gemini, Groq, OpenRouter) pada pukul 06:30 WITA.',
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
      const { routerOptions } = buildScraperPipelineRuntimeOptions(config);
      const summary = await runRetryFailedLlmBatch({ limit: 50, routerOptions });
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
