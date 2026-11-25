# LLM Engine Overhaul Implementation Plan (6 Core Weaknesses)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengatasi 6 kelemahan utama LLM Engine SIPENA KTT untuk klasifikasi fenomena ekonomi PDRB BPS: (1) Spatial Gazetteer & Micro-Toponymy KTT, (2) Temporal Disambiguation Matrix (Triwulan & Tahun), (3) Strict BPS Decision Matrix (Price vs Output Shock), (4) Adaptive Salient Economic Paragraph Extractor, (5) Multi-Sectoral Spillover Concordance, dan (6) Heuristic Confidence Calibration Engine.

**Architecture:** Menerapkan arsitektur dua lapis (Two-Tier Guardrails): Lapis 1 berupa prompt engineering presisi tinggi berdasar Manual BPS SNA 2008 & KBLI 2025 dengan few-shot examples yang terkalibrasi; Lapis 2 berupa post-processing deterministic resolver (toponymy gazetteer, temporal heuristics, I-O concordance rulebook, dan scoring kalibrasi empiris) di `server/services/llm/classifier.ts` dan `server/services/scraper/`.

**Tech Stack:** Nuxt 3 / Nitro, TypeScript, Zod v4, Vitest, Cheerio, Drizzle ORM, Google Gemini 2.5 Flash / 3.8 via `@google/genai`.

## Global Constraints

- Standar Klasifikasi Lapangan Usaha: KBLI 2025 (Peraturan BPS No. 7 Tahun 2025 — 22 Kategori A s.d. V).
- Standar Komponen Pengeluaran: SNA 2008 (6 Komponen: PK_RT, PK_LNPRT, PK_P, PMTB, INVENTORY_CHANGE, NET_EXPORT).
- Tidak menggunakan Prisma; database menggunakan Drizzle ORM dengan PostgreSQL (`articles` table).
- Seluruh tes unit wajib menggunakan Vitest (`npx vitest run tests/...`) dan seluruh type checking wajib lolos (`npx vue-tsc --noEmit`).
- Tidak ada placeholder, "TODO", atau "TBD" di setiap langkah kode.

---

### Task 1: Spatial Gazetteer & Micro-Toponymy Resolution for KTT

**Files:**
- Modify: `server/services/scraper/geo-filter.ts:20-80,230-280`
- Modify: `server/services/llm/classifier.ts:20-60`
- Test: `tests/geo-filter-gazetteer.test.ts`

**Interfaces:**
- Consumes: `title: string`, `snippetText?: string | null`
- Produces: `detectKttSubdistrict(title: string, snippetText?: string | null): KttSubdistrictName | null`, `KTT_GAZETTEER_MAP: Record<string, KttSubdistrictName>`

- [ ] **Step 1: Write the failing test**

Create `tests/geo-filter-gazetteer.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { detectKttSubdistrict, KTT_GAZETTEER_MAP } from '../server/services/scraper/geo-filter';

describe('Spatial Gazetteer & Micro-Toponymy Resolution for KTT', () => {
  it('memetakan desa dan landmark ke kecamatan yang tepat melalui KTT_GAZETTEER_MAP', () => {
    expect(KTT_GAZETTEER_MAP['tideng pale']).toBe('Sesayap');
    expect(KTT_GAZETTEER_MAP['bebatu']).toBe('Sesayap Hilir');
    expect(KTT_GAZETTEER_MAP['pelabuhan bebatu']).toBe('Sesayap Hilir');
    expect(KTT_GAZETTEER_MAP['tanah merah']).toBe('Tana Lia');
    expect(KTT_GAZETTEER_MAP['buong baru']).toBe('Betayau');
    expect(KTT_GAZETTEER_MAP['kapuak']).toBe('Muruk Rian');
    expect(KTT_GAZETTEER_MAP['puspem ktt']).toBe('Sesayap');
  });

  it('mendeteksi lokus kecamatan secara akurat dari nama desa mikro di judul/snippet', () => {
    // Desa Bebatu di Sesayap Hilir
    expect(detectKttSubdistrict('Panen Bandeng Melimpah di Tambak Bebatu')).toBe('Sesayap Hilir');

    // Buong Baru di Betayau
    expect(detectKttSubdistrict('Banjir Rendam Puluhan Hektare Sawah di Buong Baru')).toBe('Betayau');

    // Tanah Merah di Tana Lia
    expect(detectKttSubdistrict('Distribusi Solar Nelayan di Tanah Merah')).toBe('Tana Lia');

    // Kapuak di Muruk Rian
    expect(detectKttSubdistrict('Jalan Poros Desa Kapuak Ambles')).toBe('Muruk Rian');

    // Tideng Pale di Sesayap
    expect(detectKttSubdistrict('Pasar Imbayud Taka Tideng Pale Padat Pengunjung')).toBe('Sesayap');
  });

  it('mengembalikan null jika berita berskala makro provinsi Kaltara tanpa lokus kecamatan spesifik', () => {
    expect(detectKttSubdistrict('Gubernur Kaltara Tetapkan UMP 2027 Naik 6,5 Persen')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/geo-filter-gazetteer.test.ts`
