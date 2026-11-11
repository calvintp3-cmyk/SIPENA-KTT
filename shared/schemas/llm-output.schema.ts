// shared/schemas/llm-output.schema.ts
import { z } from 'zod';
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '../enums/pdrb';

export const LlmClassificationRawSchema = z
  .object({
    is_economic_phenomenon: z.boolean(),
    rejection_reason: z.string().trim().max(300).nullable(),
    summary: z.string().trim().min(20).max(1500),
    kbli_category: z.nativeEnum(KbliCategoryEnum).nullable(),
    kbli_impact: z.nativeEnum(KbliImpactEnum).nullable(),
    expenditure_component: z.nativeEnum(ExpenditureComponentEnum).nullable(),
    expenditure_impact: z.nativeEnum(ExpenditureImpactEnum).nullable(),
    quarter: z.number().int().min(1).max(4),
    year: z.number().int().min(2000).max(2100),
    confidence: z.number().min(0).max(1),
  })
  .superRefine((data, ctx) => {
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
    } else {
      if (
        data.kbli_category !== null ||
        data.kbli_impact !== null ||
        data.expenditure_component !== null ||
        data.expenditure_impact !== null
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['is_economic_phenomenon'],
          message: 'Seluruh kolom klasifikasi PDRB harus null ketika is_economic_phenomenon = false.',
        });
      }
    }
  });

export type LlmClassificationOutput = z.infer<typeof LlmClassificationRawSchema>;

// JSON Schema eksplisit untuk `response_format` Gemini Interactions API
// (kompatibel penuh dengan subset JSON Schema Gemini Structured Outputs)
export const LLM_CLASSIFICATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    is_economic_phenomenon: {
      type: 'boolean',
      description:
        'true apabila berita memuat fenomena ekonomi nyata (produksi, harga, investasi, konsumsi, fiskal, perdagangan) yang relevan bagi PDRB Kab. Tana Tidung; false untuk berita seremonial/kriminal/politik non-ekonomi.',
    },
    rejection_reason: {
      type: ['string', 'null'],
      description:
        'Alasan singkat 1 kalimat bila is_economic_phenomenon = false; wajib null bila is_economic_phenomenon = true.',
    },
    summary: {
      type: 'string',
      description:
        'Ringkasan komprehensif 3-5 kalimat bahasa Indonesia baku (50-110 kata) yang menguraikan peristiwa ekonomi utama, pelaku dan lokasi/kecamatan, besaran angka/harga/volume/anggaran jika ada, serta implikasi dampaknya terhadap sektor KBLI dan Pengeluaran PDRB Kab. Tana Tidung.',
    },
    kbli_category: {
      type: ['string', 'null'],
      enum: [...Object.values(KbliCategoryEnum), null],
      description:
        'Kode kategori KBLI 2020 (A s.d. U) sektor paling dominan terdampak; wajib null bila is_economic_phenomenon = false.',
    },
    kbli_impact: {
      type: ['string', 'null'],
      enum: [...Object.values(KbliImpactEnum), null],
      description:
        'Arah dampak sisi Lapangan Usaha: INCREASE_NTB (Meningkatkan NTB), DECREASE_NTB (Menurunkan NTB), INCREASE_PRICE (Meningkatkan Harga), DECREASE_PRICE (Menurunkan Harga); null bila non-ekonomi.',
    },
    expenditure_component: {
      type: ['string', 'null'],
      enum: [...Object.values(ExpenditureComponentEnum), null],
      description:
        'Komponen PDRB Pengeluaran utama terdampak: PK_RT, PK_LNPRT, PK_P, PMTB, INVENTORY_CHANGE, atau NET_EXPORT; null bila non-ekonomi.',
    },
    expenditure_impact: {
      type: ['string', 'null'],
      enum: [...Object.values(ExpenditureImpactEnum), null],
      description:
        'Arah dampak sisi Pengeluaran: INCREASE_REAL (Meningkatkan Pengeluaran Riil), DECREASE_REAL (Menurunkan Pengeluaran Riil), INCREASE_DEFLATOR (Meningkatkan Indeks Harga/Deflator), DECREASE_DEFLATOR (Menurunkan Indeks Harga/Deflator); null bila non-ekonomi.',
    },
    quarter: {
      type: 'integer',
      minimum: 1,
      maximum: 4,
      description: 'Triwulan periode fenomena ekonomi (1=Jan-Mar, 2=Apr-Jun, 3=Jul-Sep, 4=Okt-Des).',
    },
    year: {
      type: 'integer',
      minimum: 2000,
      maximum: 2100,
      description: 'Tahun 4 digit periode fenomena ekonomi.',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Tingkat keyakinan klasifikasi antara 0.0 hingga 1.0.',
    },
  },
  required: [
    'is_economic_phenomenon',
    'rejection_reason',
    'summary',
    'kbli_category',
    'kbli_impact',
    'expenditure_component',
    'expenditure_impact',
    'quarter',
    'year',
    'confidence',
  ],
} as const;

