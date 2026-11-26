import { describe, it, expect } from 'vitest';
import {
  enrichClassificationLinkages,
  shouldRunPhenomenonRescuePass,
} from '../server/services/llm/classifier';
import {
  ArticleSourceTypeEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '../shared/enums/pdrb';
import type { LlmClassificationOutput } from '../shared/schemas/llm-output.schema';

describe('Audit & Perfection of LLM PDRB Classification Guardrails (KBLI 2025 & SNA 2008)', () => {
  it('Celah 1: tidak salah mengubah berita "perusahaan melanggar aturan lingkungan/tambang" menjadi PK_RT (THR/UMK)', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary:
        'Dinas Lingkungan Hidup Kabupaten Tana Tidung menegur perusahaan melanggar batas konsesi lahan tambang batubara di Sesayap Hilir.',
      kbli_category: KbliCategoryEnum.B,
      kbli_impact: KbliImpactEnum.DECREASE_NTB,
      expenditure_component: ExpenditureComponentEnum.NET_EXPORT,
      expenditure_impact: ExpenditureImpactEnum.DECREASE_REAL,
      secondary_kbli_category: KbliCategoryEnum.P,
      secondary_kbli_impact: KbliImpactEnum.INCREASE_NTB,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.88,
    };

    const enriched = enrichClassificationLinkages(
      raw,
      'Dinas Lingkungan Hidup menegur perusahaan melanggar aturan izin lingkungan tambang batubara',
    );
    expect(enriched.expenditure_component).toBe(ExpenditureComponentEnum.NET_EXPORT);
    expect(enriched.expenditure_impact).toBe(ExpenditureImpactEnum.DECREASE_REAL);
  });

  it('Celah 2: GUARDRAIL 8 tidak menimpa lonjakan volume produksi/ekspor riil menjadi INCREASE_PRICE hanya karena teks menyebut kata harga', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary:
        'Volume produksi dan pengapalan ekspor CPO serta TBS sawit dari Sesayap Hilir meningkat 15 persen seiring kenaikan harga sawit global.',
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
      confidence: 0.92,
    };

    const enriched = enrichClassificationLinkages(
      raw,
      'Volume produksi dan pengapalan ekspor TBS sawit naik 15 persen di tengah kenaikan harga sawit',
    );
    expect(enriched.kbli_impact).toBe(KbliImpactEnum.INCREASE_NTB);
    expect(enriched.expenditure_impact).toBe(ExpenditureImpactEnum.INCREASE_REAL);
  });

  it('Celah 3: memetakan proyek infrastruktur ketenagalistrikan SUTT 150 kV / Gardu Induk PLN ke F (sekunder D) dan PMTB', () => {
    const raw: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary:
        'GM PLN UIP KLT meninjau progres pembangunan jaringan transmisi SUTT 150 kV Tideng Pale-Malinau dan Gardu Induk GI Tideng Pale.',
      kbli_category: KbliCategoryEnum.P,
      kbli_impact: KbliImpactEnum.INCREASE_NTB,
      expenditure_component: ExpenditureComponentEnum.PK_P,
      expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
      secondary_kbli_category: null,
      secondary_kbli_impact: null,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.9,
    };

    const enriched = enrichClassificationLinkages(
      raw,
      'Pembangunan Saluran Udara Tegangan Tinggi SUTT 150 kV dan Gardu Induk GI Tideng Pale oleh PLN',
    );
    expect(enriched.kbli_category).toBe(KbliCategoryEnum.F);
    expect(enriched.secondary_kbli_category).toBe(KbliCategoryEnum.D);
    expect(enriched.expenditure_component).toBe(ExpenditureComponentEnum.PMTB);
  });

  it('Celah 4: memetakan usulan penghijauan jalan protokol & dukungan CSR pohon peneduh + Perda untuk rescue pass', () => {
    const article = {
      title: 'Jalan Protokol Tana Tidung Akan Dihijaukan Pohon Peneduh, Perda sebagai Pengaman',
      sourcePortal: 'radartarakan.jawapos.com',
      sourceType: ArticleSourceTypeEnum.REGIONAL,
      publishedAtWita: '2026-11-25T22:42:29+08:00',
      defaultQuarter: 4 as const,
      defaultYear: 2026,
      snippetText:
        'Pemkab Tana Tidung berencana memperluas program penghijauan di sepanjang jalur pedestrian jalan protokol bersama Dinas PUPRPKP dan DPRD dengan dukungan CSR tanaman dari PT MIP dan JOB Medco Pertamina serta menyusun Perda perlindungan.',
    };

    const wronglyRejected: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: false,
      rejection_reason: 'Masih berupa rencana penghijauan dan usulan perda.',
      summary: 'Pemkab Tana Tidung mengusulkan penghijauan jalan protokol dan perda pengaman.',
      kbli_category: null,
      kbli_impact: null,
      expenditure_component: null,
      expenditure_impact: null,
      secondary_kbli_category: null,
      secondary_kbli_impact: null,
      secondary_expenditure_component: null,
      secondary_expenditure_impact: null,
      quarter: 4,
      year: 2026,
      confidence: 0.7,
    };

    expect(shouldRunPhenomenonRescuePass(wronglyRejected, article)).toBe(true);
  });
});
