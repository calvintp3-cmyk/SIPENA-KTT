// server/utils/request.ts
import {
  createError,
  getQuery,
  getRouterParam,
  readBody,
  type H3Event,
} from 'h3';
import { z, type ZodType } from 'zod';

const UUID_SCHEMA = z.uuid('ID parameter harus berupa UUID yang valid.');

export function getValidatedUuidParam(event: H3Event, paramName = 'id'): string {
  const raw = getRouterParam(event, paramName);
  const parsed = UUID_SCHEMA.safeParse(raw);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `Parameter "${paramName}" harus berupa UUID yang valid.`,
    });
  }
  return parsed.data;
}

export function parseQueryWithSchema<T>(event: H3Event, schema: ZodType<T>): T {
  const rawQuery = getQuery(event);
  const parsed = schema.safeParse(rawQuery);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: parsed.error.issues[0]?.message ?? 'Parameter query tidak valid.',
      data: {
        issues: parsed.error.issues,
      },
    });
  }
  return parsed.data;
}

export async function parseBodyWithSchema<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const rawBody = await readBody(event).catch(() => undefined);
  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: parsed.error.issues[0]?.message ?? 'Payload JSON tidak memenuhi validasi.',
      data: {
        issues: parsed.error.issues,
      },
    });
  }
  return parsed.data;
}

