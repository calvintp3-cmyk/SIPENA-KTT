// server/api/admin/scrapers/retry-llm.post.ts
import { createError, defineEventHandler, setResponseStatus } from 'h3';
import {
  ScrapeConflictError,
  startRetryFailedLlmInBackground,
} from '../../../services/scraper/pipeline';
import { buildScraperPipelineRuntimeOptions } from '../../../utils/llm-config';
import { requireAdminSession } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  const adminUser = await requireAdminSession(event);
  const runtimeCfg = useRuntimeConfig(event);
  const { routerOptions } = buildScraperPipelineRuntimeOptions(runtimeCfg);

  try {
    const started = await startRetryFailedLlmInBackground({
      triggeredBy: adminUser.id,
      limit: 50,
      routerOptions,
    });

    setResponseStatus(event, 202);
    return {
      accepted: true,
      ...started,
    };
  } catch (err) {
    if (err instanceof ScrapeConflictError) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: err.message,
      });
    }
    throw err;
  }
});

