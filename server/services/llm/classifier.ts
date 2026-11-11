// server/services/llm/classifier.ts
import {
  ArticleSourceTypeEnum,
  LlmStatusEnum,
  VerificationStatusEnum,
} from '../../../shared/enums/pdrb';
import {
  LlmClassificationRawSchema,
  type LlmClassificationOutput,
} from '../../../shared/schemas/llm-output.schema';

export const SIPENA_SYSTEM_INSTRUCTION = `Anda adalah Analis Senior Neraca Wilayah (PDRB) Badan Pusat Statistik (BPS) Kabupaten Tana Tidung, Provinsi Kalimantan Utara.

TUGAS ANDA:
Mengevaluasi judul dan cuplikan teks berita (150-250 kata pertama), lalu menghasilkan objek JSON terstruktur yang menentukan apakah berita tersebut merupakan FENOMENA EKONOMI yang relevan terhadap penghitungan atau proyeksi PDRB Kabupaten Tana Tidung dari dua sisi sekaligus: Lapangan Usaha (KBLI A-U) dan Pengeluaran.

KONTEKS EKONOMI KABUPATEN TANA TIDUNG:
- Komoditas & pendorong utama: kelapa sawit (TBS, CPO, pabrik sawit), pertambangan batubara/migas, kehutanan/kayu/perhutanan sosial, perikanan tangkap & budidaya tambak (bandeng/udang), konstruksi infrastruktur pusat pemerintahan & jalan poros, transportasi sungai/angkutan pedalaman (speedboat, subsidi ongkos angkut), serta transfer fiskal daerah (APBD, DBH Migas/Kehutanan).
- Berita nasional hanya dianggap relevan apabila memuat transmisi harga komoditas utama Kaltara/KTT, kebijakan fiskal/transfer ke daerah, ongkos logistik, atau regulasi sektor usaha yang berdampak langsung pada unit ekonomi di Tana Tidung.

ATURAN KLASIFIKASI:
1. is_economic_phenomenon = true HANYA JIKA terdapat bukti atau sinyal nyata perubahan:
   (a) volume produksi/output barang dan jasa (panen, proyek fisik berjalan, pembukaan pabrik/lahan, gangguan pasokan, penutupan tambang/akses jalan);
   (b) tingkat harga komoditas produsen atau indeks harga konsumen/bahan pokok;
   (c) arus realisasi belanja/investasi/konsumsi (APBD, kredit/KUR, bansos, belanja modal, ekspor/impor antar daerah).
2. Jika berita hanya bersifat seremonial murni tanpa nilai/komitmen ekonomi konkret, pelantikan pejabat, rapat rutin tanpa kebijakan ekonomi, kriminalitas umum, politik/pilkada tanpa program ekonomi terukur, olahraga, atau hiburan: WAJIB isi is_economic_phenomenon = false, isi rejection_reason secara singkat, dan set kbli_category, kbli_impact, expenditure_component, expenditure_impact menjadi null.
3. summary: Tulis 2-3 kalimat ringkas, objektif, bahasa Indonesia baku (EYD V), fokus pada substansi ekonomi (apa yang terjadi, komoditas/sektor, besaran angka bila ada, dan implikasi terhadap Tana Tidung). Jangan menyalin kalimat promosi media.
4. quarter & year: Gunakan tanggal rilis berita (WITA) sebagai dasar (Jan-Mar = 1, Apr-Jun = 2, Jul-Sep = 3, Okt-Des = 4), KECUALI isi berita secara eksplisit melaporkan realisasi periode triwulan/tahun tertentu yang berbeda.`;

export interface ArticleClassificationInput {
  title: string;
  sourcePortal: string;
  sourceType: ArticleSourceTypeEnum;
  matchedKeyword?: string | null;
  publishedAtWita: string;
  defaultQuarter: 1 | 2 | 3 | 4;
  defaultYear: number;
  snippetText: string;
}

export function buildClassificationPrompt(params: ArticleClassificationInput): string {
  return [
    `SUMBER: ${params.sourcePortal} (${params.sourceType})`,
    params.matchedKeyword ? `KEYWORD NASIONAL TERJARING: ${params.matchedKeyword}` : null,
    `TANGGAL RILIS (WITA): ${params.publishedAtWita} (Default Triwulan ${params.defaultQuarter} Tahun ${params.defaultYear})`,
    `JUDUL BERITA: ${params.title}`,
    `TEKS BERITA (150-250 KATA PERTAMA):\n${params.snippetText}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

function stripMarkdownJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match?.[1]?.trim() ?? trimmed;
}

export function parseAndValidateLlmJson(rawText: string): LlmClassificationOutput {
  const cleaned = stripMarkdownJsonFence(rawText);
  const parsedJson = JSON.parse(cleaned) as unknown;
  const validated = LlmClassificationRawSchema.parse(parsedJson);

  return {
    ...validated,
    rejection_reason: validated.is_economic_phenomenon ? null : validated.rejection_reason,
  };
}

export function mapClassificationToPersistence(
  classification: LlmClassificationOutput,
  llmModel: string,
) {
  if (!classification.is_economic_phenomenon) {
    return {
      isEconomicPhenomenon: false,
      summary: classification.summary,
      kbliCategory: null,
      kbliImpact: null,
      expenditureComponent: null,
      expenditureImpact: null,
      quarter: classification.quarter,
      year: classification.year,
      llmModel,
      llmStatus: LlmStatusEnum.SUCCESS,
      llmError: classification.rejection_reason ?? null,
      llmConfidence: classification.confidence,
      verificationStatus: VerificationStatusEnum.IGNORED,
    };
  }

  return {
    isEconomicPhenomenon: true,
    summary: classification.summary,
    kbliCategory: classification.kbli_category,
    kbliImpact: classification.kbli_impact,
    expenditureComponent: classification.expenditure_component,
    expenditureImpact: classification.expenditure_impact,
    quarter: classification.quarter,
    year: classification.year,
    llmModel,
    llmStatus: LlmStatusEnum.SUCCESS,
    llmError: null,
    llmConfidence: classification.confidence,
    verificationStatus: VerificationStatusEnum.PENDING,
  };
}

