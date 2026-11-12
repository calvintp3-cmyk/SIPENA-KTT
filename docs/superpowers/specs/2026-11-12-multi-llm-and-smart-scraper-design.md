# Design Spec: SIPENA KTT — Multi-Provider LLM Router, KBLI 2025 (`A–V`) & Workflow Scraping Cerdas (Sub-Proyek B)

**Tanggal:** 2026-11-12  
**Revisi:** v2.0 — Incorporasi penuh keputusan desain user: (1) **Migrasi penuh KBLI 2025 (`A–V`, 22 kategori)** sesuai Peraturan BPS No. 7 Tahun 2025 beserta standardisasi tampilan UI **`kode_lapus - nama_lapus`**, (2) Integrasi metodologi resmi **Pedoman Penyusunan PDRB BPS** (*Pengeluaran Riil vs Indeks Deflator*, *ADHK vs ADHB*, proksi LKPM/LRA/SAMSAT/Stockpile/Ekspor-Impor KTT, aturan batas `A/C/F/G/T/J/K/P/Q/R`), (3) Peningkatan keandalan SDK **`@google/genai` + Groq + OpenRouter** (`propertyOrdering`, `maxOutputTokens: 3072`, dual prompt `FULL` vs `COMPACT`, `0ms` failover), serta (4) Rencana arsip non-destruktif berita non-KTT historis di VPS.  
**Status:** Disetujui — Eksekusi Aktif (Opsi A KBLI 2025 `A–V` + Format `kode_lapus - nama_lapus`)  
**Ruang Lingkup:** Sub-Proyek B — Router Multi-LLM gratis terpadu (**Google Gemini + Groq** + cadangan opsional **OpenRouter `:free`**), migrasi taksonomi KBLI 2025 (`A–V`) & penyeragaman label webapp, peningkatan workflow scraping 4 lapisan berpresisi geografis KTT, observabilitas Admin, serta skrip arsip aman berita non-KTT lama.  
**Prinsip Keselamatan Produksi:** Seluruh perubahan basis data bersifat **non-destruktif** dengan pemetaan ulang atomik kategori KBLI 2020 → 2025 (`K..U` → `L..V`), mempertahankan seluruh baris histori `articles`, `national_keywords`, `scraper_logs`, dan `synthesis_drafts` yang telah ada di VPS.

---

## 1. Masalah Saat Ini (Hasil Audit Kodebase & DB Produksi VPS)

