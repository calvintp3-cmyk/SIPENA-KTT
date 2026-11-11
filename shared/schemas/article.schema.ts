// shared/schemas/article.schema.ts
import { z } from 'zod';
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
  LlmStatusEnum,
  VerificationStatusEnum,
} from '../enums/pdrb';
import { parseWitaDateBoundary } from '../utils/period';

const optionalPositiveInt = (min: number, max: number) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().min(min).max(max).optional(),
  );

const optionalQuarter = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.coerce
    .number()
    .int()
    .refine((v): v is 1 | 2 | 3 | 4 => v >= 1 && v <= 4, 'Triwulan harus 1 s.d. 4')
    .optional(),
);

const optionalEnum = <T extends Record<string, string>>(enumObj: T) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.nativeEnum(enumObj).optional(),
  );

const optionalDateStr = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z
    .string()
    .trim()
    .refine((val) => {
      try {
        parseWitaDateBoundary(val, 'start');
        return true;
      } catch {
        return false;
      }
    }, 'Format tanggal harus YYYY-MM-DD yang valid')
    .optional(),
);

export const PublicOverviewQuerySchema = z.object({
  year: optionalPositiveInt(2000, 2100),
  quarter: optionalQuarter,
});

export const PublicArticlesQuerySchema = z.object({
  year: optionalPositiveInt(2000, 2100),
  quarter: optionalQuarter,
  kbli: optionalEnum(KbliCategoryEnum),
  expenditure: optionalEnum(ExpenditureComponentEnum),
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const AdminArticlesQuerySchema = z.object({
  status: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.nativeEnum(VerificationStatusEnum).optional(),
  ),
  llmStatus: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.nativeEnum(LlmStatusEnum).optional(),
  ),
  isEconomic: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.enum(['true', 'false']).optional(),
  ),
  year: optionalPositiveInt(2000, 2100),
  quarter: optionalQuarter,
  kbli: optionalEnum(KbliCategoryEnum),
  expenditure: optionalEnum(ExpenditureComponentEnum),
  portal: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  from: optionalDateStr,
  to: optionalDateStr,
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const ExportArticlesQuerySchema = z.object({
  format: z.enum(['xlsx', 'csv']).default('xlsx'),
  status: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.nativeEnum(VerificationStatusEnum).optional(),
  ),
  llmStatus: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.nativeEnum(LlmStatusEnum).optional(),
  ),
  isEconomic: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.enum(['true', 'false']).optional(),
  ),
  year: optionalPositiveInt(2000, 2100),
  quarter: optionalQuarter,
  kbli: optionalEnum(KbliCategoryEnum),
  expenditure: optionalEnum(ExpenditureComponentEnum),
  portal: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  from: optionalDateStr,
  to: optionalDateStr,
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});

const FORBIDDEN_URI_SCHEMES = /^\s*(javascript|data|vbscript|file):/i;

export const CreateManualArticleSchema = z.object({
  title: z.string().trim().min(5, 'Judul berita minimal 5 karakter').max(500),
  url: z
    .string()
    .trim()
    .min(3, 'URL atau referensi sumber wajib diisi')
    .max(2048)
    .refine(
      (val) => !FORBIDDEN_URI_SCHEMES.test(val),
      'Skema URL tidak diizinkan (gunakan http://, https://, atau referensi teks biasa)',
    )
    .refine((val) => {
      if (/^https?:\/\//i.test(val)) {
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      }
      return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(val);
    }, 'Format URL tidak valid'),
  sourcePortal: z.string().trim().min(2).max(120).default('Input Manual'),
  publishedAt: z
    .string()
    .trim()
    .refine((val) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        try {
          parseWitaDateBoundary(val, 'start');
          return true;
        } catch {
          return false;
        }
      }
      const d = new Date(val);
      return !Number.isNaN(d.getTime());
    }, 'Tanggal rilis berita tidak valid'),
  snippetText: z.string().trim().min(15, 'Cuplikan atau uraian sumber minimal 15 karakter').max(5000),
  summary: z.string().trim().min(15, 'Ringkasan berita minimal 15 karakter').max(1200),
  kbliCategory: z.nativeEnum(KbliCategoryEnum),
  kbliImpact: z.nativeEnum(KbliImpactEnum),
  expenditureComponent: z.nativeEnum(ExpenditureComponentEnum),
  expenditureImpact: z.nativeEnum(ExpenditureImpactEnum),
  quarter: optionalQuarter,
  year: optionalPositiveInt(2000, 2100),
  verifyImmediately: z.boolean().optional().default(true),
});

export const UpdateArticleReviewSchema = z
  .object({
    title: z.string().trim().min(5, 'Judul minimal 5 karakter').max(500).optional(),
    summary: z.string().trim().min(10, 'Ringkasan minimal 10 karakter').max(1200).nullable().optional(),
    isEconomicPhenomenon: z.boolean().nullable().optional(),
    kbliCategory: z.nativeEnum(KbliCategoryEnum).nullable().optional(),
    kbliImpact: z.nativeEnum(KbliImpactEnum).nullable().optional(),
    expenditureComponent: z.nativeEnum(ExpenditureComponentEnum).nullable().optional(),
    expenditureImpact: z.nativeEnum(ExpenditureImpactEnum).nullable().optional(),
    quarter: optionalQuarter,
    year: optionalPositiveInt(2000, 2100),
    verificationStatus: z.nativeEnum(VerificationStatusEnum).optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    'Minimal satu field pembaruan harus disediakan',
  );

export const BatchArticleActionSchema = z.object({
  ids: z.array(z.string().uuid('ID artikel harus berupa UUID valid')).min(1).max(100),
  action: z.enum(['VERIFY', 'IGNORE']),
});

export const TriggerScraperSchema = z.object({
  mode: z.enum(['ALL', 'REGIONAL_ONLY', 'NATIONAL_ONLY']).default('ALL'),
});

export const ScraperLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type PublicOverviewQuery = z.infer<typeof PublicOverviewQuerySchema>;
export type PublicArticlesQuery = z.infer<typeof PublicArticlesQuerySchema>;
export type AdminArticlesQuery = z.infer<typeof AdminArticlesQuerySchema>;
export type ExportArticlesQuery = z.infer<typeof ExportArticlesQuerySchema>;
export type CreateManualArticleInput = z.infer<typeof CreateManualArticleSchema>;
export type UpdateArticleReviewInput = z.infer<typeof UpdateArticleReviewSchema>;
export type BatchArticleActionInput = z.infer<typeof BatchArticleActionSchema>;
export type TriggerScraperInput = z.infer<typeof TriggerScraperSchema>;
export type ScraperLogsQuery = z.infer<typeof ScraperLogsQuerySchema>;
