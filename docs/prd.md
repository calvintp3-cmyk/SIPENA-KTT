# Product Requirements Document (PRD) — SIPENA KTT

**Nama Produk:** SIPENA KTT (*Sistem Informasi Pencari Fenomena Ekonomi Kabupaten Tana Tidung*)  
**Versi Dokumen:** 2.0.0 (Single Source of Truth — KBLI 2025 & Multi-LLM Smart Pipeline)  
**Domain:** Statistik Ekonomi Makro Regional — Produk Domestik Regional Bruto (PDRB)  
**Target Instansi / Pengguna Utama:** Tim Neraca Wilayah dan Analisis Statistik (Nerwilis), BPS Kabupaten Tana Tidung & Pemangku Kepentingan Pemerintah Daerah  
**Tech Stack Inti:** Nuxt 3/4 Compat (SSR/Nitro, TypeScript), Nuxt UI v3 (`@nuxt/ui`), ECharts, PostgreSQL 16 + Drizzle ORM, Cheerio, **Multi-LLM Router** (`@google/genai` Gemini 3 + Groq Llama 3 + OpenRouter Free), ExcelJS (`exceljs`)

---

## 1. Latar Belakang Masalah, Visi Produk, dan Ringkasan Eksekutif

### 1.1 Latar Belakang Masalah
Penyusunan angka **Produk Domestik Regional Bruto (PDRB)** Kabupaten Tana Tidung (Provinsi Kalimantan Utara)—baik atas dasar harga berlaku (ADHB) maupun atas dasar harga konstan (ADHK)—menghadapi tiga tantangan operasional utama:
1. **Ketertinggalan (*Lag*) Data Sekunder Konvensional:** Survei statistik sektoral dan laporan administrasi OPD kerap tersedia setelah triwulan berakhir, sementara analis Nerwilis membutuhkan sinyal *real-time* pertumbuhan riil dan pergerakan harga selama triwulan berjalan.
2. **Fragmentasi Berita Regional, Kebocoran Berita Tetangga, & Transmisi Nasional:** Fenomena ekonomi Kab. Tana Tidung tersebar pada 4 portal regional Kaltara (`Tribun Kaltara`, `Koran Kaltara`, `Benuanta`, `Radar Tarakan`) sekaligus berita nasional. Tantangan di lapangan adalah menyaring berita lokal kabupaten lain (seperti Nunukan/Krayan, Tarakan, Bulungan, Malinau) agar tidak mencemari antrean kurasi, tanpa membuang kebijakan makro Kaltara atau nasional yang benar-benar bertransmisi ke Tana Tidung.
3. **Beban Klasifikasi KBLI 2025 & Kuota LLM Gratis:** Pemetaan berita ke **22 Kategori KBLI 2025 (`A–V`) — Peraturan BPS No. 7 Tahun 2025** dan **6 Komponen PDRB Pengeluaran** menuntut ketelitian konseptual SNA 2008 / Pedoman PDRB BPS, sementara mengandalkan satu penyedia LLM gratis berisiko gagal saat terkena *rate limit* atau lonjakan trafik.

### 1.2 Visi Produk
Menghadirkan platform intelijen fenomena ekonomi daerah berbasis *smart scraping* dan **orkestrasi Multi-LLM gratis berketahanan tinggi (*0ms failover*)**, sehingga setiap dinamika ekonomi Kab. Tana Tidung terekam akurat setiap hari, lolos seleksi geografis ketat, tervalidasi analis Nerwilis, divisualisasikan ke publik, dan siap diekspor ke kertas kerja PDRB maupun draf Narasi BRS.

