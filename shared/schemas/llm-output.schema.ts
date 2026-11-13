// shared/schemas/llm-output.schema.ts
import { z } from 'zod';
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '../enums/pdrb';

export const GeographicScopeSchema = z.enum([
  'KTT_LOCAL',
  'KALTARA_PROVINCIAL',
  'NATIONAL_MACRO_IMPACT',
  'OTHER_REGION_IRRELEVANT',
]);

export type GeographicScope = z.infer<typeof GeographicScopeSchema>;

export const LlmClassificationRawSchema = z
  .object({
    geographic_scope: GeographicScopeSchema.meta({
      description:
        'Klasifikasi cakupan geografis fakta artikel: KTT_LOCAL (terjadi di Kab. Tana Tidung / Sesayap / Tideng Pale / Tana Lia / Betayau / Muruk Rian), KALTARA_PROVINCIAL (kebijakan/data Kalimantan Utara yang langsung berimbas ke KTT), NATIONAL_MACRO_IMPACT (kebijakan/komoditas acuan nasional relevan ke ekonomi KTT), atau OTHER_REGION_IRRELEVANT (peristiwa khusus kabupaten/kota/provinsi lain tanpa dampak langsung ke KTT).',
    }),
    is_economic_phenomenon: z.boolean().meta({
      description:
        'true apabila berita memuat fenomena ekonomi nyata (perubahan produksi, harga, investasi, konsumsi, fiskal, perdagangan) yang relevan bagi PDRB Kab. Tana Tidung (geographic_scope != OTHER_REGION_IRRELEVANT); false untuk berita lokal daerah lain, tarif/data historis statis tanpa perubahan, seremonial, kriminal, atau politik non-ekonomi.',
    }),
    rejection_reason: z.string().trim().max(300).nullable().meta({
      description:
        'Alasan singkat 1 kalimat bila is_economic_phenomenon = false; wajib null bila is_economic_phenomenon = true.',
    }),
    summary: z.string().trim().min(20).max(1500).meta({
      description:
        'Ringkasan komprehensif 3-5 kalimat bahasa Indonesia baku (50-110 kata) yang menguraikan peristiwa ekonomi utama, pelaku dan lokasi/kecamatan, besaran angka/harga/volume/anggaran jika ada, serta mekanisme dampaknya terhadap Lapangan Usaha dan Pengeluaran PDRB Kab. Tana Tidung.',
    }),
    kbli_category: z.enum(KbliCategoryEnum).nullable().meta({
      description:
        'Kode kategori KBLI 2025 (A s.d. V) sektor paling dominan terdampak; wajib null bila is_economic_phenomenon = false.',
    }),
    kbli_impact: z.enum(KbliImpactEnum).nullable().meta({
      description:
        'Arah dampak sisi Lapangan Usaha: INCREASE_NTB (Meningkatkan NTB), DECREASE_NTB (Menurunkan NTB), INCREASE_PRICE (Meningkatkan Harga), DECREASE_PRICE (Menurunkan Harga); null bila non-ekonomi.',
    }),
    expenditure_component: z.enum(ExpenditureComponentEnum).nullable().meta({
      description:
        'Komponen PDRB Pengeluaran utama terdampak: PK_RT, PK_LNPRT, PK_P, PMTB, INVENTORY_CHANGE, atau NET_EXPORT; null bila non-ekonomi.',
    }),
    expenditure_impact: z.enum(ExpenditureImpactEnum).nullable().meta({
      description:
        'Arah dampak sisi Pengeluaran: INCREASE_REAL (Meningkatkan Pengeluaran Riil), DECREASE_REAL (Menurunkan Pengeluaran Riil), INCREASE_DEFLATOR (Meningkatkan Indeks Harga/Deflator), DECREASE_DEFLATOR (Menurunkan Indeks Harga/Deflator); null bila non-ekonomi.',
    }),
    secondary_kbli_category: z.enum(KbliCategoryEnum).nullable().meta({
      description:
        'Kode kategori KBLI 2025 (A s.d. V) sektor sekunder yang terdampak secara nyata (inter-industry linkage); wajib null bila tidak ada keterkaitan sekunder atau bila non-ekonomi.',
    }),
    secondary_kbli_impact: z.enum(KbliImpactEnum).nullable().meta({
      description:
        'Arah dampak sisi Lapangan Usaha untuk sektor sekunder; wajib null bila secondary_kbli_category null.',
    }),
    secondary_expenditure_component: z.enum(ExpenditureComponentEnum).nullable().meta({
      description:
        'Komponen Pengeluaran sekunder terdampak; wajib null bila tidak ada dampak pengeluaran sekunder atau non-ekonomi.',
    }),
    secondary_expenditure_impact: z.enum(ExpenditureImpactEnum).nullable().meta({
      description:
        'Arah dampak sisi Pengeluaran untuk komponen sekunder; wajib null bila secondary_expenditure_component null.',
    }),
    quarter: z.number().int().min(1).max(4).meta({
      description: 'Triwulan periode fenomena ekonomi (1=Jan-Mar, 2=Apr-Jun, 3=Jul-Sep, 4=Okt-Des).',
    }),
    year: z.number().int().min(2000).max(2100).meta({
      description: 'Tahun 4 digit periode fenomena ekonomi.',
    }),
    confidence: z.number().min(0).max(1).meta({
      description: 'Tingkat keyakinan klasifikasi antara 0.0 hingga 1.0.',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.geographic_scope === 'OTHER_REGION_IRRELEVANT' && data.is_economic_phenomenon) {
      ctx.addIssue({
        code: 'custom',
        path: ['is_economic_phenomenon'],
        message:
          'Berita dengan geographic_scope OTHER_REGION_IRRELEVANT wajib memiliki is_economic_phenomenon = false.',
      });
    }

    if (data.is_economic_phenomenon) {
      if (!data.kbli_category) {
        ctx.addIssue({
          code: 'custom',
          path: ['kbli_category'],
          message: 'kbli_category wajib terisi ketika is_economic_phenomenon = true.',
        });
      }
      if (!data.kbli_impact) {
        ctx.addIssue({
          code: 'custom',
          path: ['kbli_impact'],
          message: 'kbli_impact wajib terisi ketika is_economic_phenomenon = true.',
        });
      }
      if (!data.expenditure_component) {
        ctx.addIssue({
          code: 'custom',
          path: ['expenditure_component'],
          message: 'expenditure_component wajib terisi ketika is_economic_phenomenon = true.',
        });
      }
      if (!data.expenditure_impact) {
        ctx.addIssue({
          code: 'custom',
          path: ['expenditure_impact'],
          message: 'expenditure_impact wajib terisi ketika is_economic_phenomenon = true.',
        });
      }
      if (data.secondary_kbli_category && !data.secondary_kbli_impact) {
        ctx.addIssue({
          code: 'custom',
          path: ['secondary_kbli_impact'],
          message: 'secondary_kbli_impact wajib terisi bila secondary_kbli_category diisi.',
        });
      }
      if (!data.secondary_kbli_category && data.secondary_kbli_impact) {
        ctx.addIssue({
          code: 'custom',
          path: ['secondary_kbli_impact'],
          message: 'secondary_kbli_impact harus null bila secondary_kbli_category tidak diisi.',
        });
      }
      if (data.secondary_expenditure_component && !data.secondary_expenditure_impact) {
        ctx.addIssue({
          code: 'custom',
          path: ['secondary_expenditure_impact'],
          message:
            'secondary_expenditure_impact wajib terisi bila secondary_expenditure_component diisi.',
        });
      }
      if (!data.secondary_expenditure_component && data.secondary_expenditure_impact) {
        ctx.addIssue({
          code: 'custom',
          path: ['secondary_expenditure_impact'],
          message:
            'secondary_expenditure_impact harus null bila secondary_expenditure_component tidak diisi.',
        });
      }
    } else {
      if (
        data.kbli_category !== null ||
        data.kbli_impact !== null ||
        data.expenditure_component !== null ||
        data.expenditure_impact !== null ||
        (data.secondary_kbli_category !== null && data.secondary_kbli_category !== undefined) ||
        (data.secondary_kbli_impact !== null && data.secondary_kbli_impact !== undefined) ||
        (data.secondary_expenditure_component !== null &&
          data.secondary_expenditure_component !== undefined) ||
        (data.secondary_expenditure_impact !== null &&
          data.secondary_expenditure_impact !== undefined)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['is_economic_phenomenon'],
          message:
            'Seluruh kolom klasifikasi PDRB harus null ketika is_economic_phenomenon = false.',
        });
      }
    }
  });

