# Spesifikasi Prompt & JSON Schema Gemini Flash — SIPENA KTT

**Versi Dokumen:** 1.0.0 (Single Source of Truth)  
**Model Target Utama:** `gemini-3.8-flash` (Google AI Studio Free Tier)  
**Model Fallback Rate-Limit:** `gemini-3.5-flash-lite`  
**SDK & API Resmi:** `@google/genai` (`>= 2.29.1`) menggunakan **Interactions API** (`client.interactions.create`) dengan `response_format` bertipe `text` + `mime_type: 'application/json'` + `schema`.

> **Catatan SDK Kritis:** Aplikasi **wajib** memakai `@google/genai` (`interactions.create` + `response_format`) dan model generasi Gemini 3 (`gemini-3.8-flash` / `gemini-3.5-flash-lite`). SDK usang `@google/generative-ai` serta model warisan (`gemini-1.5-*`, `gemini-2.0-*`, `gemini-2.5-*`) dilarang digunakan.

---

## 1. Definisi `system_instruction` Baku LLM

Instruksi sistem di bawah dirancang ringkas (hemat token ~350 input tokens) namun tegas dalam metodologi **System of National Accounts (SNA 2008) & Pedoman Penyusunan PDRB BPS** dengan fokus khusus pada struktur perekonomian **Kabupaten Tana Tidung (Kalimantan Utara)**:

```ts
// server/services/llm/classifier.ts
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
```

---

## 2. Aturan Khusus Penentuan `is_economic_phenomenon`

Agar AI Worker tidak menghasilkan *false positive* dari berita seremonial pemerintah daerah maupun *false negative* pada fenomena ekonomi tersirat, aturan berikut menjadi acuan mutlak (*gold standard*):

| Jenis Berita | Keputusan `is_economic_phenomenon` | Alasan Metodologis PDRB |
|---|---|---|
| Bupati meresmikan pasar rakyat baru atau membuka toko tani dengan omzet awal / alokasi anggaran Rp X miliar | **`true`** | Mencerminkan penambahan kapasitas distribusi/perdagangan (KBLI `G`) dan/atau belanja modal infrastruktur (`PMTB`). |
| Bupati menghadiri upacara HUT RI, halal bi halal, pelantikan camat, atau rapat koordinasi stunting tanpa rincian realisasi anggaran/output fisik ekonomi | **`false`** | Aktivitas seremonial/protokoler rutin tidak menambah nilai output riil maupun menggeser deflator harga sektoral di luar belanja rutin dasar. |
| Kebakaran hutan/banjir melumpuhkan jalan poros Tideng Pale–Sesayap selama 3 hari sehingga distribusi sembako & pengangkutan TBS sawit terhambat | **`true`** | Dampak langsung terhadap produksi/distribusi (KBLI `H` / `A` / `G`, menurunkan NTB & berpotensi menaikkan harga eceran/deflator `PK_RT`). |
| Kenaikan Harga Batubara Acuan (HBA) atau harga TBS Kelapa Sawit Kaltara periode berjalan | **`true`** | Transmisi langsung terhadap indeks harga produsen / NTB ADHB sektor Pertambangan (`B`) atau Pertanian (`A`) dan nilai Ekspor Bersih (`NET_EXPORT`). |
| Kasus pencurian kendaraan bermotor, narkoba, atau kecelakaan lalu lintas tunggal | **`false`** | Peristiwa kriminalitas/laka lantas individu tidak mencerminkan fenomena makro/sektoral PDRB. |
| Pemkab menggelar Festival Budaya Irau yang meningkatkan tingkat hunian hotel/penginapan hingga 90% dan omzet UMKM kuliner | **`true`** | Meskipun bertema budaya, teks memuat indikator ekonomi riil pada sektor Penyediaan Akomodasi & Makan Minum (`I`), Kesenian/Hiburan (`R`), dan Konsumsi Rumah Tangga (`PK_RT`). |
| Pengumuman jadwal pemadaman listrik rutin tanpa kerusakan pembangkit skala besar atau kenaikan tarif | **`false`** | Pemberitahuan teknis operasional rutin jangka pendek (jam-jaman) bukan fenomena pergeseran output triwulanan; kecuali pemadaman berkepanjangan akibat kerusakan pembangkit yang melumpuhkan pabrik/UMKM (`true`). |