### 1.3 Ringkasan Eksekutif
**SIPENA KTT** memanen berita setiap pukul 04:00 WITA (serta sapuan ulang LLM 06:30 WITA) dari 4 portal lokal Kalimantan Utara plus pencarian berita nasional **Hybrid Bing News RSS + Google News RSS**. Artikel dideduplikasi lintas-URL (`url_hash`) maupun kemiripan judul 10 hari, melewati penyaringan geografis deterministik pra-LLM (`geo-filter.ts`), lalu diklasifikasi melalui **`MultiLlmRouter`** (Gemini → Groq → OpenRouter Free) dengan *Structured JSON Schema*:
1. Cakupan geografis (`geographic_scope`: `KTT_LOCAL`, `KALTARA_PROVINCIAL`, `NATIONAL_MACRO_IMPACT`, atau `OTHER_REGION_IRRELEVANT`).
2. Keputusan fenomena ekonomi nyata (`is_economic_phenomenon`, menolak pengumuman tarif stagnan, rekap historis, seremonial, dan wilayah lain).
3. Pemetaan **KBLI 2025 (`A–V`)** beserta arah dampaknya (**NTB** vs **Harga**).
4. Pemetaan **6 Komponen Pengeluaran** beserta arah dampaknya (**Pengeluaran Riil** vs **Deflator**).
5. Penentuan Triwulan I–IV & Tahun kejadian.

Standar penulisan nama lapangan usaha di seluruh webapp menggunakan format **`kode_lapus - nama_lapus`** (misalnya `A - Pertanian, Kehutanan, dan Perikanan`, `N,O - Jasa Perusahaan`, `S,T,U,V - Jasa Lainnya`) untuk konsistensi publikasi resmi.

---

## 2. Ruang Lingkup & Sumber Data

### 2.1 Target Portal Berita Regional (4 Portal)
1. `https://kaltara.tribunnews.com/tag/tana-tidung` (+ `/kaltara/tanah-tidung`)
2. `https://korankaltara.com/category/tana-tidung`
3. `https://benuanta.co.id/?s=tana+tidung` + jalur RSS WordPress (`/topic/berita-ktt/feed/`, `/category/tana-tidung/feed/`, `/category/pemkab-tana-tidung/feed/`, `/feed/?s=tana+tidung`)
4. `https://radartarakan.jawapos.com/tana-tidung`

### 2.2 Penjaringan Berita Nasional Berbasis Master Keyword Dinamis
Portal nasional dijaring paralel melalui **Bing News RSS** (`format=rss` dengan ekstraksi URL penerbit langsung dari parameter `url=`) dan **Google News RSS** (`hl=id&gl=ID&ceid=ID:id` lengkap dengan dekoder tautan JS wrapper `Fbv4je` serta cuplikan fallback netral bila portal terproteksi).

### 2.3 Di Luar Cakupan (*Out of Scope*)
- Estimasi ekonometrika angka rupiah ADHB/ADHK otomatis — sistem menyajikan sinyal kualitatif terstruktur sebagai masukan penyusunan neraca dan narasi BRS analis BPS.
- Pemrosesan PDF/video mentah.
- Berita lokal kabupaten/kota lain tanpa dampak ke Kab. Tana Tidung.

---

## 3. Persona Pengguna & Hak Akses

| Atribut | Persona A: Admin Nerwilis / Pengolah PDRB | Persona B: Public Stakeholder |
|---|---|---|
| **Identitas Khas** | Statistisi Ahli / Pengolah Data Neraca Wilayah BPS Kab. Tana Tidung | Bappeda-Litbang, OPD Pemkab Tana Tidung, Akademisi, Pelaku Usaha, Masyarakat |
| **Tujuan Utama** | Menyaring sinyal KTT bebas noise daerah lain, meninjau & memverifikasi klasifikasi KBLI 2025 (`A–V`), menyusun draf narasi BRS (`/admin/synthesis`), memonitor Multi-LLM, dan mengekspor `.xlsx` 10 kolom. | Memantau perkembangan sektor usaha & pengeluaran Kab. Tana Tidung per triwulan melalui Landing Dashboard (`/`), Linimasa interaktif (`/linimasa`), dan metrik grafis ECharts. |
| **Kebutuhan Akses** | Terautentikasi Google OAuth Whitelist (`/login`) atau kredensial lokal + RBAC (`ADMIN` / `OPERATOR`). | Tanpa login (*read-only*), hanya artikel `VERIFIED` & `is_economic_phenomenon = true`. |

---

## 4. Core Epics & User Stories

