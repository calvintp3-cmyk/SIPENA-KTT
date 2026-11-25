import { describe, it, expect } from 'vitest';
import { enrichClassificationLinkages } from '../server/services/llm/classifier';
import {
  KbliCategoryEnum,
  KbliImpactEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
} from '../shared/enums/pdrb';
import type { LlmClassificationOutput } from '../shared/schemas/llm-output.schema';

describe('Strict BPS Decision Matrix (Price vs Output Shock)', () => {
  it('mengoreksi fluktuasi harga emas Antam menjadi dampak HARGA/DEFLATOR (bukan perubahan volume fisik NTB)', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'NATIONAL_MACRO_IMPACT',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary: 'Harga emas batangan Antam turun Rp 8.000 menjadi Rp 1.520.000 per gram.',
      kbli_category: KbliCategoryEnum.G,
      kbli_impact: KbliImpactEnum.DECREASE_NTB, // Keliru: harusnya DECREASE_PRICE
      expenditure_component: ExpenditureComponentEnum.PK_RT,
      expenditure_impact: ExpenditureImpactEnum.DECREASE_REAL, // Keliru: harusnya DECREASE_DEFLATOR
      secondary_kbli_category: null,
      secondary_kbli_impact: null,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.9,
    };

    const enriched = enrichClassificationLinkages(raw, 'Harga emas acuan logam mulia Antam turun');
    expect(enriched.kbli_impact).toBe(KbliImpactEnum.DECREASE_PRICE);
    expect(enriched.expenditure_impact).toBe(ExpenditureImpactEnum.DECREASE_DEFLATOR);
  });

  it('mengoreksi kenaikan harga komoditas pangan cabai/beras menjadi INCREASE_PRICE dan INCREASE_DEFLATOR', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary: 'Harga cabai rawit di Tideng Pale melesat tembus Rp 120.000 per kilogram.',
      kbli_category: KbliCategoryEnum.G,
      kbli_impact: KbliImpactEnum.INCREASE_NTB, // Keliru
      expenditure_component: ExpenditureComponentEnum.PK_RT,
      expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL, // Keliru
      secondary_kbli_category: null,
      secondary_kbli_impact: null,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.9,
    };

    const enriched = enrichClassificationLinkages(raw, 'Lonjakan harga cabai rawit di pedagang eceran');
    expect(enriched.kbli_impact).toBe(KbliImpactEnum.INCREASE_PRICE);
    expect(enriched.expenditure_impact).toBe(ExpenditureImpactEnum.INCREASE_DEFLATOR);
  });

  it('mempertahankan INCREASE_NTB dan INCREASE_REAL untuk proyek konstruksi fisik riil', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary: 'Pembangunan gedung Kantor Bupati di Puspem KTT terus dikebut dan capai 80 persen.',
      kbli_category: KbliCategoryEnum.F,
      kbli_impact: KbliImpactEnum.INCREASE_NTB,
      expenditure_component: ExpenditureComponentEnum.PMTB,
      expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
      secondary_kbli_category: null,
      secondary_kbli_impact: null,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.95,
    };

    const enriched = enrichClassificationLinkages(raw, 'Proyek fisik gedung kantor bupati puspem ktt');
    expect(enriched.kbli_impact).toBe(KbliImpactEnum.INCREASE_NTB);
    expect(enriched.expenditure_impact).toBe(ExpenditureImpactEnum.INCREASE_REAL);
  });
});