export type LlmClassificationOutput = z.infer<typeof LlmClassificationRawSchema>;

export const LLM_CLASSIFICATION_PROPERTY_ORDERING = [
  'geographic_scope',
  'is_economic_phenomenon',
  'rejection_reason',
  'summary',
  'kbli_category',
  'kbli_impact',
  'expenditure_component',
  'expenditure_impact',
  'secondary_kbli_category',
  'secondary_kbli_impact',
  'secondary_expenditure_component',
  'secondary_expenditure_impact',
  'quarter',
  'year',
  'confidence',
] as const;

const rawGeneratedClassificationJsonSchema = z.toJSONSchema(
  LlmClassificationRawSchema,
) as Record<string, unknown>;
const { $schema: _omitJsonSchemaDialect, ...baseGeneratedClassificationSchema } =
  rawGeneratedClassificationJsonSchema;

// Single Source of Truth: diterbitkan langsung dari LlmClassificationRawSchema melalui z.toJSONSchema()
// agar bebas schema drift; propertyOrdering memandu penalaran Gemini secara berurutan.
export const LLM_CLASSIFICATION_JSON_SCHEMA = {
  ...baseGeneratedClassificationSchema,
  additionalProperties: false,
  propertyOrdering: [...LLM_CLASSIFICATION_PROPERTY_ORDERING],
} as const;

export function buildOpenAiJsonSchemaResponseFormat() {
  const { propertyOrdering: _omitOrdering, ...strictSchema } = LLM_CLASSIFICATION_JSON_SCHEMA;
  return {
    type: 'json_schema' as const,
    json_schema: {
      name: 'sipena_classification',
      strict: true,
      schema: structuredClone(strictSchema) as Record<string, unknown>,
    },
  };
}
