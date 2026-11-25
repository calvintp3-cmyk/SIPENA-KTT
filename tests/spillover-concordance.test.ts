import { describe, it, expect } from 'vitest';
import { enrichClassificationLinkages } from '../server/services/llm/classifier';
import {
  KbliCategoryEnum,
  KbliImpactEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
} from '../shared/enums/pdrb';
import type { LlmClassificationOutput } from '../shared/schemas/llm-output.schema';

describe('Multi-Sectoral Spillover Concordance Matrix', () => {
  it('menghubungkan perkebunan sawit (A) dengan industri pengolahan CPO (C) sebagai sektor sekunder', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary: 'Pabrik Kelapa Sawit (PKS) di Sesayap Hilir mulai menampung TBS dari petani lokal.',
      kbli_category: KbliCategoryEnum.A,
      kbli_impact: KbliImpactEnum.INCREASE_NTB,
      expenditure_component: ExpenditureComponentEnum.NET_EXPORT,
      expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
      secondary_kbli_category: null,
      secondary_kbli_impact: null,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.9,
    };

    const enriched = enrichClassificationLinkages(raw, 'Pabrik kelapa sawit pks cpo menampung tbs petani');
    expect(enriched.secondary_kbli_category).toBe(KbliCategoryEnum.C);
    expect(enriched.secondary_kbli_impact).toBe(KbliImpactEnum.INCREASE_NTB);
  });

  it('menghubungkan kerusakan jalan logistik (H) dengan sektor perdagangan sembako (G)', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary: 'Jalan poros penghubung Sesayap-Tideng Pale longsor, distribusi bahan pangan terganggu.',
      kbli_category: KbliCategoryEnum.H,
      kbli_impact: KbliImpactEnum.DECREASE_NTB,
      expenditure_component: ExpenditureComponentEnum.PK_RT,
      expenditure_impact: ExpenditureImpactEnum.INCREASE_DEFLATOR,
      secondary_kbli_category: null,
      secondary_kbli_impact: null,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.9,
    };

    const enriched = enrichClassificationLinkages(raw, 'Jalan poros longsor truk sembako tertahan');
    expect(enriched.secondary_kbli_category).toBe(KbliCategoryEnum.G);
    expect(enriched.secondary_kbli_impact).toBe(KbliImpactEnum.DECREASE_NTB);
  });

  it('menghubungkan proyek konstruksi fisik (F) APBD/Pemkab dengan sektor administrasi pemerintahan (P)', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary: 'Pembangunan gedung puskesmas baru di Betayau dibiayai DAK APBD Pemkab Tana Tidung.',
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
      confidence: 0.9,
    };

    const enriched = enrichClassificationLinkages(raw, 'Proyek fisik puskesmas betayau pemkab tana tidung');
    expect(enriched.secondary_kbli_category).toBe(KbliCategoryEnum.P);
    expect(enriched.secondary_kbli_impact).toBe(KbliImpactEnum.INCREASE_NTB);
  });

  it('memastikan symmetrical checks tidak menduplikasi sekunder jika sudah identik dengan primer', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary: 'Dinas Pertanian Pemkab Tana Tidung membagikan bibit sawit unggul kepada petani.',
      kbli_category: KbliCategoryEnum.P,
      kbli_impact: KbliImpactEnum.INCREASE_NTB,
      expenditure_component: ExpenditureComponentEnum.PK_P,
      expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
      secondary_kbli_category: KbliCategoryEnum.P,
      secondary_kbli_impact: KbliImpactEnum.INCREASE_NTB,
      secondary_expenditure_component: ExpenditureComponentEnum.PK_P,
      secondary_expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
      quarter: 4,
      year: 2026,
      confidence: 0.9,
    };

    const enriched = enrichClassificationLinkages(raw, 'Dinas Pertanian pemkab tana tidung');
    expect(enriched.secondary_kbli_category).toBeNull();
    expect(enriched.secondary_kbli_impact).toBeNull();
    expect(enriched.secondary_expenditure_component).toBeNull();
    expect(enriched.secondary_expenditure_impact).toBeNull();
  });
});
