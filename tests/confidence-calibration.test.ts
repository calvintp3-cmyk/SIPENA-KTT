import { describe, it, expect } from 'vitest';
import {
  calibrateClassificationConfidence,
  mapClassificationToPersistence,
} from '../server/services/llm/classifier';
import {
  KbliCategoryEnum,
  KbliImpactEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
} from '../shared/enums/pdrb';
import { ArticleSourceTypeEnum } from '../shared/enums/pdrb';
import type { LlmClassificationOutput } from '../shared/schemas/llm-output.schema';

describe('Heuristic Confidence Calibration Engine', () => {
  it('memberikan skor keyakinan tinggi untuk berita KTT_LOCAL dengan angka kuantitatif dan lokus spesifik', () => {
    const classification: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary:
        'Bupati Tana Tidung meninjau progres pembangunan Gedung Puspem KTT di Tideng Pale senilai Rp 45 miliar yang mencapai 80 persen.',
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
      confidence: 0.8, // Raw confidence dari LLM
    };

    const article = {
      title: 'Pembangunan Puspem KTT di Tideng Pale Dikebut',
      sourcePortal: 'rri.co.id',
      sourceType: ArticleSourceTypeEnum.REGIONAL,
      publishedAtWita: '2026-11-25T10:00:00+08:00',
      defaultQuarter: 4 as const,
      defaultYear: 2026,
      snippetText: 'Proyek gedung pusat pemerintahan senilai Rp 45 miliar capai 80 persen.',
    };

    const calibrated = calibrateClassificationConfidence(0.8, classification, article);
    // Terkalibrasi naik karena data kuantitatif lengkap dan lokus KTT lokal jelas
    expect(calibrated).toBeGreaterThanOrEqual(0.88);
    expect(calibrated).toBeLessThanOrEqual(0.98);
  });

  it('menurunkan skor keyakinan jika berita makro tanpa penyebutan angka kuantitatif', () => {
    const classification: LlmClassificationOutput = {
      geographic_scope: 'NATIONAL_MACRO_IMPACT',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary: 'Kementerian ESDM merencanakan penyesuaian regulasi terkait komoditas tambang.',
      kbli_category: KbliCategoryEnum.B,
      kbli_impact: KbliImpactEnum.INCREASE_PRICE,
      expenditure_component: ExpenditureComponentEnum.NET_EXPORT,
      expenditure_impact: ExpenditureImpactEnum.INCREASE_DEFLATOR,
      secondary_kbli_category: null,
      secondary_kbli_impact: null,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.95, // Raw confidence dari LLM terlalu percaya diri
    };

    const article = {
      title: 'Regulasi Tambang Baru Direncanakan',
      sourcePortal: 'antaranews.com',
      sourceType: ArticleSourceTypeEnum.NATIONAL,
      publishedAtWita: '2026-11-25T10:00:00+08:00',
      defaultQuarter: 4 as const,
      defaultYear: 2026,
      snippetText: 'Pemerintah pusat masih membahas rencana penyesuaian aturan.',
    };

    const calibrated = calibrateClassificationConfidence(0.95, classification, article);
    // Terkalibrasi turun karena tidak ada angka kuantitatif dan bersifat wacana makro
    expect(calibrated).toBeLessThanOrEqual(0.85);
  });

  it('mengkalibrasi llmConfidence pada output mapClassificationToPersistence', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary:
        'Bupati Tana Tidung meninjau progres pembangunan Gedung Puspem KTT di Tideng Pale senilai Rp 45 miliar yang mencapai 80 persen.',
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
      confidence: 0.8,
    };

    const persisted = mapClassificationToPersistence(
      raw,
      'test-model',
      'Proyek gedung pusat pemerintahan senilai Rp 45 miliar capai 80 persen.',
      {
        title: 'Pembangunan Puspem KTT di Tideng Pale Dikebut',
      },
    );
    expect(persisted.llmConfidence).toBeGreaterThanOrEqual(0.88);
    expect(persisted.llmConfidence).toBeLessThanOrEqual(0.98);
  });
});
