// server/api/cron/trigger.post.ts
import {
  createError,
  defineEventHandler,
  getRequestHeader,
  readBody,
  setResponseStatus,
} from 'h3';
import { z } from 'zod';
import { ScraperRunTypeEnum } from '../../../shared/enums/pdrb';
import {
  ScrapeConflictError,
  startRetryFailedLlmInBackground,
  startScrapeJobInBackground,
} from '../../services/scraper/pipeline';
import { verifyCronSecret } from '../../utils/cron-secret';
import { buildScraperPipelineRuntimeOptions } from '../../utils/llm-config';

const CronTriggerBodySchema = z
  .object({
    job: z.enum(['daily', 'retry-llm']).default('daily'),
    mode: z.enum(['ALL', 'REGIONAL_ONLY', 'NATIONAL_ONLY']).default('ALL'),
  })
  .default({ job: 'daily', mode: 'ALL' });

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const providedSecret = getRequestHeader(event, 'x-cron-secret');

  if (!verifyCronSecret(providedSecret, config.cronSecret)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Header x-cron-secret tidak valid atau belum dikonfigurasi.',
    });
  }

  const rawBody = await readBody(event).catch(() => undefined);
  const parsed = CronTriggerBodySchema.safeParse(rawBody ?? {});
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: parsed.error.issues[0]?.message ?? 'Payload cron trigger tidak valid.',
    });
  }

  const runtimeOptions = buildScraperPipelineRuntimeOptions(config);

  try {
    setResponseStatus(event, 202);
    if (parsed.data.job === 'retry-llm') {
      const started = await startRetryFailedLlmInBackground({
        limit: 50,
        routerOptions: runtimeOptions.routerOptions,
      });
      return {
        accepted: true,
        job: 'retry-llm',
        ...started,
      };
    }

    const started = await startScrapeJobInBackground({
      runType: ScraperRunTypeEnum.SCHEDULED,
      mode: parsed.data.mode,
      ...runtimeOptions,
    });
    return {
      accepted: true,
      job: 'daily',
      mode: parsed.data.mode,
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

