// shared/schemas/article.schema.ts
import { z } from 'zod';
import {
  ArticleSourceTypeEnum,
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
    z.enum(enumObj).optional(),
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

export const ImpactMacroFilterSchema = z.enum([
  'EXPANSION',
  'CONTRACTION',
  'PRICE_UP',
  'PRICE_DOWN',
]);

export type ImpactMacroFilter = z.infer<typeof ImpactMacroFilterSchema>;

export const GeographicScopeFilterSchema = z.enum([
  'KTT_LOCAL',
  'KALTARA_PROVINCIAL',
  'NATIONAL_MACRO_IMPACT',
  'OTHER_REGION_IRRELEVANT',
]);

export type GeographicScopeFilter = z.infer<typeof GeographicScopeFilterSchema>;

export const PublicOverviewQuerySchema = z.object({
  year: optionalPositiveInt(2000, 2100),
  quarter: optionalQuarter,
});

export const PublicArticlesQuerySchema = z.object({
  year: optionalPositiveInt(2000, 2100),
  quarter: optionalQuarter,
  kbli: optionalEnum(KbliCategoryEnum),
  pdrbGroup: z.preprocess(
    (v) => (v === '' || v === 'ALL' || v === null || v === undefined ? undefined : String(v).trim()),
    z.string().max(16).optional(),
  ),
  expenditure: optionalEnum(ExpenditureComponentEnum),
  sourceType: z.preprocess(
    (v) => (v === '' || v === 'ALL' || v === null || v === undefined ? undefined : v),
    z.enum(ArticleSourceTypeEnum).optional(),
  ),
  geographicScope: z.preprocess(
    (v) => (v === '' || v === 'ALL' || v === null || v === undefined ? undefined : v),
    GeographicScopeFilterSchema.optional(),
  ),
  impactMacro: z.preprocess(
    (v) => (v === '' || v === 'ALL' || v === null || v === undefined ? undefined : v),
    ImpactMacroFilterSchema.optional(),
  ),
  sort: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.enum(['newest', 'oldest', 'sector']).default('newest'),
  ),
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const AdminDashboardQuerySchema = z.object({
  year: optionalPositiveInt(2000, 2100),
  quarter: optionalQuarter,
});

export const AdminTrendsQuerySchema = z.object({
  year: optionalPositiveInt(2000, 2100),
  quarter: optionalQuarter,
  mode: z.enum(['qoq', 'yoy']).default('qoq'),
  dimension: z.enum(['kbli', 'expenditure']).default('kbli'),
});

export const SynthesisGenerateSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  quarter: z.coerce
    .number()
    .int()
    .refine((v): v is 1 | 2 | 3 | 4 => v >= 1 && v <= 4, 'Triwulan harus 1 s.d. 4'),
  dimension: z.enum(['kbli', 'expenditure']),
  targetCode: z.string().trim().min(1).max(40),
  style: z.enum(['BRS_FORMAL', 'EXECUTIVE_BRIEF', 'BULLET_POINTS']).default('BRS_FORMAL'),
  articleIds: z
    .array(z.uuid('ID artikel harus UUID valid'))
    .min(1, 'Pilih minimal 1 artikel terverifikasi sebagai bahan sintesis')
    .max(30),
  stream: z.boolean().optional().default(false),
});

export const AdminArticlesQuerySchema = z.object({
  status: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.enum(VerificationStatusEnum).optional(),
  ),
  llmStatus: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.enum(LlmStatusEnum).optional(),
  ),
  isEconomic: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.enum(['true', 'false']).optional(),
  ),
  sourceType: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.enum(ArticleSourceTypeEnum).optional(),
  ),
  geographicScope: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    GeographicScopeFilterSchema.optional(),
  ),
  year: optionalPositiveInt(2000, 2100),
  quarter: optionalQuarter,
  kbli: optionalEnum(KbliCategoryEnum),
  kbliImpact: optionalEnum(KbliImpactEnum),
  pdrbGroup: z.preprocess(
    (v) => (v === '' || v === 'ALL' || v === null || v === undefined ? undefined : String(v).trim()),
    z.string().max(16).optional(),
  ),
  expenditure: optionalEnum(ExpenditureComponentEnum),
  expenditureImpact: optionalEnum(ExpenditureImpactEnum),
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
    z.enum(VerificationStatusEnum).optional(),
  ),
  llmStatus: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.enum(LlmStatusEnum).optional(),
  ),
  isEconomic: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.enum(['true', 'false']).optional(),
  ),
  sourceType: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    z.enum(ArticleSourceTypeEnum).optional(),
  ),
  geographicScope: z.preprocess(
    (v) => (v === '' || v === 'ALL' ? undefined : v),
    GeographicScopeFilterSchema.optional(),
  ),
  year: optionalPositiveInt(2000, 2100),
  quarter: optionalQuarter,
  kbli: optionalEnum(KbliCategoryEnum),
  kbliImpact: optionalEnum(KbliImpactEnum),
  pdrbGroup: z.preprocess(
    (v) => (v === '' || v === 'ALL' || v === null || v === undefined ? undefined : String(v).trim()),
    z.string().max(16).optional(),
  ),
  expenditure: optionalEnum(ExpenditureComponentEnum),
  expenditureImpact: optionalEnum(ExpenditureImpactEnum),
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
  kbliCategory: z.enum(KbliCategoryEnum),
  kbliImpact: z.enum(KbliImpactEnum),
  expenditureComponent: z.enum(ExpenditureComponentEnum),
  expenditureImpact: z.enum(ExpenditureImpactEnum),
  quarter: optionalQuarter,
  year: optionalPositiveInt(2000, 2100),
  verifyImmediately: z.boolean().optional().default(true),
});

export const UpdateArticleReviewSchema = z
  .object({
    title: z.string().trim().min(5, 'Judul minimal 5 karakter').max(500).optional(),
    summary: z.string().trim().min(10, 'Ringkasan minimal 10 karakter').max(1200).nullable().optional(),
    isEconomicPhenomenon: z.boolean().nullable().optional(),
    kbliCategory: z.enum(KbliCategoryEnum).nullable().optional(),
    kbliImpact: z.enum(KbliImpactEnum).nullable().optional(),
    expenditureComponent: z.enum(ExpenditureComponentEnum).nullable().optional(),
    expenditureImpact: z.enum(ExpenditureImpactEnum).nullable().optional(),
    quarter: optionalQuarter,
    year: optionalPositiveInt(2000, 2100),
    verificationStatus: z.enum(VerificationStatusEnum).optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    'Minimal satu field pembaruan harus disediakan',
  );

export const BatchArticleActionSchema = z.object({
  ids: z.array(z.uuid('ID artikel harus berupa UUID valid')).min(1).max(100),
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
export type AdminDashboardQuery = z.infer<typeof AdminDashboardQuerySchema>;
export type AdminTrendsQuery = z.infer<typeof AdminTrendsQuerySchema>;
export type SynthesisGenerateInput = z.infer<typeof SynthesisGenerateSchema>;
export type AdminArticlesQuery = z.infer<typeof AdminArticlesQuerySchema>;
export type ExportArticlesQuery = z.infer<typeof ExportArticlesQuerySchema>;
export type CreateManualArticleInput = z.infer<typeof CreateManualArticleSchema>;
export type UpdateArticleReviewInput = z.infer<typeof UpdateArticleReviewSchema>;
export type BatchArticleActionInput = z.infer<typeof BatchArticleActionSchema>;
export type TriggerScraperInput = z.infer<typeof TriggerScraperSchema>;
export type ScraperLogsQuery = z.infer<typeof ScraperLogsQuerySchema>;
