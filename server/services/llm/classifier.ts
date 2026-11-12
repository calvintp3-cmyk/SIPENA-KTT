// server/services/llm/classifier.ts
import {
  ArticleSourceTypeEnum,
  EXPENDITURE_IMPACT_LABELS,
  KBLI_IMPACT_LABELS,
  LlmStatusEnum,
  VerificationStatusEnum,
  type ExpenditureComponentEnum,
  type ExpenditureImpactEnum,
  type KbliCategoryEnum,
  type KbliImpactEnum,
} from '../../../shared/enums/pdrb';
import {
  LlmClassificationRawSchema,
  type LlmClassificationOutput,
} from '../../../shared/schemas/llm-output.schema';
import { formatDateId } from '../../../shared/utils/period';

export const COMPRESS_MAX_WORDS_FOR_LLM = 290;
export const COMPRESS_MAX_CHARS_FOR_LLM = 1900;

export const SIPENA_SYSTEM_INSTRUCTION_FULL = `Anda adalah Analis Senior Neraca Wilayah (PDRB) Badan Pusat Statistik (BPS) Kabupaten Tana Tidung (KTT), Provinsi Kalimantan Utara.

TUGAS ANDA:
Mengevaluasi judul dan cuplikan berita lalu menghasilkan SATU objek JSON terstruktur yang menentukan:
(1) cakupan geografis faktual berita terhadap Kabupaten Tana Tidung (geographic_scope),
(2) apakah berita merupakan FENOMENA EKONOMI nyata untuk PDRB Kab. Tana Tidung (is_economic_phenomenon), serta
(3) pemetaan tepat ke Lapangan Usaha KBLI 2025 (A-V) dan Komponen Pengeluaran beserta arah dampaknya.

ATURAN GERBANG GEOGRAFIS (EVALUASI TERLEBIH DAHULU PADA FIELD geographic_scope):
- KTT_LOCAL: Peristiwa langsung terjadi di wilayah Kabupaten Tana Tidung (Tideng Pale, Kecamatan Sesayap, Sesayap Hilir, Betayau, Muruk Rian, Tana Lia, Bebatu, Sepala Dalung, Buong Baru, Pemkab KTT, KTT).
- KALTARA_PROVINCIAL: Kebijakan, data statistik, penetapan indeks harga resmi (mis. Indeks K/TBS Disbun Kaltara, BI Kaltara, APBD Pemprov Kaltara), infrastruktur strategis Kaltara, atau proyek perhubungan antar-kabupaten Kalimantan Utara yang bertransmisi langsung ke perekonomian KTT.
- NATIONAL_MACRO_IMPACT: Kebijakan fiskal nasional (APBN, TKD/DBH/DAU/DAK Kemenkeu), moneter (BI Rate/inflasi), harga acuan komoditas ekspor utama (HBA batubara, CPO/PKO, BBM subsidi ESDM), atau subsidi angkutan logistik pusat yang relevan memengaruhi produsen/konsumen KTT.
- OTHER_REGION_IRRELEVANT: Peristiwa lokal eksklusif kabupaten/kota/provinsi LAIN (mis. Pemkab Nunukan/Krayan/Sebatik, Pemkot Tarakan, Pemkab Bulungan/Tanjung Selor, Pemkab Malinau, Disbun Riau/Jambi/Sumut/Aceh/Kalteng, pelabuhan/APBD provinsi lain) TANPA keterkaitan langsung ke Kab. Tana Tidung dan BUKAN indikator makro acuan nasional.
  -> ATURAN MUTLAK: Jika geographic_scope = OTHER_REGION_IRRELEVANT, WAJIB set is_economic_phenomenon = false, isi rejection_reason secara spesifik (mis. "Peristiwa lokal daerah lain di luar Kab. Tana Tidung"), dan set seluruh field KBLI/Pengeluaran = null.
  -> Jangan pernah berasumsi berita berasal dari KTT hanya karena matchedKeyword menyertakan nama komoditas atau KTT.

ATURAN FENOMENA EKONOMI (is_economic_phenomenon):
1. Bernilai true HANYA JIKA terdapat bukti atau sinyal nyata PERUBAHAN atau REALISASI ekonomi terukur pada:
   (a) volume produksi/output riil (panen, produksi tambang/PKS, proyek fisik konstruksi berjalan, penangkapan/budidaya ikan, operasional layanan kesehatan/pendidikan/pelabuhan);
   (b) pergeseran tingkat harga produsen, tarif angkutan, BBM, atau indeks harga konsumen/bahan pokok (perubahan harga != 0);
   (c) arus realisasi belanja, investasi modal (PMTB/LKPM/PBG/BBNKB), konsumsi rumah tangga/LNPRT, kas/realisasi APBD (LRA), atau arus ekspor/impor antar daerah.
2. WAJIB bernilai false apabila berita berupa:
   - pengumuman tarif/harga yang TIDAK BERUBAH / tetap / stagnan (Delta = 0, misalnya "Tarif Listrik PLN Bulan Ini Tetap");
   - sekadar rekap/grafik data historis lama tanpa kejadian ekonomi baru pada periode berjalan;
   - seremonial murni/apel/pelantikan/halal bi halal/rapat koordinasi tanpa angka anggaran/proyek/komitmen ekonomi;
   - kriminalitas umum, kecelakaan lalu lintas tunggal, hiburan, jadwal sholat/bola, atau politik praktis tanpa program ekonomi terukur.

KAMUS KATEGORI KBLI 2025 (PERATURAN BPS NO. 7 TAHUN 2025 — 22 KATEGORI A-V):
- A: Pertanian, Kehutanan, dan Perikanan (sawit mentah/TBS kebun, padi, hortikultura, kayu bulat, perikanan tangkap & tambak).
- B: Pertambangan dan Penggalian (batubara termasuk pencucian/benefisiasi, migas, kuari pasir/batu/sirtu).
- C: Industri (KBLI 2025: pengolahan TBS->CPO di PKS, kayu lapis/chipmill, industri makanan-minuman/IKM olahan).
- D: Penyediaan Listrik, Gas, Uap/Air Panas, dan Udara Dingin (pembangkit PLTD/PLTS/EBT, transmisi/pasokan listrik PLN, perdagangan karbon sektor energi).
- E: Penyediaan Air; Pengelolaan Air Limbah, Penanganan Limbah, dan Remediasi (PDAM Tirta Taka, SPAM, persampahan).
- F: Konstruksi (pembangunan fisik Puspem KTT, jalan poros, jembatan, irigasi, pelabuhan, serta konstruksi gedung sekolah/RSUD).
- G: Perdagangan Besar dan Eceran (niaga sembako, BBM, material bangunan, pasar rakyat, ritel, e-commerce; CATATAN KBLI 2025: tidak lagi mencakup bengkel/reparasi kendaraan).
- H: Transportasi dan Penyimpanan (pelabuhan Sesayap/Tideng Pale, speedboat, feri, tongkang logistik, subsidi ongkos angkut, jasa ekspedisi/ojek daring).
- I: Aktivitas Penyediaan Akomodasi dan Makan Minum (hotel, penginapan, homestay, restoran, kafe, katering, platform OTA).
- J: Aktivitas Penerbitan, Penyiaran, serta Produksi dan Distribusi Konten (media daring/cetak, penyiaran TV/radio, konten digital).
- K: Aktivitas Telekomunikasi, Pemrograman Komputer, Konsultansi, Infrastruktur Komputasi, dan Jasa Informasi Lainnya (BTS blankspot, internet desa, sistem/perangkat lunak, cloud).
- L: Aktivitas Keuangan dan Asuransi (perbankan BPD Kaltimtara, KUR/kredit usaha, koperasi simpan pinjam, asuransi, fintech).
- M: Aktivitas Real Estat (pengembang perumahan, sewa lahan/ruko/gedung/gudang penyimpanan mandiri, kawasan industri).
- N: Aktivitas Profesional, Ilmiah, dan Teknis (konsultan perencana teknik/AMDAL, akuntan, hukum, survei/sertifikasi).
- O: Aktivitas Administratif dan Penunjang Usaha (penyewaan alat berat/armada, biro perjalanan, outsourcing tenaga kerja, kebersihan).
- P: Administrasi Pemerintahan dan Pertahanan, serta Jaminan Sosial Wajib (operasional umum Pemkab KTT, realisasi APBD/LRA umum, TKD/DBH/DAK/DAU, pajak/retribusi daerah).
- Q: Pendidikan (layanan operasional sekolah, penyaluran BOS/BOSDA, beasiswa daerah, pelatihan vokasi/BLK; bukan bangunan fisiknya).
- R: Aktivitas Kesehatan Manusia dan Aktivitas Sosial (layanan RSUD Akhmad Berahim, puskesmas, klinik, bansos/panti sosial; bukan bangunan fisiknya).
- S: Kesenian, Olahraga, dan Rekreasi (Festival Budaya Irau, daya tarik wisata, olahraga, pertunjukan hiburan).
- T: Aktivitas Jasa Lainnya (ormas, rumah ibadah, salon/laundry, serta bengkel/reparasi mobil & sepeda motor).
- U: Aktivitas Rumah Tangga Sebagai Pemberi Kerja dan Produksi Rumah Tangga untuk Keperluan Sendiri.
- V: Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya.

ATURAN PEMBATASAN PRODUKSI (PEDOMAN PDRB BPS):
1. Unit Pemerintah Non-Administrasi: Proyek pembangunan gedung sekolah atau gedung RSUD masuk F (Konstruksi), BUKAN Q atau R. Operasional pengajaran/beasiswa masuk Q; pelayanan medis/kesehatan masuk R; tata kelola umum/pajak/APBD/DBH masuk P.
2. Jasa Intermediasi Digital: Platform e-commerce ritel masuk G, kurir/ojol logistik masuk H, OTA reservasi hotel masuk I (bukan K).
3. Bahan Mentah vs Olahan: TBS kelapa sawit mentah/kayu bulat/ikan segar = A; pengolahan pabrik CPO/PKS/kayu lapis = C.

ATURAN 6 KOMPONEN PENGELUARAN & PROKSI SPESIFIK KTT:
- PK_RT: Belanja konsumsi akhir rumah tangga di KTT (sembako, listrik/air rumah tangga, sandang, hiburan, transportasi pribadi). DILARANG dipakai untuk ekspor komoditas mentah (batubara/CPO/TBS).
- PK_LNPRT: Operasional organisasi nonprofit melayani RT (masjid/gereja/rumah ibadah, ormas, lembaga adat, partai politik, LSM lokal); proyek fisik skala besar APBD tetap masuk PMTB.
- PK_P: Belanja pegawai OPD/ASN (5.1.01 gaji/TPP), belanja barang-jasa operasional (5.1.02 rutin, perjadin, BOS/BOK/BLUD), dan hibah/bansos rutin pemda.
- PMTB: Belanja modal aset tetap & pembentukan investasi fisik (konstruksi gedung/jalan/pelabuhan, mesin, alat berat, kendaraan dinas/niaga termasuk sinyal BBNKB/PKB, realisasi LKPM BKPM, PBG).
- INVENTORY_CHANGE: Perubahan stok fisik komoditas (penumpukan/penarikan stockpile batubara = S_akhir - S_awal, stok beras gudang Bulog, persediaan bahan baku/pabrik).
- NET_EXPORT: Arus barang/jasa keluar KTT (pengapalan batubara, CPO/TBS, kayu olahan, perikanan) dikurangi barang masuk KTT (bongkar muat kapal/feri logistik).
  -> ATURAN TANDA DAMPAK NET_EXPORT: Pengapalan/ekspor keluar KTT naik => INCREASE_REAL; lonjakan impor/barang masuk ke KTT (M naik tanpa ekspor naik) => DECREASE_REAL; kenaikan harga komoditas ekspor murni => INCREASE_DEFLATOR; penurunan harga komoditas ekspor => DECREASE_DEFLATOR.

ATURAN DUA SUMBU DAMPAK (VOLUME RIIL/ADHK VS HARGA/ADHB):
- Sisi Lapangan Usaha: INCREASE_NTB / DECREASE_NTB untuk pergeseran volume produksi/proyek/kapasitas; INCREASE_PRICE / DECREASE_PRICE untuk pergerakan harga produsen/eceran/tarif.
- Sisi Pengeluaran: INCREASE_REAL / DECREASE_REAL untuk pergeseran volume riil belanja/konsumsi/investasi/ekspor neto; INCREASE_DEFLATOR / DECREASE_DEFLATOR untuk tekanan indeks harga implisit (IHK, IHP, biaya logistik).

ATURAN PENULISAN summary & quarter/year:
- summary: 3-5 kalimat bahasa Indonesia baku (50-110 kata) memuat peristiwa, pelaku & kecamatan/lokus, angka/nilai bila ada di teks, serta mekanisme dampaknya ke PDRB KTT.
- quarter & year: Gunakan tanggal rilis berita (WITA) kecuali teks menyebut eksplisit realisasi triwulan/tahun tertentu yang berbeda.

CONTOH KALIBRASI (FEW-SHOT):
1. "Harga TBS Sawit KTT Naik Rp 2.980/kg, Pengapalan dari Sesayap Hilir Melonjak" -> geographic_scope="KTT_LOCAL", is_economic_phenomenon=true, kbli_category="A", kbli_impact="INCREASE_PRICE", expenditure_component="NET_EXPORT", expenditure_impact="INCREASE_REAL".
2. "Pemkab Nunukan Salurkan Subsidi Ongkos Angkut Udara Krayan Rp 912 Juta" (tidak ada penyebutan KTT) -> geographic_scope="OTHER_REGION_IRRELEVANT", is_economic_phenomenon=false, seluruh kbli/expenditure=null.
3. "PLN Pastikan Tarif Listrik Nonsubsidi Februari 2026 Tetap Tidak Berubah" -> geographic_scope="NATIONAL_MACRO_IMPACT", is_economic_phenomenon=false, rejection_reason="Pengumuman tarif statis tanpa perubahan harga ataupun gangguan pasokan listrik.", seluruh kbli/expenditure=null.
4. Berita April melaporkan "Realisasi Proyek Jalan Poros & Gedung Puspem KTT Triwulan I 2026 Capai Rp 120 Miliar" -> geographic_scope="KTT_LOCAL", is_economic_phenomenon=true, kbli_category="F", kbli_impact="INCREASE_NTB", expenditure_component="PMTB", expenditure_impact="INCREASE_REAL", quarter=1, year=2026.
5. "Pemkab Tana Tidung Cairkan TPP ASN dan Operasional RSUD Akhmad Berahim" -> geographic_scope="KTT_LOCAL", is_economic_phenomenon=true, kbli_category="P" (atau "R" jika fokus layanan RSUD), kbli_impact="INCREASE_NTB", expenditure_component="PK_P", expenditure_impact="INCREASE_REAL".`;

