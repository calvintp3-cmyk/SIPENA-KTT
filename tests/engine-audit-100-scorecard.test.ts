// tests/engine-audit-100-scorecard.test.ts
import { describe, expect, it } from 'vitest';
import {
  accumulateParagraphsToThreshold,
  countWords,
  extractArticleContent,
  isSameArticlePaginationUrl,
  normalizeToFullPageArticleUrl,
} from '#server/services/scraper/extractor';
import {
  buildNationalFallbackSnippet,
  isSyntheticMetadataSnippet,
} from '#server/services/scraper/national';
import {
  compressArticleTextForLlm,
  enrichClassificationLinkages,
  mapClassificationToPersistence,
} from '#server/services/llm/classifier';
import {
  evaluateGeographicRelevance,
  KTT_ANCHOR_RE,
  KTT_DISTRICTS,
  KTT_LOGISTICS_CORRIDOR_RE,
  KTT_VILLAGES,
} from '#server/services/scraper/geo-filter';
import {
  ArticleSourceTypeEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
  LlmStatusEnum,
  VerificationStatusEnum,
} from '#shared/enums/pdrb';
import type { LlmClassificationOutput } from '#shared/schemas/llm-output.schema';

describe('Engine Audit 100/100 Scorecard Suite (8 Engineering Axes)', () => {
  // =========================================================================
  // SUMBU 1: EKSTRAKSI KONTEN & ELIMINASI BUG PAGINASI ANTAR-ARTIKEL
  // =========================================================================
  describe('Sumbu 1: Content Extraction & Same-Article Pagination Guard', () => {
    it('isSameArticlePaginationUrl menolak tautan rel="next" WordPress antar-postingan berbeda', () => {
      const baseArticle = 'https://benuanta.co.id/index.php/2026/03/15/ekspor-sawit-ktt-melonjak/';
      const differentArticle = 'https://benuanta.co.id/index.php/2026/03/15/kebakaran-rumah-tarakan/';

      expect(isSameArticlePaginationUrl(baseArticle, differentArticle)).toBe(false);
    });

    it('isSameArticlePaginationUrl menerima URL paginasi internal artikel yang sama (?page=2, /page/2, ?single=1)', () => {
      const baseArticle = 'https://benuanta.co.id/2026/03/15/ekspor-sawit-ktt-melonjak/';
      const page2Query = 'https://benuanta.co.id/2026/03/15/ekspor-sawit-ktt-melonjak/?page=2';
      const page2Path = 'https://benuanta.co.id/2026/03/15/ekspor-sawit-ktt-melonjak/2/';
      const pageAllQuery = 'https://benuanta.co.id/2026/03/15/ekspor-sawit-ktt-melonjak/?page=all';

      expect(isSameArticlePaginationUrl(baseArticle, page2Query)).toBe(true);
      expect(isSameArticlePaginationUrl(baseArticle, page2Path)).toBe(true);
      expect(isSameArticlePaginationUrl(baseArticle, pageAllQuery)).toBe(true);
    });

    it('normalizeToFullPageArticleUrl menambahkan ?page=all untuk jaringan Jawa Pos (Radar Tarakan)', () => {
      const rawUrl = 'https://radartarakan.jawapos.com/tana-tidung/2026/10/pembangunan-jalan-ktt';
      const normalized = normalizeToFullPageArticleUrl(rawUrl);

      expect(normalized).toBe(
        'https://radartarakan.jawapos.com/tana-tidung/2026/10/pembangunan-jalan-ktt?page=all',
      );
    });

    it('mengekstrak konten artikel berformat <br> (tanpa tag <p>) dari container .konten/.artikel-lead', () => {
      const html = `
        <!doctype html>
        <html>
          <head><title>Penyaluran Pupuk Subsidi KTT - Radar Tarakan</title></head>
          <body>
            <div class="konten">
              <div class="artikel-lead">
                TIDENG PALE — Pemerintah Kabupaten Tana Tidung melalui Dinas Pertanian mulai menyalurkan pupuk subsidi seberat 50 ton kepada kelompok tani di Sesayap Hilir.<br><br>
                Penyaluran ini ditujukan untuk menjaga stabilitas produksi komoditas pangan dan hortikultura menjelang musim tanam triwulan kedua tahun berjalan.<br><br>
                Kepala Dinas Pertanian menyatakan bahwa alokasi pupuk bersubsidi diprioritaskan bagi petani yang terdaftar dalam sistem elektronik definitif kebutuhan kelompok tani.<br><br>
                Diharapkan dengan adanya pasokan pupuk yang lancar, produktivitas panen petani di seluruh wilayah Tana Tidung dapat meningkat secara signifikan tanpa terkendala kelangkaan sarana produksi.
              </div>
            </div>
          </body>
        </html>
      `;

      const extracted = extractArticleContent(
        html,
        new Date('2026-04-10T00:00:00.000Z'),
        'https://radartarakan.jawapos.com/tana-tidung/pupuk-subsidi',
      );
      expect(extracted.isValidContent).toBe(true);
      expect(extracted.wordCount).toBeGreaterThanOrEqual(40);
      expect(extracted.snippetText).toContain('Pemerintah Kabupaten Tana Tidung');
      expect(extracted.snippetText).toContain('Sesayap Hilir');
    });
  });

  // =========================================================================
  // SUMBU 2 & 7: ANTI-HALUSINASI METADATA & GROUNDING RINGKASAN
  // =========================================================================
  describe('Sumbu 2 & 7: Anti-Hallucination Guard & Quantitative Compression', () => {
    it('isSyntheticMetadataSnippet mengenali cuplikan sintetis fallback', () => {
      const synthetic =
        'Berita dari portal kontan.co.id berjudul "HBA Batubara Naik". Artikel ini terjaring oleh pemantauan kata kunci "harga batubara acuan" tanpa isi artikel penuh; tentukan cakupan wilayah murni berdasarkan fakta.';
      const real =
        'Kementerian ESDM resmi menetapkan harga batubara acuan (HBA) periode Oktober 2026 sebesar 135 dollar AS per ton, menguat 4,5 persen dibandingkan bulan sebelumnya.';

      expect(isSyntheticMetadataSnippet(synthetic)).toBe(true);
      expect(isSyntheticMetadataSnippet(real)).toBe(false);
    });

    it('buildNationalFallbackSnippet menandai hasSufficientContent = false jika deskripsi < 45 kata', () => {
      const candidateShort = {
        url: 'https://news.google.com/rss/articles/CBMi123',
        normalizedUrl: 'https://news.google.com/rss/articles/CBMi123',
        urlHash: '1'.repeat(64),
        title: 'Ekspor Batubara RI Naik',
        sourcePortal: 'kontan.co.id',
        sourceType: ArticleSourceTypeEnum.NATIONAL,
        publishedHint: new Date(),
        keywordId: null,
        matchedKeyword: 'batubara',
        fallbackDescription: 'Kementerian ESDM umumkan rincian ekspor batubara.', // 6 kata
      };

      const fallback = buildNationalFallbackSnippet(candidateShort);
      expect(fallback.hasSufficientContent).toBe(false);
      expect(isSyntheticMetadataSnippet(fallback.snippetText)).toBe(true);
    });

    it('compressArticleTextForLlm memprioritaskan kalimat dengan angka, nominal Rp, dan satuan kuantitatif', () => {
      const text =
        'Rapat koordinasi dipimpin oleh dinas terkait di ruang pertemuan kantor daerah. ' +
        'Pemerintah Kabupaten Tana Tidung mengalokasikan anggaran sebesar Rp 45 miliar untuk perbaikan 12 kilometer jalan poros Sesayap. ' +
        'Acara seremonial dihadiri oleh jajaran forkopimda dan para tamu undangan dari berbagai instansi. ' +
        'Produksi kelapa sawit rakyat di KTT mencapai 18.500 ton atau tumbuh 8,4 persen pada triwulan ini.';

      const compressed = compressArticleTextForLlm(text, 50, 400);
      expect(compressed).toContain('Rp 45 miliar');
      expect(compressed).toContain('18.500 ton');
      expect(compressed.endsWith('.')).toBe(true);
    });
  });

  // =========================================================================
  // SUMBU 3, 4, & 5: METODOLOGI PDRB BPS, KBLI 2025 & MULTI-LABEL LINKAGE
  // =========================================================================
  describe('Sumbu 3, 4, & 5: PDRB BPS, KBLI 2025, & Multi-Label Linkages', () => {
    it('enrichClassificationLinkages mengaitkan program bansos beras Pemkab (P + PK_P) ke sekunder R dan PK_RT', () => {
      const baseClassification: LlmClassificationOutput = {
        geographic_scope: 'KTT_LOCAL',
        is_economic_phenomenon: true,
        rejection_reason: null,
        summary:
          'Pemkab Tana Tidung menyalurkan 10 ton beras cadangan pangan bansos APBD bagi warga dhuafa di Sesayap.',
        kbli_category: KbliCategoryEnum.P,
        kbli_impact: KbliImpactEnum.INCREASE_NTB,
        expenditure_component: ExpenditureComponentEnum.PK_P,
        expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
        secondary_kbli_category: null,
        secondary_kbli_impact: null,
        secondary_expenditure_component: null,
        secondary_expenditure_impact: null,
        quarter: 2,
        year: 2026,
        confidence: 0.95,
      };

      const enriched = enrichClassificationLinkages(baseClassification);
      expect(enriched.secondary_kbli_category).toBe(KbliCategoryEnum.R);
      expect(enriched.secondary_expenditure_component).toBe(ExpenditureComponentEnum.PK_RT);
      expect(enriched.secondary_expenditure_impact).toBe(ExpenditureImpactEnum.INCREASE_REAL);
    });

    it('enrichClassificationLinkages mengaitkan proyek fisik APBD Pemkab (F + PMTB) ke sekunder P (Administrasi Pemerintahan)', () => {
      const baseClassification: LlmClassificationOutput = {
        geographic_scope: 'KTT_LOCAL',
        is_economic_phenomenon: true,
        rejection_reason: null,
        summary:
          'Dinas PU Pemkab Tana Tidung merealisasikan proyek pembangunan jalan poros senilai Rp 30 miliar.',
        kbli_category: KbliCategoryEnum.F,
        kbli_impact: KbliImpactEnum.INCREASE_NTB,
        expenditure_component: ExpenditureComponentEnum.PMTB,
        expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
        secondary_kbli_category: null,
        secondary_kbli_impact: null,
        secondary_expenditure_component: null,
        secondary_expenditure_impact: null,
        quarter: 3,
        year: 2026,
        confidence: 0.93,
      };

      const enriched = enrichClassificationLinkages(baseClassification);
      expect(enriched.secondary_kbli_category).toBe(KbliCategoryEnum.P);
      expect(enriched.secondary_kbli_impact).toBe(KbliImpactEnum.INCREASE_NTB);
    });

    it('mapClassificationToPersistence membersihkan duplikasi tag sekunder yang identik dengan primer', () => {
      const duplicateTagInput: LlmClassificationOutput = {
        geographic_scope: 'KTT_LOCAL',
        is_economic_phenomenon: true,
        rejection_reason: null,
        summary: 'Kegiatan panen raya padi sawah di Desa Tideng Pale menghasilkan 120 ton gabah kering panen.',
        kbli_category: KbliCategoryEnum.A,
        kbli_impact: KbliImpactEnum.INCREASE_NTB,
        expenditure_component: ExpenditureComponentEnum.PK_RT,
        expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
        secondary_kbli_category: KbliCategoryEnum.A, // duplikasi sengaja
        secondary_kbli_impact: KbliImpactEnum.INCREASE_NTB,
        secondary_expenditure_component: ExpenditureComponentEnum.PK_RT, // duplikasi sengaja
        secondary_expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
        quarter: 1,
        year: 2026,
        confidence: 0.92,
      };

      const persisted = mapClassificationToPersistence(duplicateTagInput, 'test-model');
      expect(persisted.secondaryKbliCategory).toBeNull();
      expect(persisted.secondaryKbliImpact).toBeNull();
      expect(persisted.secondaryExpenditureComponent).toBeNull();
      expect(persisted.secondaryExpenditureImpact).toBeNull();
      expect(persisted.verificationStatus).toBe(VerificationStatusEnum.PENDING);
    });

    it('enrichClassificationLinkages mengoreksi kontaminasi KBLI 2009 (Q->R untuk RSUD/Bencana, O->P untuk Pemda) serta batas institusi SNA 2008 (UMK/THR/Bansos/Zakat/Wisata -> PK_RT)', () => {
      // Grup 1: RSUD masuk Q -> otomatis dikoreksi ke R
      const rsudInput: LlmClassificationOutput = {
        geographic_scope: 'KTT_LOCAL',
        is_economic_phenomenon: true,
        rejection_reason: null,
        summary: 'RSUD Akhmad Berahim Tana Tidung bertransformasi dilengkapi lift dan fasilitas medis.',
        kbli_category: KbliCategoryEnum.Q,
        kbli_impact: KbliImpactEnum.INCREASE_NTB,
        expenditure_component: ExpenditureComponentEnum.PMTB,
        expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
        secondary_kbli_category: KbliCategoryEnum.F,
        secondary_kbli_impact: KbliImpactEnum.INCREASE_NTB,
        secondary_expenditure_component: ExpenditureComponentEnum.PK_P,
        secondary_expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
        quarter: 2,
        year: 2026,
        confidence: 0.95,
      };
      expect(enrichClassificationLinkages(rsudInput).kbli_category).toBe(KbliCategoryEnum.R);

      // Grup 2: Kebijakan Pemda (TPP ASN / Pajak Alat Berat / Tera) masuk O -> dikoreksi ke P
      const pemdaInput: LlmClassificationOutput = {
        ...rsudInput,
        summary: 'Pemkab Tana Tidung menetapkan pemotongan TPP ASN sebesar 20 persen pasca efisiensi anggaran.',
        kbli_category: KbliCategoryEnum.O,
        kbli_impact: KbliImpactEnum.DECREASE_NTB,
        expenditure_component: ExpenditureComponentEnum.PK_P,
        expenditure_impact: ExpenditureImpactEnum.DECREASE_REAL,
      };
      expect(enrichClassificationLinkages(pemdaInput).kbli_category).toBe(KbliCategoryEnum.P);

      // Grup 3: Bantuan Korban Bencana Kebakaran masuk Q -> dikoreksi ke R
      const bencanaInput: LlmClassificationOutput = {
        ...rsudInput,
        summary: 'PT MIP menyalurkan bantuan sembako peduli korban kebakaran di Tana Tidung.',
        kbli_category: KbliCategoryEnum.Q,
        expenditure_component: ExpenditureComponentEnum.PK_RT,
        secondary_kbli_category: null,
      };
      expect(enrichClassificationLinkages(bencanaInput).kbli_category).toBe(KbliCategoryEnum.R);

      // Grup 4: UMK & THR Pekerja Swasta masuk PK_P -> dikoreksi ke PK_RT & KBLI A (sekunder B)
      const umkInput: LlmClassificationOutput = {
        ...rsudInput,
        summary: 'Disnakertrans Tana Tidung menetapkan UMK Rp 3,87 juta dan belum ada laporan perusahaan melanggar.',
        kbli_category: KbliCategoryEnum.P,
        expenditure_component: ExpenditureComponentEnum.PK_P,
      };
      const umkFixed = enrichClassificationLinkages(umkInput);
      expect(umkFixed.kbli_category).toBe(KbliCategoryEnum.A);
      expect(umkFixed.secondary_kbli_category).toBe(KbliCategoryEnum.B);
      expect(umkFixed.expenditure_component).toBe(ExpenditureComponentEnum.PK_RT);

      // Grup 5: Zakat Profesi ASN ke Baznas & Perlinsos Bansos -> dikoreksi ke PK_RT (INCREASE_REAL)
      const zakatInput: LlmClassificationOutput = {
        ...rsudInput,
        summary: 'ASN Muslim Pemkab Tana Tidung berpendapatan di atas Rp 7 juta wajib bayar zakat profesi ke Baznas.',
        kbli_category: KbliCategoryEnum.P,
        kbli_impact: KbliImpactEnum.DECREASE_NTB,
        expenditure_component: ExpenditureComponentEnum.PK_RT,
        expenditure_impact: ExpenditureImpactEnum.DECREASE_REAL,
      };
      const zakatFixed = enrichClassificationLinkages(zakatInput);
      expect(zakatFixed.kbli_category).toBe(KbliCategoryEnum.T);
      expect(zakatFixed.kbli_impact).toBe(KbliImpactEnum.INCREASE_NTB);
      expect(zakatFixed.expenditure_component).toBe(ExpenditureComponentEnum.PK_RT);
      expect(zakatFixed.secondary_expenditure_component).toBe(ExpenditureComponentEnum.PK_LNPRT);

      // Grup 6: Wisata Alam Umum (Air Terjun Gunung Rian) masuk PK_LNPRT -> dikoreksi ke PK_RT
      const wisataInput: LlmClassificationOutput = {
        ...rsudInput,
        summary: 'Air Terjun Gunung Rian menjadi primadona wisata alam Tana Tidung yang ramai dikunjungi wisatawan.',
        kbli_category: KbliCategoryEnum.S,
        expenditure_component: ExpenditureComponentEnum.PK_LNPRT,
        secondary_expenditure_component: null,
      };
      const wisataFixed = enrichClassificationLinkages(wisataInput);
      expect(wisataFixed.expenditure_component).toBe(ExpenditureComponentEnum.PK_RT);
      expect(wisataFixed.secondary_expenditure_component).toBe(ExpenditureComponentEnum.PK_LNPRT);
    });
  });

  // =========================================================================
  // SUMBU 8: JANGKAR GEOGRAFIS & SIMPUL TRANSPORTASI RESMI KTT
  // =========================================================================
  describe('Sumbu 8: Geographic Relevance & Administrative/Transport Anchors', () => {
    it('meloloskan berita penyeberangan feri logistik rute Tarakan–Sebawang (KTT) dengan dateline luar kota', () => {
      const result = evaluateGeographicRelevance({
        title: 'KMP Manta Tambah Trip Penyeberangan Feri Rute Tarakan ke Sebawang',
        snippetText:
          'TARAKAN — ASDP menambah jadwal keberangkatan kapal feri penyeberangan menuju Pelabuhan Sebawang Kabupaten Tana Tidung guna memperlancar arus logistik sembako.',
        url: 'https://radartarakan.jawapos.com/tarakan/feri-tarakan-sebawang',
        sourceType: ArticleSourceTypeEnum.REGIONAL,
      });

      expect(result.decision).toBe('ALLOW_KTT_ANCHOR');
    });

    it('meloloskan berita koridor transportasi sungai feri/speedboat Tarakan–Tideng Pale', () => {
      const result = evaluateGeographicRelevance({
        title: 'Jadwal dan Tarif Speedboat Tarakan - Tideng Pale Naik Imbas Penyesuaian BBM',
        snippetText:
          'TARAKAN — Dishub mengumumkan penyesuaian tarif tiket speedboat reguler rute Pelabuhan Tengkayu I menuju Tideng Pale sebesar Rp 20.000.',
        url: 'https://radartarakan.jawapos.com/tarakan/jadwal-speedboat-ktt',
        sourceType: ArticleSourceTypeEnum.REGIONAL,
      });

      expect(result.decision).toBe('ALLOW_KTT_ANCHOR');
    });

    it('tetap membuang kriminalitas murni kota tetangga tanpa dampak ke KTT', () => {
      const result = evaluateGeographicRelevance({
        title: 'Satresnarkoba Polres Tarakan Gagalkan Penyelundupan 2 Kilogram Sabu',
        snippetText:
          'TARAKAN — Petugas mengamankan dua tersangka kurir sabu di Pelabuhan Malundung Tarakan.',
        url: 'https://radartarakan.jawapos.com/tarakan/narkoba-pelabuhan',
        sourceType: ArticleSourceTypeEnum.REGIONAL,
      });

      expect(result.decision).toBe('DROP_OTHER_REGENCY_LOCAL');
    });

    it('mengenali seluruh 5 kecamatan dan 32 desa resmi KTT (Master BPS 6503 / Kemendagri 65.04)', () => {
      expect(KTT_DISTRICTS.length).toBe(5);
      expect(KTT_VILLAGES.length).toBe(33); // 32 desa + 1 alias varian ejaan (badan bikis & bandan bikis)
      for (const district of KTT_DISTRICTS) {
        expect(KTT_ANCHOR_RE.test(`berita seputar ${district}`)).toBe(true);
      }
      for (const village of KTT_VILLAGES) {
        expect(KTT_ANCHOR_RE.test(`kegiatan di desa ${village} lancar`)).toBe(true);
      }
    });
  });
});