---

## 3. Zod Schema & JSON Schema Structured Outputs

Skema disusun dalam `shared/schemas/llm-output.schema.ts`. Karena API Structured Outputs mendukung subset JSON Schema di mana batasan panjang string (`minLength`/`maxLength`) **tidak ditegakkan** oleh *constrained decoding* server LLM, panjang ringkasan serta validasi lintas-field (`is_economic_phenomenon` vs kolom klasifikasi `nullable`) divalidasi kembali di sisi server oleh **Zod `.superRefine()`**.

### 3.1 Definisi Zod Schema & JSON Schema (`shared/schemas/llm-output.schema.ts`)

```ts
// shared/schemas/llm-output.schema.ts
import { z } from 'zod';
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '../enums/pdrb';

export const LlmClassificationRawSchema = z
  .object({
    is_economic_phenomenon: z.boolean(),
    rejection_reason: z.string().trim().max(300).nullable(),
    summary: z.string().trim().min(20).max(800),
    kbli_category: z.nativeEnum(KbliCategoryEnum).nullable(),
    kbli_impact: z.nativeEnum(KbliImpactEnum).nullable(),
    expenditure_component: z.nativeEnum(ExpenditureComponentEnum).nullable(),
    expenditure_impact: z.nativeEnum(ExpenditureImpactEnum).nullable(),
    quarter: z.number().int().min(1).max(4),
    year: z.number().int().min(2000).max(2100),
    confidence: z.number().min(0).max(1),
  })
  .superRefine((data, ctx) => {
    if (data.is_economic_phenomenon) {
      if (!data.kbli_category) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['kbli_category'],
          message: 'kbli_category wajib terisi ketika is_economic_phenomenon = true.',
        });
      }
      if (!data.kbli_impact) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['kbli_impact'],
          message: 'kbli_impact wajib terisi ketika is_economic_phenomenon = true.',
        });
      }
      if (!data.expenditure_component) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expenditure_component'],
          message: 'expenditure_component wajib terisi ketika is_economic_phenomenon = true.',
        });
      }
      if (!data.expenditure_impact) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expenditure_impact'],
          message: 'expenditure_impact wajib terisi ketika is_economic_phenomenon = true.',
        });
      }
    } else {
      if (
        data.kbli_category !== null ||
        data.kbli_impact !== null ||
        data.expenditure_component !== null ||
        data.expenditure_impact !== null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['is_economic_phenomenon'],
          message: 'Seluruh kolom klasifikasi PDRB harus null ketika is_economic_phenomenon = false.',
        });
      }
    }
  });

export type LlmClassificationOutput = z.infer<typeof LlmClassificationRawSchema>;

// JSON Schema eksplisit untuk `response_format` Gemini Interactions API
// (kompatibel penuh dengan subset JSON Schema Gemini Structured Outputs)
export const LLM_CLASSIFICATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    is_economic_phenomenon: {
      type: 'boolean',
      description:
        'true apabila berita memuat fenomena ekonomi nyata (produksi, harga, investasi, konsumsi, fiskal, perdagangan) yang relevan bagi PDRB Kab. Tana Tidung; false untuk berita seremonial/kriminal/politik non-ekonomi.',
    },
    rejection_reason: {
      type: ['string', 'null'],
      description:
        'Alasan singkat 1 kalimat bila is_economic_phenomenon = false; wajib null bila is_economic_phenomenon = true.',
    },
    summary: {
      type: 'string',
      description:
        'Ringkasan padat 2-3 kalimat bahasa Indonesia baku berisi substansi ekonomi atau alasan pokok berita.',
    },
    kbli_category: {
      type: ['string', 'null'],
      enum: [...Object.values(KbliCategoryEnum), null],
      description:
        'Kode kategori KBLI 2020 (A s.d. U) sektor paling dominan terdampak; wajib null bila is_economic_phenomenon = false.',
    },
    kbli_impact: {
      type: ['string', 'null'],
      enum: [...Object.values(KbliImpactEnum), null],
      description:
        'Arah dampak sisi Lapangan Usaha: INCREASE_NTB (Meningkatkan NTB), DECREASE_NTB (Menurunkan NTB), INCREASE_PRICE (Meningkatkan Harga), DECREASE_PRICE (Menurunkan Harga); null bila non-ekonomi.',
    },
    expenditure_component: {
      type: ['string', 'null'],
      enum: [...Object.values(ExpenditureComponentEnum), null],
      description:
        'Komponen PDRB Pengeluaran utama terdampak: PK_RT, PK_LNPRT, PK_P, PMTB, INVENTORY_CHANGE, atau NET_EXPORT; null bila non-ekonomi.',
    },
    expenditure_impact: {
      type: ['string', 'null'],
      enum: [...Object.values(ExpenditureImpactEnum), null],
      description:
        'Arah dampak sisi Pengeluaran: INCREASE_REAL (Meningkatkan Pengeluaran Riil), DECREASE_REAL (Menurunkan Pengeluaran Riil), INCREASE_DEFLATOR (Meningkatkan Indeks Harga/Deflator), DECREASE_DEFLATOR (Menurunkan Indeks Harga/Deflator); null bila non-ekonomi.',
    },
    quarter: {
      type: 'integer',
      minimum: 1,
      maximum: 4,
      description: 'Triwulan periode fenomena ekonomi (1=Jan-Mar, 2=Apr-Jun, 3=Jul-Sep, 4=Okt-Des).',
    },
    year: {
      type: 'integer',
      minimum: 2000,
      maximum: 2100,
      description: 'Tahun 4 digit periode fenomena ekonomi.',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Tingkat keyakinan klasifikasi antara 0.0 hingga 1.0.',
    },
  },
  required: [
    'is_economic_phenomenon',
    'rejection_reason',
    'summary',
    'kbli_category',
    'kbli_impact',
    'expenditure_component',
    'expenditure_impact',
    'quarter',
    'year',
    'confidence',
  ],
} as const;
```

