// server/api/admin/scrapers/run.post.ts
import { createError, defineEventHandler, setResponseStatus } from 'h3';
import { ScraperRunTypeEnum } from '../../../../shared/enums/pdrb';
import { TriggerScraperSchema } from '../../../../shared/schemas/article.schema';
import {
  ScrapeConflictError,
  startScrapeJobInBackground,
} from '../../../services/scraper/pipeline';
import { parseBodyWithSchema } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  const adminUser = await requireAdminSession(event);
  const body = await parseBodyWithSchema(event, TriggerScraperSchema);

  try {
    const started = await startScrapeJobInBackground({
      runType: ScraperRunTypeEnum.MANUAL,
      mode: body.mode,
      triggeredBy: adminUser.id,
    });

    setResponseStatus(event, 202);
    return {
      accepted: true,
      mode: body.mode,
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