1. **Ketergantungan Tunggal pada Satu API Key Gemini (`SPOF` Kuota & HTTP 503):**
   - [`GeminiClassificationWorker`](file:///f:/18%20-%20SIPENA%20KTT/server/services/llm/gemini-client.ts#L165-L578) hanya melayani satu `GEMINI_API_KEY` dan dua model pada proyek Google yang sama (`gemini-3.8-flash` → `gemini-3.5-flash-lite`). Saat batas harian free tier (`~20 RPD` Flash) habis atau jam sibuk menimbulkan HTTP `503 UNAVAILABLE`, antrean tertahan oleh backoff `10–64 detik` hingga melewati anggaran waktu 3 menit.
   - `gemini-client.ts#L283` menetapkan `maxOutputTokens: 1536` dan `generate.post.ts#L140` menetapkan `maxOutputTokens: 1800` — berisiko memotong JSON/Markdown pada output kompleks karena *thinking tokens* berbagi kuota `maxOutputTokens`.
   - Endpoint sintesis BRS ([generate.post.ts](file:///f:/18%20-%20SIPENA%20KTT/server/api/admin/synthesis/generate.post.ts#L130-L170)) memanggil `GoogleGenAI` secara terpisah tanpa router fallback sehingga kegagalan Gemini langsung jatuh ke template statis walau Groq tersedia.
   - Constraint `synthesis_drafts_mode_chk` ([schema.ts](file:///f:/18%20-%20SIPENA%20KTT/server/db/schema.ts#L342)) baru mengizinkan `('gemini', 'template')`.

2. **Inefisiensi Scraping & Kebocoran Berita Lintas Kabupaten/Provinsi:**
   - **Tautan `news.google.com/rss/articles/CBMi...` Modern:** [`extractRedirectTargetFromGoogleHtml`](file:///f:/18%20-%20SIPENA%20KTT/server/services/scraper/national.ts#L152-L175) hanya memeriksa tag HTML statis, sehingga wrapper JS `DotsSplashUi` gagal didekode ke situs penerbit asli dan jatuh ke snippet pendek.
   - **Injeksi Konteks Palsu di `buildNationalFallbackSnippet` ([national.ts](file:///f:/18%20-%20SIPENA%20KTT/server/services/scraper/national.ts#L119-L147)):** Menyisipkan string *"untuk penyusunan fenomena ekonomi PDRB Kabupaten Tana Tidung"* ke semua artikel nasional fallback. Audit VPS membuktikan hal ini mengecoh LLM hingga meloloskan **11 salinan berita SOA Udara Pemkab Nunukan–Krayan Rp912 Juta**, ~8 berita **TBS Disbun lokal Riau/Jambi/Nagan/Kalteng**, **Tanjung Perak**, serta info **Tarif Listrik PLN stagnan ($\Delta = 0$)** dan **grafik harga historis**.
   - **Polusi Sidebar & WordPress Feed Regional ([portals.ts](file:///f:/18%20-%20SIPENA%20KTT/server/services/scraper/portals.ts#L347-L386)):** Widget *"Terpopuler/Terkini"* pada portal regional berpotensi menyelipkan berita Bulungan/Nunukan/Tarakan, sementara portal WordPress `benuanta.co.id` belum memanfaatkan jalur RSS feed (`/topic/berita-ktt/feed/`, `/category/tana-tidung/feed/`, dll.) yang mengembalikan XML terstruktur `200 OK`.
   - **Deduplikasi Lintas Sumber & Riwayat DB:** Belum membandingkan kemiripan judul peristiwa lintas 4 portal regional vs nasional serta riwayat artikel 10 hari terakhir di DB.

3. **Ketidaksinkronan Klasifikasi KBLI 2020 → KBLI 2025 & Inkonsistensi Format Label UI:**
   - Enum aplikasi & database masih memakai **KBLI 2020 (21 kategori `A–U`)**, belum mengadopsi **KBLI 2025 (Peraturan BPS No. 7 Tahun 2025 — 22 kategori `A–V`)** yang memecah Infokom `J` → `J` (Konten/Penyiaran) & `K` (Telekomunikasi/IT), menggeser `K..U` → `L..V`, serta memindahkan **reparasi kendaraan bermotor (`95`)** dari Perdagangan (`G`) ke Jasa Lainnya (`T`).
   - Tampilan kode & nama lapangan usaha di UI terpecah menjadi 3 gaya berbeda: `A - Pertanian...` (`fullLabel`), `A • Pertanian...` (`PhenomenonFeedCard.vue`, `PublicArticleDetailModal.vue`), dan `[A] Pertanian...` (`usePdrbLabels.ts`, `SectorDistributionCharts.vue`, `PublicFilterBar.vue`, `admin/articles.vue`, `admin/synthesis.vue`, `linimasa.vue`).

---

## 2. Evaluasi Pendekatan Arsitektur

| Aspek | **Opsi A (Dipilih): Unified Multi-LLM Router + KBLI 2025 (`A–V`) + 4-Layer Smart Scraper** | Opsi B: Patch Fallback Sederhana | Opsi C: Queue Worker Terpisah + Redis |
|---|---|---|---|
| **Ketahanan LLM** | Router terpadu **Gemini + Groq (`70B` + `8B`) + opsional OpenRouter `:free`** dengan failover `0ms`, TPM token-bucket pacing, dan telemetry DB. | Duplikasi logika & tidak ada statistik per-provider. | Overhead operasional Redis berlebih untuk skala harian KTT. |
| **Taksonomi & UI** | Migrasi atomik PostgreSQL KBLI 2020→2025 (`A–V`), pembaruan warna/komponen/pedoman BPS, serta penyeragaman format `kode_lapus - nama_lapus`. | Tetap memakai KBLI 2020 usang & label UI belang. | Tidak relevan dengan skema data. |
| **Keselamatan DB VPS** | Non-destruktif 100%: migrasi swap enum dalam transaksi + skrip CLI terpisah `--dry-run` untuk arsip (`IGNORED`) berita non-KTT lama. | Berisiko ketidakcocokan constraint/data lama. | Membutuhkan sinkronisasi worker tambahan. |

**Keputusan Desain:** Memilih **Opsi A**.

---

## 3. Arsitektur Multi-Provider LLM Router & Penguatan API/SDK

### 3.1 Profil Penyedia LLM Gratis & Strategi Peran
- **Google Gemini (`@google/genai` v3.1.0):**
  - Model: `gemini-3.8-flash` (`ThinkingLevel.LOW` — catatan teknis: `MINIMAL` tidak didukung di `3.8-flash`) dan `gemini-3.5-flash-lite` (`ThinkingLevel.MINIMAL`).
  - Keunggulan: Pemahaman konteks Indonesia sangat kuat, `responseJsonSchema` native + `propertyOrdering`, dan *implicit context caching* untuk prefix `systemInstruction` statis yang konsisten. Rentan limit harian proyek gratis (`~20 RPD`) dan HTTP `503` saat puncak trafik.
- **Groq Cloud Free Tier (`OpenAI-Compatible REST`, tanpa kartu kredit):**
  - `llama-3.3-70b-versatile`: **1.000 RPD / 100.000 TPD / 12.000 TPM** (30 RPM). Akurasi penalaran PDRB tinggi, sangat cepat (`<1.5s/artikel`).
  - `llama-3.1-8b-instant`: **14.400 RPD / 500.000 TPD / 6.000 TPM** (30 RPM). Berfungsi sebagai jaring volume tinggi saat kuota `70B` dan Gemini sama-sama menipis.
- **OpenRouter `:free` (Cadangan Opsional Tier-3):**
  - Aktif otomatis bila `OPENROUTER_API_KEY` terpasang (`google/gemma-4-31b-it:free` → `google/gemma-4-26b-a4b-it:free` → `nvidia/nemotron-3.5-super-vl:free` → `openrouter/free`; 50 RPD pada akun gratis murni, 1.000 RPD bila akun memiliki riwayat kredit $\ge \$10$). `OPENROUTER_FREE_MODEL` opsional — jika dikosongkan, sistem otomatis memakai urutan model `:free` unggulan di atas, atau dapat diisi 1 hingga beberapa model (dipisah koma).

### 3.2 Konfigurasi Env, Rantai Failover & Adapter Terpadu
- **Runtime Config (`nuxt.config.ts` & `ecosystem.config.cjs`):**
  - `GEMINI_API_KEY` & opsional `GEMINI_API_KEYS` (dipisah koma).
  - `GROQ_API_KEY` & opsional `GROQ_API_KEYS` (dipisah koma).
  - Opsional `OPENROUTER_API_KEY` & `OPENROUTER_FREE_MODEL`.
  - Opsional `LLM_CLASSIFY_CHAIN` & `LLM_SYNTHESIS_CHAIN` untuk penyesuaian urutan slot via env tanpa deploy ulang kode.
  - Kunci API **dilarang keras** dikirim ke respons HTTP/client maupun dicetak pada pesan error/log.
- **Rantai Prioritas Default:**
  - *Klasifikasi JSON:* `gemini:gemini-3.8-flash` → `groq:llama-3.3-70b-versatile` → `gemini:gemini-3.5-flash-lite` → `groq:llama-3.1-8b-instant` → *(opsional)* `openrouter:...`
  - *Sintesis Narasi BRS:* `gemini:gemini-3.8-flash` → `groq:llama-3.3-70b-versatile` → `gemini:gemini-3.5-flash-lite` → `groq:llama-3.1-8b-instant` → *(opsional)* `openrouter:...` → `buildGroundedBrsFallbackNarrative()` (`mode: 'template'`).
- **Klien OpenAI-Compatible (`server/services/llm/openai-compat.ts`):**
  - Menggunakan `fetch` native + `AbortController` timeout (`15s` klasifikasi, `22s` sintesis).
  - Mode JSON terverifikasi memakai `response_format: { type: 'json_object' }` (dengan fallback aman bila upstream `:free` menolak `response_format`) + stripping markdown fence + validasi Zod `.superRefine()` + maksimal `1x` retry perbaikan skema.

### 3.3 Penguatan Spesifik `@google/genai`, TPM Pacer & Penanganan Error `0ms`
1. **Kenaikan `maxOutputTokens` ke `3072`:**
   - Diterapkan baik pada klasifikasi maupun sintesis BRS agar *thinking tokens* (`ThinkingLevel.LOW`) tidak memotong JSON output maupun paragraf akhir BRS.
2. **Skema `propertyOrdering` (*Reasoning-First* / *Autoregressive CoT*):**
   - [`LLM_CLASSIFICATION_JSON_SCHEMA`](file:///f:/18%20-%20SIPENA%20KTT/shared/schemas/llm-output.schema.ts#L73-L148) menambahkan `propertyOrdering`:
     `['geographic_scope', 'is_economic_phenomenon', 'rejection_reason', 'summary', 'kbli_category', 'kbli_impact', 'expenditure_component', 'expenditure_impact', 'quarter', 'year', 'confidence']`
     sehingga model menyelesaikan evaluasi lokus geografis dan merumuskan `summary` fakta/angka **sebelum** mengunci huruf KBLI, komponen pengeluaran, dan arah dampaknya.
   - `geographic_scope` bersifat `.optional()` pada `LlmClassificationRawSchema` sehingga seluruh mock tes lama (10 field) tetap valid 100%, dan menjadi wajib di JSON Schema LLM.
3. **Dual System Prompt Strategy (*Full* vs *Compact* Hema TPM):**
   - **`SIPENA_SYSTEM_INSTRUCTION_FULL`** (untuk **Gemini**): Memuat profil ekonomi KTT lengkap, kamus 22 kategori **KBLI 2025 (`A–V`)**, aturan pemisahan 6 Komponen Pengeluaran beserta proksi KTT, aturan dampak riil vs harga, gerbang `geographic_scope`, serta 5 contoh *few-shot calibration*. Prefiks statis konsisten memanfaatkan *implicit context caching* Gemini 3.
   - **`SIPENA_SYSTEM_INSTRUCTION_COMPACT`** (untuk **Groq & OpenRouter** — **±950 token**): Versi padat tanpa kalimat redundan, menjaga total input per artikel **±1.350–1.550 token** agar Groq `70B` tetap nyaman di bawah batas **12.000 TPM** (pacing token-bucket adaptif per slot).
4. **Kompresi Input Artikel Pra-LLM (`<= 300 kata / 1.900 karakter`):**
   - `articles.snippetText` di database tetap menyimpan **300–450 kata** (`<= 2.800 karakter`) untuk verifikasi operator Admin, sedangkan teks yang dikirim ke user prompt LLM dipangkas bersih pada batas kalimat ke **`<= 290 kata / 1.900 karakter`** (`~30%` lebih hemat kuota TPD & TPM).
5. **Privasi Panggilan API:**
   - Mempertahankan `ai.models.generateContent()` yang bersifat *stateless* (tanpa penyimpanan sesi di server Google).
6. **Circuit Breaker & Failover `0ms`:**
   - `DAILY_QUOTA` (`PerDay`, `TPD`, `RPD`) → `disabledForSession = true`, pindah `0ms` ke slot berikutnya.
   - `RATE_LIMIT_MINUTE` (`429` sementara) → pasang `cooldownUntilMs` pada slot tersebut (sesuai `retry-after` atau `20s`) dan **langsung pindah** ke provider lain tanpa menahan antrean artikel di `sleep()`.
   - `HIGH_DEMAND_TRANSIENT` (`503 UNAVAILABLE`, timeout) → 1x retry cepat (1.5s); jika gagal lagi, cooldown slot `60s` dan pindahkan sisa antrean run ke Groq.
   - Tetap mengekspor [`GeminiClassificationWorker`](file:///f:/18%20-%20SIPENA%20KTT/server/services/llm/gemini-client.ts#L165) untuk kompatibilitas tes lama `[11500, 27500, 64000]`.

---

## 4. Workflow Scraping & Pra-Klasifikasi Cerdas (4 Lapisan)

1. **Lapisan 1 — Jalur Cepat RSS WordPress & Sterilisasi Sidebar (`portals.ts`):**
   - Menambah `feedUrls?: ReadonlyArray<string>` & `requiresKttAnchor?: boolean`.
   - `benuanta.co.id` memprioritaskan feed terkurasi `/topic/berita-ktt/feed/`, `/category/tana-tidung/feed/`, `/category/pemkab-tana-tidung/feed/`, diikuti `/feed/?s=tana+tidung` (`requiresKttAnchor: true`). Jika `<content:encoded>` / `<description>` menghasilkan $\ge 30$ kata bersih, artikel langsung lolos ke tahap dedup & klasifikasi tanpa fetch HTML kedua; jika pendek, otomatis fetch URL kanoniknya.
   - HTML scraper (`korankaltara.com`, `kaltara.tribunnews.com`, `radartarakan.jawapos.com`) menolak seluruh node di dalam `aside, nav, footer, header, .sidebar, #sidebar, .widget, .related, .popular, .terpopuler, .w300` serta menolak URL subkanal kabupaten tetangga (`/nunukan/`, `/tarakan/`, `/bulungan/`, `/malinau/`) bila judul tidak menyebut KTT.
2. **Lapisan 2 — Dekoder Google News `CBMi...` dengan Penjaga SSRF (`server/services/scraper/google-news-decoder.ts`):**
   - Jika `extractRedirectTargetFromGoogleHtml` gagal, dekoder mengekstrak `data-n-a-id`, `data-n-a-ts`, `data-n-a-sg` dari DOM halaman Google News yang sudah diambil, memvalidasi endpoint `DotsSplashUi/data/batchexecute?rpcids=Fbv4je` lewat [`validateExternalUrl`](file:///f:/18%20-%20SIPENA%20KTT/server/utils/ssrf.ts#L180), membatasi kuota (`maxBatchexecutePerRun = 20`, jeda `250ms`), memvalidasi URL penerbit `garturlres` lewat `validateExternalUrl`, lalu mengekstrak `300–450` kata penuh. Jika penerbit memblokir (`403`/paywall), mulus fallback ke `buildNationalFallbackSnippet()`.
3. **Lapisan 3 — Deduplikasi Kesamaan Judul Lintas Portal & Arsip DB 10 Hari (`server/services/scraper/dedup.ts`):**
   - Normalisasi judul (hapus sufiks media & stopwords umum Indonesia) + perbandingan **Jaccard + Containment $\ge 0.72$** terhadap token inti & entitas angka.
   - Memprioritaskan sumber terbaik saat duplikat peristiwa: `REGIONAL` > penerbit langsung `NATIONAL` > wrapper Google News.
   - Memeriksa `{ id, title }` artikel `10 hari terakhir` dari PostgreSQL dalam 1 query ringan; artikel peristiwa sama dilewati dan dicatat sebagai `articlesDeduplicated`.
4. **Lapisan 4 — Pra-Filter Non-Ekonomi, Urutan Prioritas & Batas Aman Per Run:**
   - Memperluas `HARD_NOISE_PATTERNS` di [`title-filter.ts`](file:///f:/18%20-%20SIPENA%20KTT/server/services/scraper/title-filter.ts) untuk judul nasional non-ekonomi yang pasti noise (profil harga harian statis *"Cek Harga/Tarif..."*, *"Grafik Data Historis"*, kunci jawaban, twibbon, jadwal TV/bola/sholat, kode redeem) **tanpa** pernah memblokir berita `REGIONAL` secara sepihak di filter judul.
   - Antrean LLM diurutkan: `REGIONAL` terbaru → `NATIONAL` penerbit langsung → `NATIONAL` terdekode, dibatasi aman default `SCRAPER_MAX_ARTICLES_PER_RUN = 35` agar selesai tuntas dalam `25–60 detik`.

---

## 5. Presisi Geografis KTT, KBLI 2025 (`A–V`) & Metodologi PDRB BPS

### 5.1 Pembersihan Injeksi Palsu & Filter Geografis Deterministik (`geo-filter.ts`)
- **`buildNationalFallbackSnippet` ([national.ts](file:///f:/18%20-%20SIPENA%20KTT/server/services/scraper/national.ts#L119-L147)):** Menghapus kalimat injeksi palsu *"untuk penyusunan fenomena ekonomi PDRB Kabupaten Tana Tidung"*, diganti ringkasan netral berbasis fakta RSS serta instruksi eksplisit bahwa evaluasi lokus bergantung murni pada fakta artikel.
- **Evaluasi Geografis 3 Jalur (`evaluateGeographicRelevance`):**
  - `ALLOW_KTT_ANCHOR`: Judul/teks menyebut jangkar KTT (`tana tidung`, `tideng pale`, `sesayap`, `tana lia`, `betayau`, `muruk rian`, `sepala dalung`, `buong baru`, `bebatu`, atau `\bktt\b`) → selalu lanjut ke LLM.
  - `DROP_OTHER_REGENCY_LOCAL`: Menolak sebelum panggilan LLM apabila:
    1. Berita `REGIONAL` dari pencarian keyword yang sama sekali tidak memuat jangkar KTT di judul maupun isi; atau
    2. Judul/URL menyebut kuat **entitas lokal eksklusif kabupaten/provinsi lain** (*Pemkab Nunukan, Krayan, Sebatik, Pemkot Tarakan, Pemkab Bulungan, Pemkab Malinau, Disbun/TBS spesifik Riau/Jambi/Aceh/Sumut/Sumbar/Kalteng*, dll.) tanpa menyebut KTT maupun indikator kebijakan/harga acuan **nasional murni** (*Kementerian ESDM, HBA, Kementan, Kemenkeu, Bank Indonesia, APBN*).
  - `ALLOW_FOR_LLM_REVIEW`: Berita Kaltara lintas kabupaten atau makro nasional tanpa penyebutan KTT langsung diteruskan ke LLM.

### 5.2 Migrasi Resmi KBLI 2020 (`A–U`) → KBLI 2025 (`A–V`, Peraturan BPS No. 7 Tahun 2025)
Berdasarkan dokumen `kbli/kbli20025_parsing/kbli2025.json` dan `klasifikasi-baku-lapangan-usaha-indonesia--kbli--2025-.pdf`, SIPENA KTT bermigrasi penuh ke **22 Kategori KBLI 2025 (`A–V`)**:

| Kode KBLI 2025 | Nama Resmi Lapangan Usaha (KBLI 2025) | Pemetaan ke 17 Sektor PDRB | Perubahan Kunci vs KBLI 2020 & Aturan Batas KTT |
|---|---|---|---|
| `A` | Pertanian, Kehutanan, dan Perikanan | `A` | Tanaman pangan, TBS sawit di kebun, kehutanan/kayu bulat, perikanan tangkap & budidaya tambak |
| `B` | Pertambangan dan Penggalian | `B` | Batubara (*termasuk pencucian/benefisiasi `05102`*), migas, kuari sirtu/pasir/batu |
| `C` | Industri | `C` | Pengolahan TBS→CPO (PKS), *chipmill*/kayu lapis, IKM makanan/minuman olahan (sebelumnya *Industri Pengolahan*) |
| `D` | Penyediaan Listrik, Gas, UAP/Air Panas, dan Udara Dingin | `D` | PLTD/PLTS/EBT, jaringan PLN/transmisi tenaga listrik & perdagangan karbon sektor energi |
| `E` | Penyediaan Air; Pengelolaan Air Limbah, Penanganan Limbah, dan Remediasi | `E` | PDAM Tirta Taka, SPAM, pengelolaan sampah, remediasi lingkungan |
| `F` | Konstruksi | `F` | Pembangunan proyek fisik/Puspem/jalan/jembatan/pelabuhan/**gedung sekolah/RSUD**, termasuk jasa intermediasi konstruksi |
| `G` | Perdagangan Besar dan Eceran | `G` | Niaga sembako/BBM/material, pasar rakyat, ritel, niaga-el (`e-commerce`); **tidak lagi** mencakup reparasi kendaraan bermotor |
| `H` | Transportasi dan Penyimpanan | `H` | Pelabuhan Sesayap/Tideng Pale, *speedboat*, feri, kargo tongkang, logistik SOA, jasa intermediasi angkutan (kurir/ojol logistik) |
| `I` | Aktivitas Penyediaan Akomodasi dan Makan Minum | `I` | Hotel, penginapan, homestay, restoran/kafe, katering, serta platform OTA/reservasi makan-minum |
| `J` | Aktivitas Penerbitan, Penyiaran, serta Produksi dan Distribusi Konten | `J,K` *(Infokom)* | *(Pecahan Infokom Bagian 1)*: Penerbitan media, penyiaran TV/radio, produksi konten digital, berita |
| `K` | Aktivitas Telekomunikasi, Pemrograman Komputer, Konsultansi, Infrastruktur Komputasi, dan Jasa Informasi Lainnya | `J,K` *(Infokom)* | *(Pecahan Infokom Bagian 2)*: BTS blankspot, jaringan internet desa, pemrograman, cloud & infrastruktur digital |
| `L` | Aktivitas Keuangan dan Asuransi | `L` | *(Geser dari K)*: Bank BPD Kaltimtara, penyaluran KUR, koperasi simpan pinjam, asuransi, fintech/kripto/karbon |
| `M` | Aktivitas Real Estat | `M` | *(Geser dari L)*: Pengembang perumahan, sewa ruko/lahan/gudang penyimpanan mandiri, pengelolaan kawasan industri |
| `N` | Aktivitas Profesional, Ilmiah, dan Teknis | `N,O` *(Jasa Perusahaan)* | *(Geser dari M)*: Konsultan perencana teknik/AMDAL, kantor akuntan/hukum, survei/sertifikasi |
| `O` | Aktivitas Administratif dan Penunjang Usaha | `N,O` *(Jasa Perusahaan)* | *(Geser dari N)*: Sewa alat berat/armada, penempatan tenaga kerja, agen perjalanan, jasa kebersihan/keamanan |
| `P` | Administrasi Pemerintahan dan Pertahanan, serta Jaminan Sosial Wajib | `P` | *(Geser dari O)*: Operasional umum OPD Pemkab KTT, APBD/DAU/DBH/DAK, administrasi pajak & layanan lingkungan pemda |
| `Q` | Pendidikan | `Q` | *(Geser dari P)*: Layanan sekolah negeri/swasta, BOS/BOSDA, beasiswa daerah, pelatihan vokasi/BLK |
| `R` | Aktivitas Kesehatan Manusia dan Aktivitas Sosial | `R` | *(Geser dari Q)*: Layanan RSUD Akhmad Berahim, puskesmas, klinik, telemedisin, serta panti/layanan sosial |
| `S` | Kesenian, Olahraga, dan Rekreasi | `S,T,U,V` *(Jasa Lainnya)* | *(Geser dari R)*: Festival budaya Irau, daya tarik wisata, museum/heritage, olahraga & rekreasi |
| `T` | Aktivitas Jasa Lainnya | `S,T,U,V` *(Jasa Lainnya)* | *(Geser dari S)*: Organisasi/ormas/rumah ibadah, salon/laundry, dan **termasuk bengkel/reparasi mobil & sepeda motor (`95`)** |
| `U` | Aktivitas Rumah Tangga Sebagai Pemberi Kerja dan Aktivitas Produksi Barang dan Jasa oleh Rumah Tangga untuk Keperluan Sendiri yang Tidak Terdiferensiasi | `S,T,U,V` *(Jasa Lainnya)* | *(Geser dari T)*: Jasa pekerja rumah tangga (PRT) & produksi rumah tangga untuk konsumsi sendiri |
| `V` | Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya | `S,T,U,V` *(Jasa Lainnya)* | *(Geser dari U)*: Program/operasional lembaga internasional di wilayah KTT |

### 5.3 Aturan Metodologi PDRB BPS (`pedoman_pdrb` & Kalibrasi Prompt)
1. **Batasan Produksi (`Section 3.3.4, 3.3.8 KBLI 2025` & Pedoman Lapangan Usaha):**
   - **Unit Pemerintah Non-Administrasi:** Pembangunan fisik RSUD/sekolah/jalan tetap masuk **`F` (Konstruksi)**; layanan pendidikan sekolah/beasiswa masuk **`Q`**, layanan RSUD/puskesmas masuk **`R`**, sedangkan belanja umum OPD/fiskal/DBH masuk **`P`**.
   - **Jasa Intermediasi:** Platform digital dipetakan ke sektor barang/jasa yang diperantarai (`G` e-commerce, `H` ekspedisi/ojol, `I` OTA), bukan `K`.
   - **Pertanian vs Industri:** Penjualan TBS sawit mentah/kayu bulat/ikan segar = **`A`**; pengolahan menjadi CPO/kayu lapis/pangan kemasan = **`C`**.
2. **Aturan 6 Komponen Pengeluaran & Proksi Spesifik KTT (Pedoman Pengeluaran BPS Kab/Kota & Matriks LRA):**
   - `PK_RT`: Konsumsi akhir barang/jasa rumah tangga di KTT (sembako, listrik RT, sandang, hiburan). **Dilarang** dipakai untuk komoditas ekspor mentah (batubara/CPO/TBS) atau penjualan ke luar provinsi.
   - `PK_LNPRT`: Operasional organisasi nonprofit melayani RT (tempat ibadah masjid/gereja, partai politik, ormas, organisasi profesi/adat) — tidak termasuk proyek gedung berskala besar APBD (`PMTB`).
   - `PK_P`: Belanja pegawai OPD (`5.1.01`, gaji/TPP ASN), belanja barang-jasa operasional (`5.1.02`, pemeliharaan rutin, perjadin, BOS/BOK/BLUD), dan hibah/bansos tunai pemda (`5.1.05`/`5.1.06`).
   - `PMTB`: Pembentukan aset fisik jangka panjang — belanja modal mesin/alat berat/LKPM BKPM (`5.2.02`), kendaraan operasional + BBNKB/PKB (`5.2.02.02`), konstruksi bangunan/jalan/pelabuhan/PBG (`5.2.03`/`5.2.04`), serta investasi proyek swasta fisik.
   - `INVENTORY_CHANGE`: Perubahan stok fisik komoditas (**stockpile batubara** $S_{\text{akhir}} - S_{\text{awal}}$, stok beras Bulog, gudang pabrik/semen).
   - `NET_EXPORT`: Arus barang & jasa keluar KTT (*pengapalan batubara, CPO/TBS, kayu olahan, perikanan, produk IKM keluar daerah*) dikurangi arus masuk (*bongkar muat kapal feri/logistik masuk KTT*). Aturan tanda wajib: pengapalan ekspor naik → `INCREASE_REAL`; lonjakan impor masuk ($M \uparrow$) tanpa ekspor naik → **`DECREASE_REAL`**; perubahan harga komoditas ekspor murni → `INCREASE_DEFLATOR` / `DECREASE_DEFLATOR`.
3. **Pemisahan Sumbu Output Riil (ADHK) vs Harga/Deflator (ADHB):**
   - Kejadian volume/fisik/realisasi anggaran → `INCREASE_NTB`/`DECREASE_NTB` dan `INCREASE_REAL`/`DECREASE_REAL`.
   - Kejadian pergerakan harga komoditas/tarif/BBM/inflasi tanpa pergeseran tonase → `INCREASE_PRICE`/`DECREASE_PRICE` dan `INCREASE_DEFLATOR`/`DECREASE_DEFLATOR`.
   - Berita tarif statis/grafik data historis ($\Delta = 0$) wajib ditolak sebagai `is_economic_phenomenon = false`.

### 5.4 Standardisasi Tampilan UI Webapp: `kode_lapus - nama_lapus` (Tanpa Kurung Siku / Titik)
Seluruh komponen publik & admin diseragamkan menggunakan helper tunggal (`formatLapusLabel(code, name)` di `usePdrbLabels.ts` & `PDRB_17_SECTORS[i].fullLabel`) sehingga tidak ada lagi inkonsistensi `[A] ...` maupun `A • ...`:
- **Format baku:** **`kode_lapus - nama_lapus`** (mis. **`A - Pertanian, Kehutanan, dan Perikanan`** untuk KBLI tunggal, atau **`J,K - Informasi & Komunikasi`** pada dropdown/chip 17 sektor — tanpa kurung siku `[]` dan tanpa titik `•`).
- **Titik Pembaruan UI:** [`usePdrbLabels.ts`](file:///f:/18%20-%20SIPENA%20KTT/app/composables/usePdrbLabels.ts#L156-L212) (`kbliOptions`, `getKbliShortCodeName`), [`PhenomenonFeedCard.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/components/public/PhenomenonFeedCard.vue#L246), [`PublicArticleDetailModal.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/components/public/PublicArticleDetailModal.vue#L208), [`PublicFilterBar.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/components/public/PublicFilterBar.vue#L59), [`SectorDistributionCharts.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/components/public/SectorDistributionCharts.vue#L45-L64), [`linimasa.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/pages/linimasa.vue#L300-L312), [`index.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/pages/index.vue#L341), [`admin/articles.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/pages/admin/articles.vue#L232), [`admin/synthesis.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/pages/admin/synthesis.vue#L59), [`admin/index.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/pages/admin/index.vue#L501-L630), [`admin/trends.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/pages/admin/trends.vue#L670-L672), [`admin/taxonomy.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/pages/admin/taxonomy.vue#L380-L438), [`CommandPaletteModal.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/components/admin/CommandPaletteModal.vue#L319), serta judul label `"KBLI (A–V)"` pada seluruh formulir/grafik.

---

## 6. Perubahan Skema Basis Data, Migrasi KBLI 2025, Observabilitas & Pembersihan Aman

### 6.1 Migrasi Atomik Non-Destruktif (`server/db/schema.ts` & `migrations/0002_*`)
1. **Swap Enum Aman `kbli_category` → KBLI 2025 (`A–V`) dalam Transaksi Tunggal:**
   ```sql
   CREATE TYPE "public"."kbli_category_v2025" AS ENUM(
     'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V'
   );

   ALTER TABLE "articles"
     ALTER COLUMN "kbli_category" TYPE "public"."kbli_category_v2025"
     USING (CASE "kbli_category"::text
       WHEN 'U' THEN 'V' WHEN 'T' THEN 'U' WHEN 'S' THEN 'T' WHEN 'R' THEN 'S'
       WHEN 'Q' THEN 'R' WHEN 'P' THEN 'Q' WHEN 'O' THEN 'P' WHEN 'N' THEN 'O'
       WHEN 'M' THEN 'N' WHEN 'L' THEN 'M' WHEN 'K' THEN 'L'
       ELSE "kbli_category"::text
     END)::"public"."kbli_category_v2025";

   ALTER TABLE "national_keywords"
     ALTER COLUMN "default_kbli_category" TYPE "public"."kbli_category_v2025"
     USING (CASE "default_kbli_category"::text
       WHEN 'U' THEN 'V' WHEN 'T' THEN 'U' WHEN 'S' THEN 'T' WHEN 'R' THEN 'S'
       WHEN 'Q' THEN 'R' WHEN 'P' THEN 'Q' WHEN 'O' THEN 'P' WHEN 'N' THEN 'O'
       WHEN 'M' THEN 'N' WHEN 'L' THEN 'M' WHEN 'K' THEN 'L'
       ELSE "default_kbli_category"::text
     END)::"public"."kbli_category_v2025";

   DROP TYPE "public"."kbli_category";
   ALTER TYPE "public"."kbli_category_v2025" RENAME TO "kbli_category";
   ```
   *Verifikasi langsung DB VPS:* Saat ini hanya ada **1 artikel** (`O` → `P`: pajak kendaraan BPKPD KTT) dan **1 keyword** (`O` → `P`: `"DBH migas kaltara"`) dengan kategori $\ge J$, serta **0** `synthesis_drafts` berdimensi `kbli`. Pembaruan [`server/db/seed.ts`](file:///f:/18%20-%20SIPENA%20KTT/server/db/seed.ts#L37) juga disesuaikan agar `"DBH migas kaltara"` memakai `KbliCategoryEnum.P`.
2. **Kolom Observabilitas Multi-LLM di `scraper_logs`:**
   - Menambahkan `provider_stats JSONB NOT NULL DEFAULT '{}'` menyimpan statistik per kunci model (`calls, successes, rateLimits, failures, inputTokens, outputTokens, totalTokens, totalLatencyMs`).
3. **Perluasan `synthesis_drafts_mode_chk`:**
   - Memperbarui check constraint menjadi `generation_mode IN ('gemini', 'llm', 'template')` sehingga draf historis `'gemini'` tetap utuh.

### 6.2 Skrip Rekomendasi Arsip Non-Destruktif Berita Non-KTT Lama (`npm run db:archive-nonktt`)
- **Mengapa tidak `DELETE`?** Menghapus baris di `articles` akan menghapus `url_hash`, sehingga crawler keesokan harinya dapat mengambil ulang URL Nunukan/Riau lama tersebut sebagai kandidat baru!
- **Solusi yang Direkomendasikan (Eksekusi Terkontrol via CLI `--dry-run` / `--apply`):**
  1. Memindai **hanya** baris `source_type IN ('NATIONAL', 'REGIONAL')` (menjamin `0` baris `MANUAL` tersentuh) dengan `verification_status IN ('PENDING', 'VERIFIED')` yang gagal melewati aturan deterministik `evaluateGeographicRelevance()` atau pola data harga statis ($\Delta = 0$), serta selalu menyajikan pratinjau lengkap sebelum mengubah apa pun (`--dry-run` default).
  2. Saat dijalankan dengan `--apply`, melakukan **pengarsipan aman (`UPDATE`)** menjadi `verification_status = 'IGNORED'`, `is_economic_phenomenon = false`, mengosongkan kolom KBLI/Pengeluaran, dan mengisi `llm_error = '[Arsip Non-KTT/Non-Fenomena] ...'` sehingga `url_hash` tetap menjaga deduplikasi permanen dan catatan yang valid milik KTT tetap utuh.
  3. Menawarkan opsi mengetatkan keyword `"subsidi ongkos angkut"` / `"harga TBS kelapa sawit"` atau memproses ulang antrean `PENDING` yang relevan melalui router Multi-LLM baru setelah deploy.

### 6.3 Endpoint & Antarmuka Admin
- **`GET /api/admin/scrapers/logs` & `/admin/scrapers`:** Menambah `observability.providerHealth` & `providerStats30d` + kartu **Status & Kapasitas Penyedia LLM (Gemini + Groq + Opsional OpenRouter)** serta detail model di [`ScraperLogTable.vue`](file:///f:/18%20-%20SIPENA%20KTT/app/components/admin/ScraperLogTable.vue).
- **`/admin/synthesis` & `/admin/taxonomy`:** Menampilkan lencana penyedia aktif (`Gemini`, `Groq`, `OpenRouter`, `Template`), memperbarui taksonomi KBLI 2025 (22 kategori `A–V`, perubahan `G`/`T`/`J`/`K`), serta contoh keyword ber-lokus KTT/Kaltara.
- **[`shared/utils/pdrb-colors.ts`](file:///f:/18%20-%20SIPENA%20KTT/shared/utils/pdrb-colors.ts):** Memasukkan `'K'` (Telekomunikasi/IT) ke `TRADE_LOGISTICS` dan `'L'..'V'`, `'N,O'`, `'S,T,U,V'` ke `FINANCE_PUBLIC` serta `'J,K'` ke `TRADE_LOGISTICS`.

---

## 7. Strategi Pengujian & Gerbang Kualitas (*Quality Gates*)

1. **Test Suite Baru & Terbarukan (`npx vitest run`):**
   - `tests/pdrb-colors.test.ts` & `tests/pdrb-analytics.test.ts`: Memverifikasi **22 huruf KBLI 2025 (`A–V`)** terpetakan utuh tanpa celah ke **17 kategori sektor PDRB** (`J,K`, `N,O`, `S,T,U,V`) dan seluruh klaster warna valid.
   - `tests/llm-router.test.ts`: Failover `0ms` Gemini→Groq 70B saat kuota harian habis/`503`, TPM bucket pacing, dual prompt `FULL` vs `COMPACT`, `propertyOrdering`, konsistensi Zod (`OTHER_REGION_IRRELEVANT` vs `is_economic_phenomenon = false`), sintesis fallback berjenjang, dan penolakan data harga stagnan.
   - `tests/smart-scraper.test.ts`: Benuanta RSS parser + pemblokiran sidebar HTML, dekoder Google News `Fbv4je` + SSRF check, dedup lintas sumber & histori 10 hari, serta penghapusan kalimat injeksi palsu KTT pada `buildNationalFallbackSnippet()` & penolakan SOA Nunukan/Krayan + TBS Riau/Jambi sebelum memanggil LLM.
   - Seluruh 12 suite test eksisting (`tests/llm-schema.test.ts`, `tests/scraper-pipeline.test.ts`, `tests/synthesis-drafts.test.ts`, `tests/export-excel.test.ts`, dll.) diperbarui seperlunya agar selaras KBLI 2025 & lulus 100%.
2. **Quality Gates Sebelum Deploy:**
   - `npx nuxt typecheck` → `0` error.
   - `npm run build` → sukses bersih.
   - Chrome DevTools verifikasi pada `/`, `/linimasa`, `/admin/scrapers`, `/admin/synthesis`, `/admin/taxonomy` → format `[kode_lapus] - [nama_lapus]` konsisten & 0 error konsol/hidrasi.