export const SIPENA_SYSTEM_INSTRUCTION = SIPENA_SYSTEM_INSTRUCTION_FULL;

export const SIPENA_SYSTEM_INSTRUCTION_COMPACT = `Analis PDRB BPS Kab. Tana Tidung (KTT), Kalimantan Utara. Keluarkan HANYA 1 objek JSON valid tanpa teks tambahan, mengikuti urutan field ini:
{"geographic_scope","is_economic_phenomenon","rejection_reason","summary","kbli_category","kbli_impact","expenditure_component","expenditure_impact","quarter","year","confidence"}

1. GEOGRAPHIC_SCOPE:
- "KTT_LOCAL": kejadian di Kab. Tana Tidung (Tideng Pale, Sesayap, Betayau, Muruk Rian, Tana Lia, Bebatu, Sepala Dalung, Pemkab KTT).
- "KALTARA_PROVINCIAL": kebijakan/harga resmi Pemprov/BI/Disbun Kaltara yang berdampak langsung ke KTT.
- "NATIONAL_MACRO_IMPACT": kebijakan fiskal/moneter APBN/DBH/HBA/CPO/BBM pusat berimbas ke KTT.
- "OTHER_REGION_IRRELEVANT": kejadian lokal daerah lain (Nunukan/Krayan/Sebatik, Tarakan, Bulungan, Malinau, Riau/Jambi/Kalteng) tanpa KTT & bukan kebijakan makro nasional -> WAJIB is_economic_phenomenon=false & 4 field PDRB null.

2. IS_ECONOMIC_PHENOMENON:
- true hanya jika ada perubahan/realisasi nyata output riil, harga/tarif (!=0), investasi, konsumsi, APBD, atau ekspor-impor.
- false jika tarif/harga TETAP/stagnan (Delta=0), rekap grafik historis tanpa kejadian baru, seremonial/rapat tanpa angka ekonomi, kriminalitas, hiburan, olahraga -> set 4 field PDRB=null & isi rejection_reason.

3. KBLI 2025 (A-V):
A=Pertanian/Kehutanan/Perikanan(TBS mentah,ikan,kayu); B=Pertambangan/Penggalian(batubara,migas,kuari); C=Industri(PKS CPO,chipmill,IKM olahan); D=Listrik/Gas; E=Air/PDAM/Limbah; F=Konstruksi(termasuk bangun gedung sekolah/RSUD/jalan); G=Perdagangan Besar/Eceran(sembako,BBM,tanpa bengkel); H=Transportasi/Gudang(pelabuhan,speedboat,SOA,kurir); I=Akomodasi/Makan Minum; J=Penerbitan/Penyiaran/Konten; K=Telekomunikasi/IT/BTS/Internet; L=Keuangan/Asuransi/KUR; M=Real Estat; N=Jasa Profesional/Konsultan/Teknis; O=Jasa Administratif/Sewa Alat Berat/Travel; P=Adm Pemerintahan/APBD/DBH/Pajak; Q=Layanan Pendidikan/BOS; R=Layanan Kesehatan RSUD/Sosial; S=Kesenian/Wisata/Olahraga; T=Jasa Lainnya(Ormas,Rumah Ibadah,Salon,Bengkel/Reparasi Motor-Mobil); U=Jasa Rumah Tangga; V=Badan Internasional.

4. PENGELUARAN (6 KOMPONEN):
PK_RT=Konsumsi RT KTT (bukan ekspor sawit/batubara); PK_LNPRT=Operasional Masjid/Ormas/Adat; PK_P=Belanja pegawai/barang-jasa operasional OPD & BOS/bansos; PMTB=Belanja modal/konstruksi/mesin/alat berat/BBNKB/LKPM; INVENTORY_CHANGE=Perubahan stok(stockpile batubara/Bulog); NET_EXPORT=Ekspor keluar minus Impor masuk KTT (ekspor naik=INCREASE_REAL; impor masuk naik=DECREASE_REAL; harga ekspor naik=INCREASE_DEFLATOR).

5. DAMPAK:
kbli_impact: INCREASE_NTB | DECREASE_NTB | INCREASE_PRICE | DECREASE_PRICE.
expenditure_impact: INCREASE_REAL | DECREASE_REAL | INCREASE_DEFLATOR | DECREASE_DEFLATOR.
summary: 3-5 kalimat bahasa Indonesia baku (50-110 kata). quarter (1-4) & year ikuti periode kejadian bila eksplisit di teks, else gunakan default tanggal rilis.`;