### 3.2 Implementasi Pemanggilan SDK (`server/services/llm/gemini-client.ts`)

```ts
// Pola pemanggilan resmi @google/genai >= 2.29.1 (Interactions API)
import { GoogleGenAI } from '@google/genai';
import {
  LLM_CLASSIFICATION_JSON_SCHEMA,
  LlmClassificationRawSchema,
} from '~/shared/schemas/llm-output.schema';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function classifyArticleWithGemini(params: {
  title: string;
  sourcePortal: string;
  sourceType: 'REGIONAL' | 'NATIONAL';
  matchedKeyword?: string | null;
  publishedAtWita: string; // format ISO atau 'dd/mm/yyyy HH:mm WITA'
  defaultQuarter: 1 | 2 | 3 | 4;
  defaultYear: number;
  snippetText: string; // hasil parser 150-250 kata
  model?: 'gemini-3.8-flash' | 'gemini-3.5-flash-lite';
}) {
  const userInput = [
    `SUMBER: ${params.sourcePortal} (${params.sourceType})`,
    params.matchedKeyword ? `KEYWORD NASIONAL TERJARING: ${params.matchedKeyword}` : null,
    `TANGGAL RILIS (WITA): ${params.publishedAtWita} (Default Triwulan ${params.defaultQuarter} Tahun ${params.defaultYear})`,
    `JUDUL BERITA: ${params.title}`,
    `TEKS BERITA (150-250 KATA PERTAMA):\n${params.snippetText}`,
  ]
    .filter(Boolean)
    .join('\n');

  const interaction = await ai.interactions.create({
    model: params.model ?? 'gemini-3.8-flash',
    system_instruction: SIPENA_SYSTEM_INSTRUCTION,
    input: userInput,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: LLM_CLASSIFICATION_JSON_SCHEMA as Record<string, any>,
    },
    generation_config: {
      temperature: 0.1,
      max_output_tokens: 768,
    },
    store: false,
  });

  if (!interaction.output_text) {
    throw new Error(`Gemini returned empty output_text (status=${interaction.status})`);
  }

  const parsedJson = JSON.parse(interaction.output_text);
  const validated = LlmClassificationRawSchema.parse(parsedJson);

  const usage = interaction.usage ?? (interaction as any).total_usage;
  return {
    classification: validated,
    usage: {
      inputTokens: usage?.total_input_tokens ?? 0,
      outputTokens: usage?.total_output_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    },
  };
}
```