### Epic 1: Smart Scraper Engine, Dedup & Geo-Filter (`SCRAPE`)
- **US-1.1 (Regional Portal & RSS Fast-Path):** Crawl 4 portal lokal setiap 04:00 WITA; membersihkan blok sidebar/widget terpopuler, menolak subkanal kabupaten tetangga (`/nunukan/`, `/tarakan/`, dst.), dan memanfaatkan WordPress RSS CDATA agar hemat permintaan HTML.
- **US-1.2 (Hybrid National Harvester & Fbv4je Decoder):** Menjalankan Bing News RSS + Google News RSS secara paralel, mengekstrak URL langsung, mendekode wrapper `CBMi...` via `batchexecute?rpcids=Fbv4je`, serta melakukan deduplikasi judul 10 hari (`dedup.ts`) dengan prioritas `REGIONAL > NATIONAL langsung > wrapper`.
- **US-1.3 (Gerbang Geografis Deterministik):** `geo-filter.ts` menolak artikel kabupaten tetangga/provinsi lain dan berita harga statis sebelum menyentuh kuota LLM (`IGNORED`, `llm_model = 'geo-filter' | 'title-geo-filter'`), sedangkan artikel berjangkar KTT, Kaltara makro, dan nasional relevan diteruskan ke router.

### Epic 2: Multi-LLM Router & Taksonomi KBLI 2025 (`AI`)
- **US-2.1 (Klasifikasi Terstruktur Multi-Penyedia 0ms Failover):** Artikel dikompres (`<= 290` kata) dan dikirim melalui `MultiLlmRouter` (Gemini `3.8-flash` / `3.5-flash-lite`, Groq `llama-3.3-70b-versatile` / `llama-3.1-8b-instant`, serta opsional OpenRouter Free). Jika satu penyedia terkena limit TPM/RPM/RPD atau `429/503`, router berpindah `0ms` ke slot siap berikutnya tanpa gagal massal.
- **US-2.2 (Pemetaan KBLI 2025 `A–V` & Pengeluaran):** Menghasilkan `geographic_scope`, `is_economic_phenomenon`, `summary` (3–5 kalimat baku), `kbli_category` (`A`–`V`), `kbli_impact`, `expenditure_component`, `expenditure_impact`, `quarter`, dan `year`.
- **US-2.3 (Ketahanan Kegagalan & Telemetry per Slot):** Jika seluruh slot LLM sementara tak tersedia, artikel tetap tersimpan aman (`llm_status = 'FAILED'`, `verification_status = 'PENDING'`) dan statistik pemakaian per slot tercatat dalam `scraper_logs.provider_stats`.

### Epic 3: Daily Review, Sintesis Narasi BRS & Ekspor (`REVIEW`, `SYNTHESIS`, `ARCHIVE`)
- **US-3.1 (Review & Inline Edit):** Tab `Pending / Verified / Ignored`, badge penyedia LLM (`Gemini`, `Groq`, `OpenRouter`, `Geo Filter`), verifikasi 1-klik, batch action, dan Slide-over Drawer edit cepat.
- **US-3.2 (Sintesis Narasi BRS Berbasis Multi-LLM):** Penyusunan draf BRS (`/admin/synthesis`) memanggil `MultiLlmRouter` dengan aturan anti-halusinasi & sitasi `[1]..[N]`, tersimpan kolaboratif di PostgreSQL (`synthesis_drafts`), dilengkapi cetak A4 & unduh Word `.doc`.
- **US-3.3 (Bank Data & Ekspor `.xlsx`/`.csv` 10 Kolom):** Filter multi-parameter KBLI 2025 `A–V`, manual input, serta ekspor tepat 10 kolom resmi Nerwilis berformat `kode_lapus - nama_lapus`.

### Epic 4: Public Stakeholder Portal (`PUBLIC`) & Admin Observability (`ADMIN-OPS`)
- **US-4.1 (Landing `/` & Linimasa `/linimasa`):** KPI snapshot real-time, 2 grafik ECharts (17 Sektor KBLI 2025 per 4 klaster warna & 6 Komponen Pengeluaran), sticky filter, mode Stream & Tabel Ringkas.
- **US-4.2 (Scraper Observability & Akses OAuth):** Kartu kesehatan & kapasitas slot penyedia LLM (`providerHealth` + `providerStats30d`), kolom Rute LLM dan modal statistik per slot pada riwayat log, manajemen direktori portal, kamus taksonomi KBLI 2025, dan manajemen tim whitelist.

