// shared/schemas/synthesis.schema.ts
import { z } from 'zod';
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '../enums/pdrb';

const FORBIDDEN_URI_SCHEMES = /^\s*(javascript|data|vbscript|file):/i;

const safeCitationUrlSchema = z
  .string()
  .trim()
  .min(1, 'Referensi sumber wajib diisi')
  .max(2048)
  .refine(
    (val) => !FORBIDDEN_URI_SCHEMES.test(val),
    'Skema URL tidak diizinkan pada referensi sitasi',
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
  }, 'Format URL sitasi tidak valid');

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

export const SynthesisDimensionSchema = z.enum(['kbli', 'expenditure']);
export const SynthesisStyleSchema = z.enum(['BRS_FORMAL', 'EXECUTIVE_BRIEF', 'BULLET_POINTS']);
export const SynthesisGenerationModeSchema = z.enum(['gemini', 'llm', 'template']);

export const SynthesisCitationSchema = z.object({
  index: z.coerce.number().int().min(1).max(30),
  id: z.uuid('ID artikel sitasi harus UUID valid'),
  title: z.string().trim().min(1).max(500),
  sourcePortal: z.string().trim().min(1).max(160),
  publishedAt: z.string().trim().min(1).max(80),
  url: safeCitationUrlSchema,
  kbliCategory: z.enum(KbliCategoryEnum).nullable().optional().default(null),
  kbliImpact: z.enum(KbliImpactEnum).nullable().optional().default(null),
  expenditureComponent: z.enum(ExpenditureComponentEnum).nullable().optional().default(null),
  expenditureImpact: z.enum(ExpenditureImpactEnum).nullable().optional().default(null),
});

export const ListSynthesisDraftsQuerySchema = z.object({
  year: optionalPositiveInt(2000, 2100),
  quarter: optionalQuarter,
  dimension: z.preprocess(
    (v) => (v === '' || v === 'ALL' || v === null || v === undefined ? undefined : v),
    SynthesisDimensionSchema.optional(),
  ),
  targetCode: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const CreateSynthesisDraftSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  quarter: z.coerce
    .number()
    .int()
    .refine((v): v is 1 | 2 | 3 | 4 => v >= 1 && v <= 4, 'Triwulan harus 1 s.d. 4'),
  dimension: SynthesisDimensionSchema,
  targetCode: z.string().trim().min(1).max(40),
  targetLabel: z.string().trim().min(2).max(200),
  style: SynthesisStyleSchema.default('BRS_FORMAL'),
  title: z.string().trim().min(3, 'Judul draf minimal 3 karakter').max(250),
  narrativeMarkdown: z.string().trim().min(20, 'Konten narasi minimal 20 karakter').max(30000),
  generationMode: SynthesisGenerationModeSchema.default('template'),
  modelUsed: z.string().trim().max(120).nullable().optional().default(null),
  notice: z.string().trim().max(500).nullable().optional().default(null),
  citations: z.array(SynthesisCitationSchema).max(30).default([]),
  articleIds: z.array(z.uuid('ID artikel harus UUID valid')).max(30).default([]),
});

export const UpdateSynthesisDraftSchema = z
  .object({
    title: z.string().trim().min(3, 'Judul draf minimal 3 karakter').max(250).optional(),
    style: SynthesisStyleSchema.optional(),
    narrativeMarkdown: z.string().trim().min(20, 'Konten narasi minimal 20 karakter').max(30000).optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    'Minimal satu field pembaruan draf harus disediakan',
  );

export type SynthesisDimension = z.infer<typeof SynthesisDimensionSchema>;
export type SynthesisStyle = z.infer<typeof SynthesisStyleSchema>;
export type SynthesisGenerationMode = z.infer<typeof SynthesisGenerationModeSchema>;
export type ListSynthesisDraftsQuery = z.infer<typeof ListSynthesisDraftsQuerySchema>;
export type CreateSynthesisDraftInput = z.infer<typeof CreateSynthesisDraftSchema>;
export type UpdateSynthesisDraftInput = z.infer<typeof UpdateSynthesisDraftSchema>;

