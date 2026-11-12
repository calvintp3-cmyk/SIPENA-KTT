# Spesifikasi Prompt, Skema JSON & Multi-LLM Router — SIPENA KTT

**Versi Dokumen:** 2.0.0 (Single Source of Truth — KBLI 2025 `A–V` & Multi-LLM Router)  
**Orkestrator Klasifikasi & Sintesis:** `MultiLlmRouter` (`server/services/llm/router.ts`)  
**Rantai Failover Gratis Default (*0ms Failover*):**
1. `gemini:gemini-3.8-flash` (Google AI Studio Free Tier — 5 RPM, 250k TPM, ~20 RPD)
2. `groq:llama-3.3-70b-versatile` (Groq Free Tier tanpa kartu kredit — 28 RPM, 11k TPM, 1.000 RPD / 100k TPD)
3. `gemini:gemini-3.5-flash-lite` (Google AI Studio Free Tier — 10 RPM, 250k TPM)
4. `groq:llama-3.1-8b-instant` (Groq Free Tier tanpa kartu kredit — 28 RPM, 5,6k TPM, 14.400 RPD / 500k TPD)
5. `openrouter:<OPENROUTER_FREE_MODEL>` (Tier-3 Opsional — default 4 model otomatis bila kosong: `google/gemma-4-31b-it:free` → `google/gemma-4-26b-a4b-it:free` → `nvidia/nemotron-3.5-super-vl:free` → `openrouter/free`)

**SDK & API Resmi Gemini:** `@google/genai` menggunakan **`ai.models.generateContent`** dengan `responseMimeType: 'application/json'`, `responseJsonSchema: LLM_CLASSIFICATION_JSON_SCHEMA`, dan `thinkingConfig: { thinkingLevel: ThinkingLevel.LOW | ThinkingLevel.MINIMAL }`.  
**Adaptor Groq & OpenRouter:** Client HTTP kompatibel OpenAI (`server/services/llm/openai-compat.ts`) memakai `response_format: { type: 'json_object' }` dan fallback otomatis ke instruksi JSON murni apabila suatu model open-weight belum mendukung parameter `response_format`.

> **Catatan SDK & Skema Kritis:** Aplikasi **wajib** memakai `@google/genai` (`models.generateContent` + `responseJsonSchema`) dan model generasi Gemini 3 (`gemini-3.8-flash` / `gemini-3.5-flash-lite`) bersama adaptor Groq/OpenRouter. SDK usang `@google/generative-ai` serta model warisan (`gemini-1.5-*`, `gemini-2.0-*`, `gemini-2.5-*`) dilarang digunakan. Taksonomi wajib mengikuti **KBLI 2025 (`A–V`, 22 kategori — Peraturan BPS No. 7 Tahun 2025)**.

---

## 1. Definisi `system_instruction` Baku (Full vs Compact)

Untuk menyeimbangkan kedalaman metodologi **SNA 2008 / Pedoman PDRB BPS** dengan batas *Tokens Per Minute (TPM)* penyedia gratis seperti Groq (`5.6k–11k TPM`), `classifier.ts` menyediakan dua varian sistem instruksi yang identik secara aturan:
1. **`SIPENA_SYSTEM_INSTRUCTION_FULL`** (`~1.050` token, termasuk 5 contoh kalibrasi *few-shot*) — dikirim ke slot **Gemini** yang memiliki kuota `250.000 TPM`.
2. **`SIPENA_SYSTEM_INSTRUCTION_COMPACT`** (`~520` token, ringkas tanpa mengurangi aturan gerbang geografis maupun 22 kode KBLI 2025) — dikirim otomatis ke slot **Groq & OpenRouter** oleh `MultiLlmRouter`.

Sebelum dikirim ke LLM, fungsi **`compressArticleTextForLlm(rawText)`** di `server/services/llm/classifier.ts` memampatkan `snippetText` tersimpan (300–450 kata) ke anggaran **`<= 290` kata atau `<= 1.900` karakter** dengan pemotongan rapi di akhir kalimat terdekat.