---

## 4. Contoh Input Teks Parsing 200 Kata & Expected Output JSON

### 4.1 Contoh 1: Berita Ekonomi Valid (`is_economic_phenomenon: true`)

**Metadata & Input User Prompt (Panjang cuplikan: 192 kata):**
```text
SUMBER: korankaltara.com (REGIONAL)
TANGGAL RILIS (WITA): 14/10/2026 09:15 WITA (Default Triwulan 4 Tahun 2026)
JUDUL BERITA: Harga TBS Sawit KTT Menguat di Awal Triwulan IV, Petani Desa Bebatu Mulai Ekspansi Panen
TEKS BERITA (150-250 KATA PERTAMA):
TANJUNG SELOR – Harga Tandan Buah Segar (TBS) kelapa sawit di wilayah Kabupaten Tana Tidung kembali mencatatkan tren penguatan pada pekan kedua Oktober 2026. Berdasarkan penetapan indeks K periode berjalan, harga pembelian TBS oleh pabrik pengolahan di sekitar Kecamatan Sesayap Hilir dan Betayau naik dari Rp 2.650 menjadi Rp 2.980 per kilogram untuk tanaman berumur di atas sepuluh tahun. Kenaikan ini didorong oleh menguatnya permintaan minyak sawit mentah (CPO) antarpulau serta membaiknya akses jalur angkut darat pasca pemeliharaan jalan poros desa.

Ketua Kelompok Tani Sawit Mandiri Desa Bebatu, Rahman, mengatakan peningkatan harga membuat pekebun kembali aktif melakukan pemupukan rutin dan mempercepat siklus panen dari dua pekan menjadi sepuluh hari sekali. Dengan bertambahnya pasokan buah matang, volume pengiriman TBS keluar wilayah Tana Tidung menuju pelabuhan muat sungai turut meningkat sekitar delapan belas persen dibanding bulan sebelumnya.

Sementara itu, Dinas Pertanian Kabupaten Tana Tidung mencatat keterlibatan mitra transporter lokal ikut terbantu oleh lonjakan tonase angkut hasil perkebunan. Pemerintah daerah berharap stabilitas harga TBS hingga akhir tahun mampu menjaga daya beli masyarakat petani pedesaan dan menopang penerimaan sektor perkebunan daerah.
```

**Expected Output JSON Terstruktur:**
```json
{
  "is_economic_phenomenon": true,
  "rejection_reason": null,
  "summary": "Harga pembelian Tandan Buah Segar (TBS) kelapa sawit di Kabupaten Tana Tidung naik menjadi Rp 2.980 per kilogram pada awal Oktober 2026 seiring perbaikan jalan angkut dan tingginya permintaan CPO antarpulau. Kondisi ini memicu percepatan siklus panen petani di Desa Bebatu serta meningkatkan volume pengiriman komoditas ke luar daerah sekitar 18 persen.",
  "kbli_category": "A",
  "kbli_impact": "INCREASE_PRICE",
  "expenditure_component": "NET_EXPORT",
  "expenditure_impact": "INCREASE_REAL",
  "quarter": 4,
  "year": 2026,
  "confidence": 0.96
}
```
> **Catatan Kurasi Analis:** Pada contoh di atas, kenaikan harga TBS (+12,4%) serta kenaikan volume kirim (+18%) terlihat bersamaan; jika analis menilai kenaikan volume panen dan produksi fisik sektor Pertanian (`A`) lebih dominan dibanding komponen harga, admin dapat mengubah `kbli_impact` dari `INCREASE_PRICE` (`Meningkatkan Harga`) menjadi `INCREASE_NTB` (`Meningkatkan NTB`) dalam 1 klik lewat Slide-over Drawer di `/admin/review`.

---

### 4.2 Contoh 2: Berita Seremonial Non-Ekonomi (`is_economic_phenomenon: false`)

