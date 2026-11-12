// tests/synthesis-drafts.test.ts
import { describe, expect, it } from 'vitest';
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '#shared/enums/pdrb';
import {
  CreateSynthesisDraftSchema,
  ListSynthesisDraftsQuerySchema,
  UpdateSynthesisDraftSchema,
} from '#shared/schemas/synthesis.schema';
import type {
  ArticleRecord,
  ScraperPortalErrorEntry,
  SynthesisDraftRecord,
} from '#server/db/schema';
import type {
  AdminArticleItem,
  ScraperErrorEntry,
  SynthesisDraftItem,
} from '../app/types/sipena';

const SAMPLE_ARTICLE_UUID = '00000000-0000-4000-8000-000000000101';
const SAMPLE_ARTICLE_UUID_2 = '00000000-0000-4000-8000-000000000102';

describe('Synthesis Drafts Schema & Kontrak DTO Frontend-Backend', () => {
  it('menerima payload CreateSynthesisDraftSchema valid termasuk referensi manual non-HTTP', () => {
    const parsed = CreateSynthesisDraftSchema.safeParse({
      year: 2026,
      quarter: 2,
      dimension: 'kbli',
      targetCode: 'N,O',
      targetLabel: 'N,O - Jasa Perusahaan (KBLI N & O)',
      style: 'BRS_FORMAL',
      title: 'N,O - Jasa Perusahaan — Triwulan II 2026',
      narrativeMarkdown:
        '## Dinamika Jasa Perusahaan\n\nAktivitas jasa penunjang tambang dan konstruksi meningkat [1][2].',
      generationMode: 'llm',
      modelUsed: 'groq:llama-3.3-70b-versatile',
      notice: null,
      citations: [
        {
          index: 1,
          id: SAMPLE_ARTICLE_UUID,
          title: 'Permintaan Jasa Alat Berat Proyek Puspem KTT Naik',
          sourcePortal: 'benuanta.co.id',
          publishedAt: '2026-05-03T06:30:00.000Z',
          url: 'https://benuanta.co.id/jasa-alat-berat-ktt',
          kbliCategory: KbliCategoryEnum.N,
          kbliImpact: KbliImpactEnum.INCREASE_NTB,
          expenditureComponent: ExpenditureComponentEnum.PMTB,
          expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
        },
        {
          index: 2,
          id: SAMPLE_ARTICLE_UUID_2,
          title: 'Catatan Survei Lapangan Jasa Penunjang Tambang',
          sourcePortal: 'Input Manual',
          publishedAt: '2026-05-12T02:00:00.000Z',
          url: 'BPS KTT - Laporan Monitoring Lapangan TW II 2026',
          kbliCategory: KbliCategoryEnum.O,
          kbliImpact: KbliImpactEnum.INCREASE_NTB,
          expenditureComponent: ExpenditureComponentEnum.PMTB,
          expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
        },
      ],
      articleIds: [SAMPLE_ARTICLE_UUID, SAMPLE_ARTICLE_UUID_2],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.citations).toHaveLength(2);
      expect(parsed.data.style).toBe('BRS_FORMAL');
    }
  });

  it('menolak skema URL berbahaya (XSS) dan batas input invalid pada CreateSynthesisDraftSchema', () => {
    const xssCitation = CreateSynthesisDraftSchema.safeParse({
      year: 2026,
      quarter: 2,
      dimension: 'kbli',
      targetCode: 'A',
      targetLabel: 'A - Pertanian, Kehutanan, dan Perikanan',
      style: 'BRS_FORMAL',
      title: 'Draf Pertanian TW II 2026',
      narrativeMarkdown: 'Ringkasan narasi cukup panjang untuk melewati validasi dua puluh karakter.',
      citations: [
        {
          index: 1,
          id: SAMPLE_ARTICLE_UUID,
          title: 'Berita Berbahaya',
          sourcePortal: 'Portal Uji',
          publishedAt: '2026-05-01T00:00:00.000Z',
          url: 'javascript:alert(1)',
        },
      ],
      articleIds: [SAMPLE_ARTICLE_UUID],
    });
    expect(xssCitation.success).toBe(false);

    const invalidQuarter = CreateSynthesisDraftSchema.safeParse({
      year: 2026,
      quarter: 5,
      dimension: 'expenditure',
      targetCode: 'PMTB',
      targetLabel: 'Pembentukan Modal Tetap Bruto (PMTB)',
      title: 'Draf PMTB',
      narrativeMarkdown: 'Narasi lengkap untuk uji batas triwulan valid pada database PostgreSQL.',
    });
    expect(invalidQuarter.success).toBe(false);

    const shortNarrative = CreateSynthesisDraftSchema.safeParse({
      year: 2026,
      quarter: 1,
      dimension: 'kbli',
      targetCode: 'B',
      targetLabel: 'B - Pertambangan dan Penggalian',
      title: 'Draf B',
      narrativeMarkdown: 'Terlalu pendek',
    });
    expect(shortNarrative.success).toBe(false);
  });

  it('memvalidasi UpdateSynthesisDraftSchema dan ListSynthesisDraftsQuerySchema', () => {
    expect(UpdateSynthesisDraftSchema.safeParse({}).success).toBe(false);

    const validPatch = UpdateSynthesisDraftSchema.safeParse({
      narrativeMarkdown:
        '## Pembaruan Editor Inline\n\nKenaikan produksi TBS sawit rakyat turut mendorong ekspor neto [1].',
    });
    expect(validPatch.success).toBe(true);

    const parsedQuery = ListSynthesisDraftsQuerySchema.parse({
      year: '2026',
      quarter: '3',
      dimension: 'ALL',
      targetCode: '  ',
      limit: '15',
    });
    expect(parsedQuery).toEqual({
      year: 2026,
      quarter: 3,
      dimension: undefined,
      targetCode: undefined,
      limit: 15,
    });
  });

  it('menjamin keselarasan tipe DTO artikel, log stage scraper, dan draf sintesis antara DB dan Frontend', () => {
    // Verifikasi compile-time bahwa nama field DB (ArticleRecord) selaras dengan AdminArticleItem
    type DbArticleKeys = keyof ArticleRecord;
    type UiArticleKeys = keyof AdminArticleItem;
    const matchedFields: Array<DbArticleKeys & UiArticleKeys> = [
      'id',
      'llmModel',
      'llmStatus',
      'llmError',
      'llmConfidence',
      'verificationStatus',
    ];
    expect(matchedFields).toHaveLength(6);

    // Verifikasi stage union error scraper identik (HARVEST | FETCH | EXTRACT | LLM | SYSTEM)
    const stages: ScraperPortalErrorEntry['stage'][] = [
      'HARVEST',
      'FETCH',
      'EXTRACT',
      'LLM',
      'SYSTEM',
    ];
    const uiStages: ScraperErrorEntry['stage'][] = stages;
    expect(uiStages).toEqual(stages);

    // Verifikasi field SynthesisDraftRecord selaras dengan SynthesisDraftItem
    type DbDraftKeys = keyof SynthesisDraftRecord;
    type UiDraftKeys = keyof SynthesisDraftItem;
    const draftFields: Array<DbDraftKeys & UiDraftKeys> = [
      'id',
      'year',
      'quarter',
      'dimension',
      'targetCode',
      'targetLabel',
      'style',
      'title',
      'narrativeMarkdown',
      'generationMode',
      'modelUsed',
      'citations',
      'articleIds',
      'articleCount',
    ];
    expect(draftFields).toHaveLength(14);
  });
});