### 1.1 Gerbang Geografis (`geographic_scope`) sebagai Penjaga Utama
Semua penyedia LLM mengevaluasi **4 tingkatan cakupan geografis faktual** sebelum menentukan `is_economic_phenomenon`:

| Nilai `geographic_scope` | Cakupan Fakta Berita | Perlakuan Pipeline & LLM |
|---|---|---|
| `KTT_LOCAL` | Peristiwa langsung di Kabupaten Tana Tidung (Tideng Pale, Kec. Sesayap, Sesayap Hilir, Betayau, Muruk Rian, Tana Lia, Bebatu, Sepala Dalung, Buong Baru, Pemkab KTT). | Boleh bernilai `is_economic_phenomenon = true` bila memenuhi bukti ekonomi nyata. |
| `KALTARA_PROVINCIAL` | Kebijakan, penetapan indeks harga resmi (Indeks K/TBS Disbun Kaltara, BI Kaltara, APBD Pemprov Kaltara), atau proyek penghubung Kalimantan Utara bertransmisi ke KTT. | Boleh bernilai `true` apabila berimbas ke aktivitas usaha / rumah tangga / fiskal KTT. |
| `NATIONAL_MACRO_IMPACT` | Kebijakan fiskal pusat (APBN, TKD/DBH/DAU/DAK), moneter (BI Rate), HBA batubara, acuan CPO/BBM ESDM, subsidi pupuk/logistik nasional relevan ke KTT. | Boleh bernilai `true` apabila transmisinya relevan terhadap sektor KTT. |
| `OTHER_REGION_IRRELEVANT` | Berita lokal kabupaten/kota/provinsi **lain** (mis. Pemkab Nunukan/Krayan/Sebatik, Pemkot Tarakan, Pemkab Bulungan/Tanjung Selor, Malinau, Disbun Riau/Jambi/Kalteng) **tanpa** kaitan langsung ke KTT. | **ATURAN MUTLAK:** Wajib `is_economic_phenomenon = false`, `kbli_*` & `expenditure_*` = `null`, tersimpan di PostgreSQL dengan status `IGNORED` agar `url_hash` mencegah *re-crawl*. |

---

## 2. Aturan Khusus Penentuan `is_economic_phenomenon` (Gold Standard)

Agar AI tidak menghasilkan *false positive* dari berita statis/seremonial maupun *false negative* pada fenomena tersirat:

| Jenis Berita | `geographic_scope` | `is_economic_phenomenon` | Alasan Metodologis PDRB & KBLI 2025 |
|---|---|---|---|
| Harga TBS Sawit KTT naik Rp 2.980/kg & pengapalan dari Sesayap Hilir melonjak | `KTT_LOCAL` | **`true`** | Dampak harga/produksi sektor Pertanian (`A`) -> `INCREASE_PRICE` dan arus keluar komoditas (`NET_EXPORT` -> `INCREASE_REAL`). |
| Pemkab Nunukan salurkan Subsidi Ongkos Angkut Krayan Rp 912 juta (tanpa menyebut KTT) | `OTHER_REGION_IRRELEVANT` | **`false`** | Cakupan lokal kabupaten tetangga tanpa keterkaitan ke Kab. Tana Tidung (`IGNORED`). |
| PLN / Pertamina umumkan tarif listrik atau harga BBM bulan berjalan **tetap / tidak berubah** ($\Delta = 0$) | `NATIONAL_MACRO_IMPACT` | **`false`** | Tidak ada pergeseran harga ataupun perubahan volume pasokan/produksi (`IGNORED`). |
| Grafik/rekap data historis lama tanpa kejadian ekonomi baru pada periode berjalan | `KALTARA_PROVINCIAL` / `NATIONAL` | **`false`** | Tidak merekam fenomena ekonomi aktual pada periode berjalan (`IGNORED`). |
| Proyek fisik pembangunan gedung sekolah atau gedung RSUD di KTT | `KTT_LOCAL` | **`true`** | Aturan Batasan Produksi PDRB BPS: fisik konstruksi masuk **`F` (Konstruksi)** + **`PMTB`**, bukan `Q`/`R` (yang khusus operasional layanan pendidikan/kesehatan). |
| Pemkab KTT mencairkan TPP ASN, BOPD, dan operasional layanan RSUD Akhmad Berahim | `KTT_LOCAL` | **`true`** | KBLI 2025: Administrasi Pemerintahan masuk **`P`** (atau **`R`** bila fokus layanan kesehatan RSUD) + **`PK_P` (`INCREASE_REAL`)**. |
| Pengelolaan Festival Budaya Irau / event wisata yang menaikkan okupansi hotel & omzet UMKM kuliner | `KTT_LOCAL` | **`true`** | KBLI 2025: Kesenian/Hiburan masuk **`S`** (atau Akomodasi **`I`** jika fokus hunian hotel) + **`PK_RT` (`INCREASE_REAL`)**. |
| Layanan bengkel resmi / reparasi mobil & sepeda motor di Tideng Pale mengalami lonjakan omzet | `KTT_LOCAL` | **`true`** | Perubahan KBLI 2025: Reparasi kendaraan (KBLI 95) masuk kategori **`T` (Aktivitas Jasa Lainnya)** dalam grup **`S,T,U,V`**, tidak lagi di `G`. |