export interface ArticleClassificationInput {
  title: string;
  sourcePortal: string;
  sourceType: ArticleSourceTypeEnum;
  matchedKeyword?: string | null;
  defaultKbliHint?: string | null;
  defaultExpenditureHint?: string | null;
  publishedAtWita: string;
  defaultQuarter: 1 | 2 | 3 | 4;
  defaultYear: number;
  snippetText: string;
}

/**
 * Memampatkan cuplikan teks berita yang disimpan (300-450 kata) ke anggaran optimal pra-LLM
 * (default <= 290 kata / <= 1.900 karakter) agar hemat TPM/TPD Groq & OpenRouter serta tetap memotong rapi di akhir kalimat.
 */
export function compressArticleTextForLlm(
  rawText: string,
  maxWords: number = COMPRESS_MAX_WORDS_FOR_LLM,
  maxChars: number = COMPRESS_MAX_CHARS_FOR_LLM,
): string {
  const cleaned = rawText.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const words = cleaned.split(' ').filter(Boolean);
  if (words.length <= maxWords && cleaned.length <= maxChars) {
    return cleaned;
  }

  const kept: string[] = [];
  let charCount = 0;
  for (const word of words) {
    if (kept.length >= maxWords) break;
    const nextLength = kept.length === 0 ? word.length : charCount + 1 + word.length;
    if (nextLength > maxChars) break;
    kept.push(word);
    charCount = nextLength;
  }

  const candidate = kept.join(' ');
  const minSentenceCutIdx = Math.floor(candidate.length * 0.6);
  for (let i = candidate.length - 1; i >= minSentenceCutIdx; i -= 1) {
    const ch = candidate[i];
    if (ch === '.' || ch === '!' || ch === '?') {
      return candidate.slice(0, i + 1).trim();
    }
  }

  return candidate;
}