Expected: FAIL (`KTT_GAZETTEER_MAP` not defined).

- [ ] **Step 3: Implement Gazetteer Dictionary and Enhanced Detection**

Modify `server/services/scraper/geo-filter.ts`:
Tambahkan pemetaan komprehensif 32 desa dan 15 landmark resmi KTT ke kecamatan induknya:
```typescript
export const KTT_GAZETTEER_MAP: Record<string, KttSubdistrictName> = {
  // 1. Kec. Sesayap (Ibukota & Pusat Kegiatan)
  'tideng pale': 'Sesayap',
  'tideng pale timur': 'Sesayap',
  'sedulun': 'Sesayap',
  'limbu sedulun': 'Sesayap',
  'sebawang': 'Sesayap',
  'sebidai': 'Sesayap',
  'gunawan': 'Sesayap',
  'pelabuhan sebawang': 'Sesayap',
  'dermaga tideng pale': 'Sesayap',
  'pasar imbayud taka': 'Sesayap',
  'puspem ktt': 'Sesayap',
  'pusat pemerintahan ktt': 'Sesayap',
  'rsud akhmad berahim': 'Sesayap',
  'akhmad berahim': 'Sesayap',
  'sungai sesayap': 'Sesayap',

  // 2. Kec. Sesayap Hilir (Sentra Tambak, Sawit, & Pesisir)
  'sesayap hilir': 'Sesayap Hilir',
  'sesayap selor': 'Sesayap Hilir',
  'bebatu': 'Sesayap Hilir',
  'pelabuhan bebatu': 'Sesayap Hilir',
  'menjelutung': 'Sesayap Hilir',
  'sepala dalung': 'Sesayap Hilir',
  'sengkong': 'Sesayap Hilir',
  'seludau': 'Sesayap Hilir',
  'badan bikis': 'Sesayap Hilir',
  'bandan bikis': 'Sesayap Hilir',

  // 3. Kec. Tana Lia (Pulau Mandul & Pesisir Timur)
  'tana lia': 'Tana Lia',
  'tanah merah': 'Tana Lia',
  'tanah merah barat': 'Tana Lia',
  'tengku dacing': 'Tana Lia',
  'sambungan': 'Tana Lia',
  'sambungan selatan': 'Tana Lia',

  // 4. Kec. Betayau (Sentra Padi Sawah & Perkebunan)
  'betayau': 'Betayau',
  'buong baru': 'Betayau',
  'bebakung': 'Betayau',
  'kujau': 'Betayau',
  'maning': 'Betayau',
  'mendupo': 'Betayau',
  'periuk': 'Betayau',

  // 5. Kec. Muruk Rian (Sentra Buah, Perkebunan, & Wisata Alam)
  'muruk rian': 'Muruk Rian',
  'belayan ari': 'Muruk Rian',
  'kapuak': 'Muruk Rian',
  'rian': 'Muruk Rian',
  'desa rian': 'Muruk Rian',
  'rian rayo': 'Muruk Rian',
  'sapari': 'Muruk Rian',
  'seputuk': 'Muruk Rian',
  'air terjun gunung rian': 'Muruk Rian',
  'gunung rian': 'Muruk Rian',
};
```
Perbarui `detectKttSubdistrict` untuk mencocokkan entri gazetteer secara langsung dengan bobot prioritas tinggi.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/geo-filter-gazetteer.test.ts`
Expected: PASS (all 3 tests passing).

- [ ] **Step 5: Commit changes**

```bash
git add tests/geo-filter-gazetteer.test.ts server/services/scraper/geo-filter.ts
git commit -m "feat(geo): add KTT spatial gazetteer map and micro-toponymy resolver"
```

---

### Task 2: Temporal Disambiguation Matrix (Quarter & Year Resolution)

**Files:**
- Create: `server/services/llm/temporal-resolver.ts`
- Modify: `server/services/llm/classifier.ts:140-190,830-898`
- Test: `tests/temporal-resolver.test.ts`

**Interfaces:**
- Consumes: `publishedAtWita: string`, `text: string`, `defaultQuarter: 1 | 2 | 3 | 4`, `defaultYear: number`
- Produces: `resolvePhenomenonQuarterAndYear(params: TemporalResolverInput): { quarter: number; year: number; isRetroactive: boolean; reasoning: string }`

- [ ] **Step 1: Write the failing test**

Create `tests/temporal-resolver.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { resolvePhenomenonQuarterAndYear } from '../server/services/llm/temporal-resolver';