---

## 3. Zod Schema & JSON Schema Structured Outputs (`shared/schemas/llm-output.schema.ts`)

`LLM_CLASSIFICATION_JSON_SCHEMA` menggunakan `propertyOrdering` untuk memandu model menalar cakupan wilayah dan ringkasan fakta terlebih dahulu sebelum mengunci enum KBLI 2025 (`A`–`V`) dan Pengeluaran (`PK_RT`..`NET_EXPORT`). Di sisi server, **`LlmClassificationRawSchema.superRefine()`** memaksa dua invarian keras:
1. Jika `geographic_scope === 'OTHER_REGION_IRRELEVANT'`, maka `is_economic_phenomenon` **wajib `false`**.
2. Jika `is_economic_phenomenon === false`, maka `kbli_category`, `kbli_impact`, `expenditure_component`, dan `expenditure_impact` **semuanya wajib `null`**; sebaliknya jika `true`, keempatnya wajib terisi valid.

### 3.1 Struktur Field JSON Output Terikat
- `geographic_scope`: `'KTT_LOCAL' | 'KALTARA_PROVINCIAL' | 'NATIONAL_MACRO_IMPACT' | 'OTHER_REGION_IRRELEVANT'`
- `is_economic_phenomenon`: `boolean`
- `rejection_reason`: `string | null` (maks. 300 karakter)
- `summary`: `string` (min. 20, maks. 1.500 karakter; diarahkan 3–5 kalimat / 50–110 kata bahasa Indonesia baku)
- `kbli_category`: `KbliCategoryEnum ('A'..'V') | null`
- `kbli_impact`: `'INCREASE_NTB' | 'DECREASE_NTB' | 'INCREASE_PRICE' | 'DECREASE_PRICE' | null`
- `expenditure_component`: `'PK_RT' | 'PK_LNPRT' | 'PK_P' | 'PMTB' | 'INVENTORY_CHANGE' | 'NET_EXPORT' | null`
- `expenditure_impact`: `'INCREASE_REAL' | 'DECREASE_REAL' | 'INCREASE_DEFLATOR' | 'DECREASE_DEFLATOR' | null`
- `quarter`: `integer` (`1..4`)
- `year`: `integer` (`2000..2100`)
- `confidence`: `number` (`0..1`)

### 3.2 Pemanggilan SDK Gemini dalam Router & Worker
```ts
// Pola pemanggilan resmi @google/genai di server/services/llm/router.ts & gemini-client.ts
const response = await ai.models.generateContent({
  model: req.model, // 'gemini-3.8-flash' | 'gemini-3.5-flash-lite'
  contents: req.userInput,
  config: {
    systemInstruction: req.systemInstruction,
    responseMimeType: 'application/json',
    responseJsonSchema: LLM_CLASSIFICATION_JSON_SCHEMA as unknown as Record<string, unknown>,
    maxOutputTokens: DEFAULT_LLM_MAX_OUTPUT_TOKENS, // 3072 (memberi ruang thinking budget)
    temperature: 0.1,
    thinkingConfig: {
      thinkingLevel: isFlashLite ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
    },
    abortSignal: req.abortSignal,
    httpOptions: {
      timeout: GEMINI_REQUEST_TIMEOUT_MS, // 15_000ms
      retryOptions: { attempts: 1 }, // Failover cepat ditangani MultiLlmRouter
    },
  },
});
```