---

## 5. Aturan Bisnis & Domain PDRB (KBLI 2025)

### 5.1 Taksonomi 22 Kategori KBLI 2025 (`A–V` — Peraturan BPS No. 7 Tahun 2025) & 17 Sektor PDRB
Standar tampilan di antarmuka dan ekspor memakai format `kode_lapus - nama_lapus`:

| Kode KBLI 2025 | Grup PDRB 17 Sektor | Nama Resmi Kategori KBLI 2025 | Contoh Konteks Ekonomi Kab. Tana Tidung |
|---|---|---|---|
| `A` | `A` | Pertanian, Kehutanan, dan Perikanan | Panen & harga TBS kelapa sawit mentah kebun, padi, kayu bulat/HTI, perikanan tangkap & tambak udang/bandeng. |
| `B` | `B` | Pertambangan dan Penggalian | Produksi & HBA batubara (termasuk pencucian/benefisiasi), migas, kuari pasir/batu/sirtu proyek. |
| `C` | `C` | Industri | Pabrik kelapa sawit (CPO/PKO), penggilingan padi, kayu lapis/chipmill, industri pengolahan ikan & IKM makanan-minuman. |
| `D` | `D` | Penyediaan Listrik, Gas, Uap/Air Panas, dan Udara Dingin | Pembangkit PLTD/PLTS/EBT, perluasan jaringan PLN Tideng Pale & pedalaman, energi bersih. |
| `E` | `E` | Penyediaan Air; Pengelolaan Air Limbah, Penanganan Limbah, dan Remediasi | Layanan air bersih PDAM Tirta Taka, pembangunan SPAM/IPA, layanan TPA & limbah industri. |
| `F` | `F` | Konstruksi | Proyek Puspem KTT, jalan poros, jembatan, dermaga, serta pembangunan **fisik gedung sekolah dan gedung RSUD**. |
| `G` | `G` | Perdagangan Besar dan Eceran | Niaga bahan pokok, BBM, material bangunan, pasar rakyat, ritel, niaga-el *(reparasi kendaraan pindah ke `T`)*. |
| `H` | `H` | Transportasi dan Penyimpanan | Pelabuhan Tideng Pale/Sesayap, speedboat, feri, tongkang logistik, subsidi ongkos angkut (SOA), kurir/ekspedisi. |
| `I` | `I` | Aktivitas Penyediaan Akomodasi dan Makan Minum | Tingkat hunian hotel/penginapan saat event daerah, restoran, kafe, UMKM kuliner, platform OTA reservasi. |
| `J` | `J,K` | Aktivitas Penerbitan, Penyiaran, serta Produksi dan Distribusi Konten | Penerbitan berita/media lokal, penyiaran TV/radio, produksi konten digital (bagian dari Sektor `J,K - Informasi dan Komunikasi`). |
| `K` | `J,K` | Aktivitas Telekomunikasi, Pemrograman Komputer, Konsultansi, Infrastruktur Komputasi, dan Jasa Informasi Lainnya | Menara BTS desa blankspot, internet desa, komputasi awan, sistem pemerintahan/swasta berbasis TI (Sektor `J,K`). |
| `L` | `L` | Aktivitas Keuangan dan Asuransi | Bankaltimtara, penyaluran KUR/kredit usaha, koperasi simpan pinjam, asuransi, transaksi QRIS/fintech. |
| `M` | `M` | Aktivitas Real Estat | Pengembang perumahan, transaksi & sewa ruko/lahan/bangunan kawasan Tideng Pale, gudang penyimpanan mandiri. |
| `N` | `N,O` | Aktivitas Profesional, Ilmiah, dan Teknis | Jasa konsultansi teknik konstruksi, studi AMDAL, akuntan, hukum, survei/sertifikasi (Sektor `N,O - Jasa Perusahaan`). |
| `O` | `N,O` | Aktivitas Administratif dan Penunjang Usaha | Penyewaan alat berat tambang/konstruksi & armada operasional, agen perjalanan dinas, alih daya tenaga kerja (Sektor `N,O`). |
| `P` | `P` | Administrasi Pemerintahan dan Pertahanan, serta Jaminan Sosial Wajib | Realisasi APBD/LRA umum, gaji/TPP ASN Pemkab KTT, transfer DBH/DAU/DAK/TKD, pajak & retribusi daerah. |
| `Q` | `Q` | Pendidikan | Layanan operasional sekolah, penyaluran BOS/BOSDA, beasiswa KTT, pelatihan vokasi/BLK *(non-gedung)*. |
| `R` | `R` | Aktivitas Kesehatan Manusia dan Aktivitas Sosial | Operasional pelayanan medis RSUD Akhmad Berahim, puskesmas, klinik, program jaminan & layanan sosial *(non-gedung)*. |
| `S` | `S,T,U,V` | Kesenian, Olahraga, dan Rekreasi | Festival Budaya Irau, wisata budaya/alam KTT, event olahraga daerah (Sektor `S,T,U,V - Jasa Lainnya`). |
| `T` | `S,T,U,V` | Aktivitas Jasa Lainnya | Organisasi kemasyarakatan, rumah ibadah, salon/binatu, serta **bengkel/reparasi mobil & sepeda motor** (KBLI 95 -> `S,T,U,V`). |
| `U` | `S,T,U,V` | Aktivitas Rumah Tangga Sebagai Pemberi Kerja dan Produksi Rumah Tangga untuk Keperluan Sendiri | Jasa pekerja domestik dan produksi rumah tangga untuk konsumsi sendiri (Sektor `S,T,U,V`). |
| `V` | `S,T,U,V` | Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya | Program hibah/operasional langsung badan internasional di wilayah kerja KTT (Sektor `S,T,U,V`). |