describe('Temporal Disambiguation Matrix for PDRB', () => {
  it('menggunakan default quarter dan year jika tidak ada penyebutan periode retrospektif/spesifik di teks', () => {
    const res = resolvePhenomenonQuarterAndYear({
      publishedAtWita: '2026-11-25T10:00:00+08:00',
      title: 'Harga Cabai di Tideng Pale Naik Menjelang Akhir Tahun',
      snippetText: 'Pedagang di Pasar Imbayud Taka mengeluhkan kenaikan harga cabai rawit pekan ini.',
      defaultQuarter: 4,
      defaultYear: 2026,
    });
    expect(res.quarter).toBe(4);
    expect(res.year).toBe(2026);
    expect(res.isRetroactive).toBe(false);
  });

  it('mendeteksi rilis data retrospektif BPS (misal rilis TW III pada bulan November)', () => {
    const res = resolvePhenomenonQuarterAndYear({
      publishedAtWita: '2026-11-05T10:00:00+08:00',
      title: 'BPS Rilis Pertumbuhan Ekonomi Kaltara Triwulan III-2026 Tumbuh 5,12 Persen',
      snippetText: 'Badan Pusat Statistik Provinsi Kalimantan Utara mencatat pertumbuhan ekonomi Triwulan III tahun 2026 secara y-on-y tumbuh impresif.',
      defaultQuarter: 4,
      defaultYear: 2026,
    });
    expect(res.quarter).toBe(3);
    expect(res.year).toBe(2026);
    expect(res.isRetroactive).toBe(true);
  });

  it('mendeteksi penetapan UMP untuk tahun depan sebagai kebijakan yang berlaku tahun depan jika merujuk operasional', () => {
    const res = resolvePhenomenonQuarterAndYear({
      publishedAtWita: '2026-11-25T10:00:00+08:00',
      title: 'Gubernur Kaltara Tetapkan UMP 2027 Sebesar Rp 4.027.901 Berlaku Mulai 1 Januari 2027',
      snippetText: 'Surat Keputusan Gubernur Kalimantan Utara menetapkan Upah Minimum Provinsi untuk tahun 2027 mulai berlaku 1 Januari 2027.',
      defaultQuarter: 4,
      defaultYear: 2026,
    });
    // Sesuai kaidah Nerwilis: penetapan regulasi terjadi pada TW IV 2026 sebagai fenomena kebijakan pembentukan ekspektasi & biaya
    expect(res.quarter).toBe(4);
    expect(res.year).toBe(2026);
    expect(res.isRetroactive).toBe(false);
  });

  it('mendeteksi penyebutan realisasi triwulan masa lampau tahun sebelumnya', () => {
    const res = resolvePhenomenonQuarterAndYear({
      publishedAtWita: '2026-03-10T10:00:00+08:00',
      title: 'Realisasi Investasi PMTB KTT Triwulan IV 2025 Capai Target',
      snippetText: 'Dinas Penanaman Modal mencatat capaian triwulan 4 tahun 2025 meningkat signifikan.',
      defaultQuarter: 1,
      defaultYear: 2026,
    });
    expect(res.quarter).toBe(4);
    expect(res.year).toBe(2025);
    expect(res.isRetroactive).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/temporal-resolver.test.ts`
Expected: FAIL (`resolvePhenomenonQuarterAndYear` not found).

- [ ] **Step 3: Implement `resolvePhenomenonQuarterAndYear`**

Create `server/services/llm/temporal-resolver.ts`:
```typescript
export interface TemporalResolverInput {
  publishedAtWita: string;
  title: string;
  snippetText?: string | null;
  defaultQuarter: 1 | 2 | 3 | 4;
  defaultYear: number;
}

export interface TemporalResolverOutput {
  quarter: 1 | 2 | 3 | 4;
  year: number;
  isRetroactive: boolean;
  reasoning: string;
}

export function resolvePhenomenonQuarterAndYear(
  input: TemporalResolverInput,
): TemporalResolverOutput {
  const text = `${input.title} ${input.snippetText ?? ''}`.toLowerCase();

  // Pola eksplisit BPS: "Triwulan I/II/III/IV 202x" atau "TW 1/2/3/4 202x"
  const RETRO_TW_YEAR_RE =
    /\b(?:triwulan|tw)\s*([1-4]|i{1,3}|iv)\s*[-–/]?\s*(202[0-9]|203[0-9])\b/i;
  const match = RETRO_TW_YEAR_RE.exec(text);

  if (match) {
    const rawTw = match[1].toLowerCase();
    const parsedYear = parseInt(match[2], 10);
    let parsedQuarter: 1 | 2 | 3 | 4 = input.defaultQuarter;

    if (rawTw === '1' || rawTw === 'i') parsedQuarter = 1;
    else if (rawTw === '2' || rawTw === 'ii') parsedQuarter = 2;
    else if (rawTw === '3' || rawTw === 'iii') parsedQuarter = 3;
    else if (rawTw === '4' || rawTw === 'iv') parsedQuarter = 4;

    // Periksa apakah ini rilis statistik retrospektif
    const isRetroactiveSignal =
      /\b(?:rilis|catat|tumbuh|realisasi|laporan|kinerja|pertumbuhan|survei|data)\b/i.test(text);

    if (
      isRetroactiveSignal &&
      (parsedYear < input.defaultYear ||
        (parsedYear === input.defaultYear && parsedQuarter < input.defaultQuarter))
    ) {
      return {
        quarter: parsedQuarter,
        year: parsedYear,
        isRetroactive: true,
        reasoning: `Terdeteksi rilis data retrospektif untuk Triwulan ${parsedQuarter} Tahun ${parsedYear}.`,
      };
    }
  }

  return {
    quarter: input.defaultQuarter,
    year: input.defaultYear,
    isRetroactive: false,
    reasoning: `Mengikuti periode tanggal publikasi rilis (Triwulan ${input.defaultQuarter} Tahun ${input.defaultYear}).`,
  };
}
```

Integrasikan `resolvePhenomenonQuarterAndYear` ke dalam `server/services/llm/classifier.ts` di dalam `mapClassificationToPersistence`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/temporal-resolver.test.ts`
Expected: PASS (all 4 tests passing).

- [ ] **Step 5: Commit changes**

```bash
git add server/services/llm/temporal-resolver.ts tests/temporal-resolver.test.ts server/services/llm/classifier.ts
git commit -m "feat(llm): implement temporal disambiguation matrix for PDRB quarters and years"
```

---

### Task 3: Strict BPS Decision Matrix: Price Shock vs Volume/Output Shock

**Files:**
- Modify: `server/services/llm/classifier.ts:130-189,400-500`
- Test: `tests/bps-decision-matrix.test.ts`

**Interfaces:**
- Consumes: `classification: LlmClassificationOutput`, `snippetText?: string | null`
- Produces: Normalized `kbli_impact` (`INCREASE_PRICE` | `DECREASE_PRICE` vs `INCREASE_NTB` | `DECREASE_NTB`) and `expenditure_impact` (`INCREASE_DEFLATOR` | `DECREASE_DEFLATOR` vs `INCREASE_REAL` | `DECREASE_REAL`)

- [ ] **Step 1: Write the failing test**

Create `tests/bps-decision-matrix.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bps-decision-matrix.test.ts`
Expected: FAIL (harga emas and cabai rawit not yet auto-corrected to `DECREASE_PRICE` and `DECREASE_DEFLATOR`).

- [ ] **Step 3: Implement Guardrail in `enrichClassificationLinkages`**

In `server/services/llm/classifier.ts`:
Tambahkan penegasan Decision Matrix BPS untuk guncangan harga murni (`PRICE/DEFLATOR`):
```typescript
  // =========================================================================
  // GUARDRAIL 8: Decision Matrix BPS (Price Shock vs Real Volume Shock)
  // Guncangan harga murni tanpa perubahan volume produksi fisik harus masuk
  // ke INCREASE_PRICE/DECREASE_PRICE di Lapangan Usaha dan DEFLATOR di Pengeluaran
  // =========================================================================
  const isPurePriceShock =
    /\b(?:harga\s+(?:emas|antam|cabai|beras|tbs|sawit|bawang|minyak|daging|telur|bbm|pertalite|solar|lpg|elpiji)|tarif\s+(?:listrik|speedboat|feri|ongkos)|ihk|inflasi|deflasi)\b/i.test(
      text,
    ) &&
    !/\b(?:pembangunan\s+fisik|panen\s+raya|gagal\s+panen|banjir\s+rendam|penambahan\s+armada|buka\s+rute|lelang\s+tender|kontrak\s+kerja)\b/i.test(
      text,
    );

  if (isPurePriceShock) {
    const isPriceDrop = /\b(?:turun|penurunan|anjlok|melorot|melemah|merosot|diskon|murah)\b/i.test(text);
    const isPriceHike = /\b(?:naik|kenaikan|melonjak|melesat|menguat|mahal|meroket)\b/i.test(text);

    if (isPriceDrop) {
      priKbliImpact = KbliImpactEnum.DECREASE_PRICE;
      if (priExp === ExpenditureComponentEnum.PK_RT || priExp === ExpenditureComponentEnum.NET_EXPORT) {
        priExpImpact = ExpenditureImpactEnum.DECREASE_DEFLATOR;
      }
    } else if (isPriceHike) {
      priKbliImpact = KbliImpactEnum.INCREASE_PRICE;
      if (priExp === ExpenditureComponentEnum.PK_RT || priExp === ExpenditureComponentEnum.NET_EXPORT) {
        priExpImpact = ExpenditureImpactEnum.INCREASE_DEFLATOR;
      }
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/bps-decision-matrix.test.ts`
Expected: PASS (all 3 tests passing).

- [ ] **Step 5: Commit changes**

```bash
git add tests/bps-decision-matrix.test.ts server/services/llm/classifier.ts
git commit -m "feat(llm): enforce BPS decision matrix for price vs volume shocks"
```

---

### Task 4: Adaptive Salient Economic Paragraph Extractor

**Files:**
- Modify: `server/services/scraper/extractor.ts:700-800`
- Modify: `server/services/llm/classifier.ts:200-300`
- Test: `tests/salient-extractor.test.ts`

**Interfaces:**
- Consumes: `paragraphs: string[]`, `maxWords: number`, `maxChars: number`
- Produces: `extractSalientEconomicParagraphs(paragraphs: string[], options?: ExtractorOptions): string`

- [ ] **Step 1: Write the failing test**

Create `tests/salient-extractor.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { extractSalientEconomicParagraphs } from '../server/services/scraper/extractor';

describe('Adaptive Salient Economic Paragraph Extractor', () => {
  it('memprioritaskan paragraf berkepadatan data ekonomi dan nama toponym KTT daripada pembuka basa-basi', () => {
    const paragraphs = [
      'Pagi yang cerah menyelimuti langit Kalimantan Utara pada hari Rabu yang damai ini saat warga beraktivitas seperti biasa.',
      'Berdasarkan data Dinas Perindustrian dan Perdagangan, harga beras SPHP di Pasar Imbayud Taka Sesayap melonjak Rp 15.000 per kg akibat pasokan terhambat.',
      'Demikian disampaikan oleh salah seorang warga yang enggan disebutkan namanya saat ditemui wartawan di sebuah warung kopi.',
      'Kepala Disperindagkop KTT menyatakan pihaknya menyiapkan operasi pasar murah sebanyak 5 ton beras dengan alokasi anggaran tanggap darurat APBD sebesar Rp 250 juta.',
    ];

    const result = extractSalientEconomicParagraphs(paragraphs, { maxWords: 60 });
    // Wajib menyertakan paragraf kedua (data beras di Pasar Imbayud Taka) dan paragraf keempat (operasi pasar 5 ton Rp 250 juta)
    expect(result).toContain('harga beras SPHP di Pasar Imbayud Taka');
    expect(result).toContain('operasi pasar murah sebanyak 5 ton');
    expect(result).not.toContain('warung kopi');
  });

  it('mempertahankan paragraf lead (paragraf 1) jika mengandung fakta berita inti', () => {
    const paragraphs = [
      'Bupati Tana Tidung meninjau langsung progres pembangunan Gedung Pusat Pemerintahan (Puspem) KTT di Tideng Pale senilai Rp 45 miliar.',
      'Dalam kesempatan tersebut, beliau mengimbau seluruh jajaran kontraktor bekerja tepat waktu.',
    ];

    const result = extractSalientEconomicParagraphs(paragraphs, { maxWords: 50 });
    expect(result).toContain('Gedung Pusat Pemerintahan (Puspem) KTT');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/salient-extractor.test.ts`
Expected: FAIL (`extractSalientEconomicParagraphs` not exported).

- [ ] **Step 3: Implement `extractSalientEconomicParagraphs`**

In `server/services/scraper/extractor.ts`:
Implementasikan fungsi ekstraksi adaptif berbobot:
```typescript
export interface SalientExtractorOptions {
  maxWords?: number;
  maxChars?: number;
}

export function extractSalientEconomicParagraphs(
  paragraphs: string[],
  options?: SalientExtractorOptions,
): string {
  const maxWords = options?.maxWords ?? 600;
  const maxChars = options?.maxChars ?? 4000;

  const ECONOMIC_DATA_RE =
    /\b(?:\d+|rp|rupiah|persen|%|miliar|juta|triliun|ton|kg|hektare|sak|liter|pdrb|inflasi|ihk|ntb|panen|ekspor|impor|anggaran|apbd|dak|tpp|gaji|sawit|batubara|tbs|cpo|pasar|sembako|beras|cabai|solar|bbm|elpiji|bupati|pemkab|disbun|disperindagkop|puspem|tideng pale|sesayap|betayau|tana lia|muruk rian)\b/i;

  interface ScoredParagraph {
    text: string;
    index: number;
    score: number;
    words: number;
    chars: number;
  }

  const scored: ScoredParagraph[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (!p || p.length < 25) continue;

    let score = 0;
    if (i === 0) score += 3; // Boost lead paragraph

    const matches = p.match(new RegExp(ECONOMIC_DATA_RE.source, 'gi'));
    if (matches) {
      score += matches.length * 2;
    }

    // Penalti untuk paragraf basa-basi / penutup wartawan
    if (/\b(?:warung kopi|enggan disebutkan|ujar salah|baca juga|simak video|pantauan di lapangan)\b/i.test(p)) {
      score -= 5;
    }

    const wordCount = p.split(/\s+/).filter(Boolean).length;
    scored.push({
      text: p,
      index: i,
      score,
      words: wordCount,
      chars: p.length,
    });
  }

  // Ambil paragraf berdasarkan ranking skor tertinggi
  const prioritized = [...scored].sort((a, b) => b.score - a.score);
  const selectedIndices = new Set<number>();
  let currentWords = 0;
  let currentChars = 0;

  for (const item of prioritized) {
    if (currentWords + item.words > maxWords || currentChars + item.chars > maxChars) {
      if (selectedIndices.size === 0) selectedIndices.add(item.index);
      break;
    }
    selectedIndices.add(item.index);
    currentWords += item.words;
    currentChars += item.chars + 2;
  }

  // Susun kembali sesuai alur kronologis asli artikel
  return scored
    .filter((item) => selectedIndices.has(item.index))
    .sort((a, b) => a.index - b.index)
    .map((item) => item.text)
    .join('\n\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/salient-extractor.test.ts`
Expected: PASS (all 2 tests passing).

- [ ] **Step 5: Commit changes**

```bash
git add server/services/scraper/extractor.ts tests/salient-extractor.test.ts
git commit -m "feat(scraper): implement adaptive salient economic paragraph extractor"
```

---

### Task 5: Multi-Sectoral Secondary Concordance Matrix

**Files:**
- Modify: `server/services/llm/classifier.ts:140-180,450-550`
- Test: `tests/spillover-concordance.test.ts`

**Interfaces:**
- Consumes: `classification: LlmClassificationOutput`, `snippetText?: string | null`
- Produces: Complete secondary linkages (`secondary_kbli_category`, `secondary_kbli_impact`, `secondary_expenditure_component`, `secondary_expenditure_impact`)

- [ ] **Step 1: Write the failing test**

Create `tests/spillover-concordance.test.ts`:
```typescript
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/spillover-concordance.test.ts`
Expected: FAIL (secondary sectors not yet auto-populated).

- [ ] **Step 3: Implement I-O Spillover Concordance Guardrails**

In `server/services/llm/classifier.ts`:
Tambahkan koncordansi antarsektor BPS di dalam `enrichClassificationLinkages`:
```typescript
  // =========================================================================
  // GUARDRAIL 9: Inter-Industry Linkage Concordance (Input-Output BPS)
  // =========================================================================
  // 1. Keterkaitan Agro-Industri (Sawit A <-> CPO C)
  if (
    priKbli === KbliCategoryEnum.A &&
    !secKbli &&
    /\b(?:pks|pabrik kelapa sawit|cpo|crude palm oil|pabrik pengolahan)\b/i.test(text)
  ) {
    secKbli = KbliCategoryEnum.C;
    secKbliImpact = priKbliImpact;
  }

  // 2. Keterkaitan Logistik-Perdagangan (Jalan Rusak H <-> Sembako G)
  if (
    priKbli === KbliCategoryEnum.H &&
    !secKbli &&
    /\b(?:sembako|bahan pangan|pasokan pasar|distribusi barang|truk logistik)\b/i.test(text)
  ) {
    secKbli = KbliCategoryEnum.G;
    secKbliImpact = priKbliImpact === KbliImpactEnum.INCREASE_NTB ? KbliImpactEnum.INCREASE_NTB : KbliImpactEnum.DECREASE_NTB;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/spillover-concordance.test.ts`
Expected: PASS (all 2 tests passing).

- [ ] **Step 5: Commit changes**

```bash
git add tests/spillover-concordance.test.ts server/services/llm/classifier.ts
git commit -m "feat(llm): implement multi-sectoral spillover concordance matrix"
```

---

### Task 6: Heuristic Confidence Calibration Engine

**Files:**
- Modify: `server/services/llm/classifier.ts:830-898`
- Test: `tests/confidence-calibration.test.ts`

**Interfaces:**
- Consumes: `rawConfidence: number`, `classification: LlmClassificationOutput`, `article: ArticleClassificationInput`
- Produces: `calibrateClassificationConfidence(rawConfidence: number, classification: LlmClassificationOutput, article: ArticleClassificationInput): number`

- [ ] **Step 1: Write the failing test**

Create `tests/confidence-calibration.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calibrateClassificationConfidence } from '../server/services/llm/classifier';
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
      summary: 'Bupati Tana Tidung meninjau progres pembangunan Gedung Puspem KTT di Tideng Pale senilai Rp 45 miliar yang mencapai 80 persen.',
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/confidence-calibration.test.ts`
Expected: FAIL (`calibrateClassificationConfidence` not defined).

- [ ] **Step 3: Implement `calibrateClassificationConfidence`**

In `server/services/llm/classifier.ts`:
Implementasikan kalibrasi empiris:
```typescript
export function calibrateClassificationConfidence(
  rawConfidence: number,
  classification: LlmClassificationOutput,
  article: ArticleClassificationInput,
): number {
  if (!classification.is_economic_phenomenon) {
    return Math.max(0.6, Math.min(0.99, rawConfidence));
  }

  const combinedText = `${article.title} ${article.snippetText} ${classification.summary}`.toLowerCase();
  let empiricalScore = 0.5;

  // 1. Kepastian Spasial (+0.15 s.d +0.20)
  if (classification.geographic_scope === 'KTT_LOCAL') {
    empiricalScore += 0.20;
  } else if (classification.geographic_scope === 'KALTARA_PROVINCIAL') {
    empiricalScore += 0.12;
  } else if (classification.geographic_scope === 'NATIONAL_MACRO_IMPACT') {
    empiricalScore += 0.08;
  }

  // 2. Kepadatan Data Kuantitatif (+0.15)
  const hasQuantitativeData = /\b(?:\d+|rp|persen|%|miliar|juta|ton|kg|hektare)\b/i.test(combinedText);
  if (hasQuantitativeData) {
    empiricalScore += 0.15;
  }

  // 3. Ketepatan Taksonomi KBLI & Pengeluaran (+0.10)
  if (classification.kbli_category && classification.expenditure_component) {
    empiricalScore += 0.10;
  }

  // 4. Penalti jika wacana tanpa kepastian angka (-0.15)
  const isVagueDiscourse = /\b(?:direncanakan|wacana|masih dibahas|akan dikaji|potensi)\b/i.test(combinedText) && !hasQuantitativeData;
  if (isVagueDiscourse) {
    empiricalScore -= 0.15;
  }

  // Pembobotan: 35% keyakinan model + 65% bukti empiris teks
  const calibrated = rawConfidence * 0.35 + empiricalScore * 0.65;
  return Math.round(Math.max(0.55, Math.min(0.98, calibrated)) * 100) / 100;
}
```

Integrasikan ke dalam `mapClassificationToPersistence` sehingga `llmConfidence` yang disimpan ke database selalu terkalibrasi.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/confidence-calibration.test.ts`
Expected: PASS (all 2 tests passing).

- [ ] **Step 5: Commit changes**

```bash
git add tests/confidence-calibration.test.ts server/services/llm/classifier.ts
git commit -m "feat(llm): implement heuristic confidence calibration engine"
```

---

### Task 7: Comprehensive Regression Verification & VPS Deployment

**Files:**
- Test: All tests in `tests/`
- Command: `npx vitest run`, `npx vue-tsc --noEmit`

- [ ] **Step 1: Run complete Vitest suite**

Run: `npx vitest run`
Expected: All test suites PASS (including the 5 new test files).

- [ ] **Step 2: Run complete Vue TypeScript typecheck**

Run: `npx vue-tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Push changes to GitHub repository**

```bash
git push origin main
```

- [ ] **Step 4: Pull and rebuild on VPS hosting**

Connect via SSH to VPS `103.58.100.169`, run `git pull`, `npm run build`, and `pm2 restart sipena-ktt`. Verify HTTP 200 response on `https://sipena6503.caplinlab.my.id/api/health`.

---

## Plan Self-Review Checklist

- [x] Spec coverage: Semua 6 kelemahan (Spatial gazetteer, Temporal disambiguation, BPS price vs output matrix, Adaptive paragraph extractor, Multi-sectoral concordance, Confidence calibration) tercakup dalam task mandiri.
- [x] No placeholders: Tidak ada kata "TBD", "TODO", atau kode yang tidak lengkap di seluruh file rencana.
- [x] Type consistency: Tipe data selaras dengan `KbliCategoryEnum`, `KbliImpactEnum`, `ExpenditureComponentEnum`, dan `ExpenditureImpactEnum`.