export function buildClassificationPrompt(params: ArticleClassificationInput): string {
  const hintParts: string[] = [];
  if (params.defaultKbliHint) {
    hintParts.push(`KBLI Default=${params.defaultKbliHint}`);
  }
  if (params.defaultExpenditureHint) {
    hintParts.push(`Pengeluaran Default=${params.defaultExpenditureHint}`);
  }

  const compressedSnippet = compressArticleTextForLlm(params.snippetText);

  return [
    `SUMBER: ${params.sourcePortal} (${params.sourceType})`,
    params.matchedKeyword
      ? `KEYWORD NASIONAL TERJARING: ${params.matchedKeyword} (Evaluasi lokus geografis tetap berdasar fakta isi teks; jangan mengasumsikan lokasi di KTT bila isi teks khusus daerah lain)`
      : null,
    hintParts.length > 0
      ? `PETUNJUK KATEGORI KEYWORD: ${hintParts.join(', ')} (Gunakan sebagai acuan awal apabila selaras dengan isi artikel)`
      : null,
    `TANGGAL RILIS (WITA): ${params.publishedAtWita} (Default Triwulan ${params.defaultQuarter} Tahun ${params.defaultYear})`,
    `JUDUL BERITA: ${params.title}`,
    `TEKS BERITA (RINGKASAN FAKTUAL):\n${compressedSnippet}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

function stripMarkdownJsonFence(raw: string): string {
  let cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();

  const fenceMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(cleaned);
  if (fenceMatch?.[1]) {
    cleaned = fenceMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
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
  if (
    !classification.is_economic_phenomenon ||
    classification.geographic_scope === 'OTHER_REGION_IRRELEVANT'
  ) {
    return {
      geographicScope: classification.geographic_scope,
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
      llmError:
        classification.rejection_reason ??
        (classification.geographic_scope === 'OTHER_REGION_IRRELEVANT'
          ? 'Berita cakupan wilayah lain tanpa relevansi langsung ke Kab. Tana Tidung.'
          : null),
      llmConfidence: classification.confidence,
      verificationStatus: VerificationStatusEnum.IGNORED,
    };
  }

  return {
    geographicScope: classification.geographic_scope,
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

export interface BrsSynthesisArticleInput {
  id: string;
  title: string;
  summary: string | null;
  sourcePortal: string;
  publishedAt: Date | string;
  kbliCategory: KbliCategoryEnum | null;
  kbliImpact: KbliImpactEnum | null;
  expenditureComponent: ExpenditureComponentEnum | null;
  expenditureImpact: ExpenditureImpactEnum | null;
}

export function buildBrsSynthesisPrompts(params: {
  periodLabel: string;
  dimension: 'kbli' | 'expenditure';
  targetLabel: string;
  style: 'BRS_FORMAL' | 'EXECUTIVE_BRIEF' | 'BULLET_POINTS';
  articles: ReadonlyArray<BrsSynthesisArticleInput>;
}): { systemInstruction: string; userPrompt: string } {
  const styleGuideMap: Record<typeof params.style, string> = {
    BRS_FORMAL:
      'Gaya Berita Resmi Statistik (BRS) BPS RI formal: 2-3 subjudul (`## ...`), paragraf analitis lugas, memisahkan faktor pendorong riil/NTB dan tekanan harga/kendala lapangan.',
    EXECUTIVE_BRIEF:
      'Gaya Ringkasan Eksekutif Pimpinan BPS / Kepala Daerah: ringkas, padat, maksimal 3 bagian (`## Ringkasan Eksekutif`, `## Sinyal Lapangan Utama`, `## Implikasi Rekonsiliasi`).',
    BULLET_POINTS:
      'Gaya Butir-Butir Fenomena Terstruktur (`## Butir Fenomena` + daftar `- ...` diikuti `## Catatan Metodologis Nerwilis`) siap tempel ke tabel lampiran.',
  };

  const dossierLines = params.articles.map((art, i) => {
    const kbliImpact = art.kbliImpact ? KBLI_IMPACT_LABELS[art.kbliImpact] : '-';
    const expImpact = art.expenditureImpact
      ? EXPENDITURE_IMPACT_LABELS[art.expenditureImpact]
      : '-';
    return [
      `[${i + 1}] Judul: ${art.title}`,
      `Portal & Tgl: ${art.sourcePortal} (${formatDateId(art.publishedAt)})`,
      `Pemetaan PDRB: KBLI=${art.kbliCategory ?? '-'} (${kbliImpact}); Pengeluaran=${art.expenditureComponent ?? '-'} (${expImpact})`,
      `Ringkasan Terverifikasi: ${art.summary || art.title}`,
    ].join('\n');
  });

  const systemInstruction = `Anda adalah Statistisi Ahli Fungsi Neraca Wilayah dan Analisis Statistik (Nerwilis) BPS Kabupaten Tana Tidung.
Tugas: Menyusun draf sintesis narasi kualitatif PDRB berdasarkan kumpulan bukti fenomena media yang telah diverifikasi sesuai KBLI 2025 (A-V) dan Pedoman PDRB BPS.

ATURAN KETAT (ANTI-HALUSINASI):
1. Gunakan HANYA fakta dari sumber bernomor [1]..[${params.articles.length}] yang diberikan.
2. DILARANG KERAS mengarang angka persentase pertumbuhan ekonomi (y-on-y, q-to-q, c-to-c), share PDRB, atau nominal Rupiah yang tidak tertera eksplisit pada ringkasan sumber.
3. Setiap klaim fakta atau peristiwa WAJIB mencantumkan nomor sitasi di akhir kalimat dalam format kurung siku, misalnya [1] atau [1][3].
4. Output berupa Markdown bersih berbahasa Indonesia baku (tanpa frontmatter, tanpa HTML, tanpa blok kode pembungkus).`;

  const userPrompt = [
    `Periode Analisis: ${params.periodLabel}`,
    `Dimensi & Target: ${params.dimension === 'kbli' ? 'Lapangan Usaha' : 'Pengeluaran'} — ${params.targetLabel}`,
    `Format Gaya Penulisan: ${styleGuideMap[params.style]}`,
    '',
    'BAHAN SUMBER TERVERIFIKASI:',
    ...dossierLines,
  ].join('\n\n');

  return { systemInstruction, userPrompt };
}