**Metadata & Input User Prompt (Panjang cuplikan: 162 kata):**
```text
SUMBER: benuanta.co.id (REGIONAL)
TANGGAL RILIS (WITA): 18/10/2026 16:40 WITA (Default Triwulan 4 Tahun 2026)
JUDUL BERITA: Pemkab Tana Tidung Gelar Apel Peringatan Hari Santri Nasional Berlangsung Khidmat
TEKS BERITA (150-250 KATA PERTAMA):
TIDENG PALE – Pemerintah Kabupaten Tana Tidung menggelar upacara peringatan Hari Santri Nasional tahun 2026 di Halaman Pendopo Djaparuddin, Kecamatan Sesayap, Minggu pagi. Kegiatan tersebut dihadiri unsur Forum Koordinasi Pimpinan Daerah, kepala organisasi perangkat daerah, tokoh agama, pimpinan pondok pesantren, serta ratusan pelajar dari berbagai madrasah di Tana Tidung.

Dalam sambutannya, Sekretaris Daerah Tana Tidung menyampaikan pentingnya menanamkan nilai keagamaan, toleransi, dan disiplin bagi generasi muda dalam menghadapi perkembangan zaman. Ia mengajak seluruh santri untuk terus berkontribusi menjaga kerukunan sosial dan persatuan masyarakat di Bumi Upun Taka.

Rangkaian upacara diisi dengan pembacaan ikrar santri, penampilan paduan suara pelajar madrasah, serta penyerahan piagam penghargaan kepada pembina pondok pesantren teladan. Seluruh agenda acara berjalan tertib dan ditutup dengan sesi foto bersama antara jajaran pemerintah daerah dan peserta upacara sebelum para tamu undangan membubarkan diri pada siang hari.
```

**Expected Output JSON Terstruktur:**
```json
{
  "is_economic_phenomenon": false,
  "rejection_reason": "Berita memuat agenda seremonial apel peringatan hari besar keagamaan tanpa informasi transaksi, belanja, investasi, harga, atau output ekonomi sektoral.",
  "summary": "Pemerintah Kabupaten Tana Tidung menyelenggarakan upacara peringatan Hari Santri Nasional 2026 di Pendopo Djaparuddin bersama jajaran Forkopimda, tokoh agama, dan pelajar madrasah. Agenda berlangsung seremonial berupa amanat pembina apel dan penyerahan piagam penghargaan tanpa memuat kebijakan atau realisasi kegiatan ekonomi.",
  "kbli_category": null,
  "kbli_impact": null,
  "expenditure_component": null,
  "expenditure_impact": null,
  "quarter": 4,
  "year": 2026,
  "confidence": 0.98
}
```
> **Efek Pipeline:** Ketika respons ini diterima oleh `pipeline.ts`, artikel tetap ditulis ke tabel `articles` dengan `verification_status = 'IGNORED'` dan `is_economic_phenomenon = false` agar `url_hash` tercatat permanen (mencegah pemanggilan Gemini ulang di hari berikutnya) dan tidak muncul pada Feed Publik (`/`) maupun tab `Pending` admin.

---

### 4.3 Contoh 3: Penentuan Override Triwulan Eksplisit (`published_at` Triwulan II, Fenomena Triwulan I)

Apabila sebuah berita terbit pada **06 April 2026** (`defaultQuarter = 2`), namun judul dan paragraf pertamanya secara eksplisit berbunyi *"Realisasi Investasi Proyek Jalan dan Sawit Tana Tidung Triwulan I 2026 Tembus Rp 180 Miliar"*, maka instruksi #4 memerintahkan LLM mengembalikan:
```json
{
  "is_economic_phenomenon": true,
  "rejection_reason": null,
  "summary": "Realisasi investasi fisik pada subsektor perkebunan kelapa sawit dan pembangunan infrastruktur jalan di Kabupaten Tana Tidung selama periode Triwulan I 2026 mencapai Rp 180 miliar. Penyerapan modal tersebut terutama didorong oleh penyelesaian pengerjaan jalur distribusi sentra produksi dan peremajaan fasilitas pabrik.",
  "kbli_category": "F",
  "kbli_impact": "INCREASE_NTB",
  "expenditure_component": "PMTB",
  "expenditure_impact": "INCREASE_REAL",
  "quarter": 1,
  "year": 2026,
  "confidence": 0.93
}
```
Hal ini memastikan fenomena ekonomi tercatat pada **periode terjadinya peristiwa ekonomi (Triwulan I 2026)**, bukan tertukar masuk ke buku kerja Triwulan II hanya karena tanggal publikasi medianya jatuh di awal bulan April.

