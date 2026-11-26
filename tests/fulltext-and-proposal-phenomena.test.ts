import { describe, it, expect } from 'vitest';
import {
  buildClassificationPrompt,
  calibrateClassificationConfidence,
  COMPRESS_MAX_WORDS_FOR_LLM,
  SIPENA_SYSTEM_INSTRUCTION_FULL,
} from '../server/services/llm/classifier';
import {
  ArticleSourceTypeEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '../shared/enums/pdrb';
import type { LlmClassificationOutput } from '../shared/schemas/llm-output.schema';

describe('Full-Text Preservation & Proposal/Planned Economic Phenomenon Support', () => {
  it('tidak memotong teks berita asli yang panjang pada buildClassificationPrompt', () => {
    expect(COMPRESS_MAX_WORDS_FOR_LLM).toBeGreaterThanOrEqual(25_000);

    const paragraphs = Array.from(
      { length: 25 },
      (_, i) =>
        `Paragraf ke-${i + 1} menjelaskan progres penataan jalan protokol dan dukungan CSR pohon peneduh di Tideng Pale Kabupaten Tana Tidung secara lengkap.`,
    );
    const fullText = paragraphs.join('\n\n');

    const prompt = buildClassificationPrompt({
      title: 'Jalan Protokol Tana Tidung Akan Dihijaukan Pohon Peneduh, Perda sebagai Pengaman',
      sourcePortal: 'radartarakan.jawapos.com',
      sourceType: ArticleSourceTypeEnum.REGIONAL,
      publishedAtWita: '2026-11-25T22:42:29+08:00',
      defaultQuarter: 4,
      defaultYear: 2026,
      snippetText: fullText,
    });

    expect(prompt).toContain('Paragraf ke-1 ');
    expect(prompt).toContain('Paragraf ke-15 ');
    expect(prompt).toContain('Paragraf ke-25 ');
  });

  it('menginstruksikan penerimaan berita usulan/rencana pembangunan, CSR, dan Perda ekonomi di System Prompt serta tidak memberi penalti confidence pada berita lokal KTT', () => {
    expect(SIPENA_SYSTEM_INSTRUCTION_FULL).toMatch(/usulan|rencana|wacana|csr|perda/i);

    const proposalClassification: LlmClassificationOutput = {
      geographic_scope: 'KTT_LOCAL',
      is_economic_phenomenon: true,
      rejection_reason: null,
      summary:
        'Pemkab Tana Tidung merencanakan perluasan penghijauan jalan protokol di Tideng Pale dengan dukungan CSR PT MIP dan JOB Medco Pertamina serta mengusulkan Perda perlindungan tanaman.',
      kbli_category: KbliCategoryEnum.F,
      kbli_impact: KbliImpactEnum.INCREASE_NTB,
      expenditure_component: ExpenditureComponentEnum.PMTB,
      expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
      secondary_kbli_category: KbliCategoryEnum.P,
      secondary_kbli_impact: KbliImpactEnum.INCREASE_NTB,
      secondary_expenditure_component: ExpenditureComponentEnum.PK_P,
      secondary_expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
      quarter: 4,
      year: 2026,
      confidence: 0.85,
    };

    const calibrated = calibrateClassificationConfidence(0.85, proposalClassification, {
      title: 'Jalan Protokol Tana Tidung Akan Dihijaukan Pohon Peneduh, Perda sebagai Pengaman',
      sourcePortal: 'radartarakan.jawapos.com',
      sourceType: ArticleSourceTypeEnum.REGIONAL,
      publishedAtWita: '2026-11-25T22:42:29+08:00',
      defaultQuarter: 4,
      defaultYear: 2026,
      snippetText:
        'Pemkab Tana Tidung berencana memperluas program penghijauan di sepanjang jalan protokol bersama DPRD dan Dinas PUPRPKP pada Rabu (25/11) dengan dukungan CSR MIP dan JOB Medco Pertamina.',
    });

    expect(calibrated).toBeGreaterThanOrEqual(0.8);
  });
});