### 5.2 Aturan Dampak Dua Sisi & 6 Komponen Pengeluaran
- **Lapangan Usaha (`KbliImpactEnum`):** `INCREASE_NTB` (`Meningkatkan NTB`), `DECREASE_NTB` (`Menurunkan NTB`), `INCREASE_PRICE` (`Meningkatkan Harga`), `DECREASE_PRICE` (`Menurunkan Harga`).
- **Pengeluaran (`ExpenditureComponentEnum`):** `PK_RT`, `PK_LNPRT`, `PK_P`, `PMTB`, `INVENTORY_CHANGE`, `NET_EXPORT`.
- **Dampak Pengeluaran (`ExpenditureImpactEnum`):** `INCREASE_REAL` (`Meningkatkan Pengeluaran Riil`), `DECREASE_REAL` (`Menurunkan Pengeluaran Riil`), `INCREASE_DEFLATOR` (`Meningkatkan Indeks Harga/Deflator`), `DECREASE_DEFLATOR` (`Menurunkan Indeks Harga/Deflator`).
- **Siklus Verifikasi:** `PENDING`, `VERIFIED`, `IGNORED` (ketat dengan constraint `articles_verified_completeness_chk`).

---

## 6. Non-Functional Requirements (NFR) & Keamanan

1. **Zero-Cost Multi-LLM Resilience:** Dukungan kunci gratis `GEMINI_API_KEY`/`GEMINI_API_KEYS`, `GROQ_API_KEY`/`GROQ_API_KEYS`, serta opsional `OPENROUTER_API_KEY` + `OPENROUTER_FREE_MODEL` (bisa dikosongkan untuk rotasi 4 model default). Pemantauan RPM/TPM berbasis sliding window `60s` + failover `0ms` menjaga batch harian berjalan cepat tanpa biaya berlangganan.
2. **Hardening Keamanan OWASP:** Google OAuth Whitelist + password hashing `Scrypt`/`Argon2`, proteksi SSRF DNS/IP private, sanitasi `.csv` formula injection, header keamanan HTTP, serta penyensoran API key pada log kesalahan.
3. **Efisiensi VPS Ubuntu 24.04:** Runtime PM2 `fork` 1 instance, batas RAM < 512 MB tanpa headless browser, advisory lock DB, serta timeout batch ketat (`3 menit`).