---

## 4. Contoh Kalibrasi JSON & Pemetaan Persistensi

### 4.1 Contoh Berita Lokal KTT Valid
```json
{
  "geographic_scope": "KTT_LOCAL",
  "is_economic_phenomenon": true,
  "rejection_reason": null,
  "summary": "Harga pembelian Tandan Buah Segar (TBS) kelapa sawit di Kabupaten Tana Tidung naik menjadi Rp 2.980 per kilogram pada awal Oktober 2026 seiring perbaikan jalan poros desa dan menguatnya permintaan CPO antarpulau. Kondisi ini mendorong petani di Desa Bebatu mempercepat siklus panen serta meningkatkan volume pengapalan TBS melalui jalur sungai di Kecamatan Sesayap Hilir sekitar 18 persen.",
  "kbli_category": "A",
  "kbli_impact": "INCREASE_PRICE",
  "expenditure_component": "NET_EXPORT",
  "expenditure_impact": "INCREASE_REAL",
  "quarter": 4,
  "year": 2026,
  "confidence": 0.96
}
```

### 4.2 Contoh Berita Kabupaten Lain Ditolak Gerbang Geografis LLM
```json
{
  "geographic_scope": "OTHER_REGION_IRRELEVANT",
  "is_economic_phenomenon": false,
  "rejection_reason": "Peristiwa lokal penyaluran subsidi angkutan udara di Kecamatan Krayan, Kabupaten Nunukan tanpa penyebutan keterkaitan ekonomi dengan Kabupaten Tana Tidung.",
  "summary": "Pemerintah Kabupaten Nunukan menyalurkan subsidi ongkos angkut barang kebutuhan pokok melalui jalur udara menuju Kecamatan Krayan pada Oktober 2026. Program tersebut sepenuhnya merupakan kebijakan fiskal dan layanan distribusi di wilayah Kabupaten Nunukan dan tidak melibatkan aktivitas produksi atau konsumsi di Kabupaten Tana Tidung.",
  "kbli_category": null,
  "kbli_impact": null,
  "expenditure_component": null,
  "expenditure_impact": null,
  "quarter": 4,
  "year": 2026,
  "confidence": 0.97
}
```
> **Efek Pipeline (`mapClassificationToPersistence`):** Ketika `is_economic_phenomenon = false` **atau** `geographic_scope === 'OTHER_REGION_IRRELEVANT'`, baris disimpan permanen di `articles` dengan `verification_status = 'IGNORED'`, `is_economic_phenomenon = false`, keempat kolom PDRB `null`, serta `llm_model` mencatat identitas slot penyedia (mis. `groq:llama-3.3-70b-versatile`) atau `'geo-filter'` jika sudah gugur lebih awal di gerbang deterministik pra-LLM.

---

## 5. Spesifikasi Prompt Sintesis Narasi BRS (`buildBrsSynthesisPrompts`)
Fitur **Sintesis Narasi PDRB (`/admin/synthesis`)** memanggil `generateSynthesisWithRouter(...)` (dengan fallback otomatis ke template BRS deterministik apabila seluruh slot LLM sedang habis kuota):
- Menggunakan aturan **Anti-Halusinasi Ketat**: AI dilarang mengarang angka pertumbuhan y-on-y/q-to-q maupun nilai Rupiah di luar ringkasan sumber terverifikasi bernomor `[1]..[N]`.
- Wajib menyisipkan sitasi angka kurung siku (`[1]`, `[1][3]`) di akhir kalimat agar sinkron dengan daftar referensi artikel terverifikasi dan lembar cetak A4 BRS (`generation_mode`: `'llm' | 'gemini' | 'template'`).
- `MultiLlmRouter` membersihkan blok `<think>...</think>` secara otomatis apabila model open-weight memancarkan jejak penalaran sebelum menyusun Markdown akhir.
