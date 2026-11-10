# Product Requirements Document (PRD)
## SIPENA-KTT (Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung)
**Document Version:** 1.0.0  
**Target Release:** Production Q1 2025  
**Owner:** Tim Nerwilis (Neraca Wilayah dan Analisis Statistik), BPS Kabupaten Tana Tidung  
**Classification:** Technical Blueprint & Product Requirements  

---

## 1. Executive Summary & Problem Definition

### 1.1 Context
Badan Pusat Statistik (BPS) Kabupaten Tana Tidung bertugas menyusun indikator makroekonomi regional utama, yaitu **Produk Domestik Regional Bruto (PDRB)**, baik berdasarkan pendekatan **Lapangan Usaha** (17 Kategori KBLI) maupun **Pengeluaran** (6 Komponen Agregat). Penyusunan angka PDRB triwulanan dan tahunan tidak hanya mengandalkan data statistik kuantitatif rutin, melainkan sangat bergantung pada **Fenomena Ekonomi (Economic Phenomena / Economic Shocks)** yang terjadi di wilayah Kabupaten Tana Tidung dan sekitarnya (Provinsi Kalimantan Utara serta dinamika nasional yang berdampak langsung).

Fenomena ekonomi mencakup peristiwa riil seperti pergeseran musim panen sawit, penyesuaian kuota produksi batubara, pengerjaan proyek strategis infrastruktur Pemkab Tana Tidung (misal: pembangunan Pusat Pemerintahan di Bundaran Sebawang, jalan poros Sesayap-KTT), dinamika harga komoditas tambak udang/bandeng, pencairan APBD / gaji ke-13/THR ASN, hingga gangguan logistik pelabuhan dan speedboat sungai Sebuku-Tarakan-KTT.

### 1.2 Core Problem Statement
Dalam workflow eksisting:
1. **Manual Scraping & Fragmented Gathering**: Staf neraca melakukan pencarian manual harian/mingguan melintasi puluhan portal berita lokal Kaltara dan nasional. Berita penting kerap terlewat (*information omission*).
2. **High Cognitive Burden in Mapping**: Berita naratif harus diklasifikasikan secara manual ke dalam kode KBLI 2025 (Kategori A s.d. U) dan Komponen Pengeluaran (PK-RT, PK-LNPRT, PK-P, PMTB, Perubahan Inventori, Net Ekspor), serta diidentifikasi dampak harga versus volumenya.
3. **Compile Time Crunch**: Menjelang *reconciliation meeting* PDRB triwulanan (BPS Kabupaten dengan BPS Provinsi Kaltara), kompilasi dokumen fenomena ("Dossier Fenomena") menyita 60–80 jam kerja staf hanya untuk rekapitulasi manual ke dalam spreadsheet.
4. **No Centralized Historical Repository**: Fenomena ekonomi triwulan-triwulan lampau tersimpan dalam file-file Excel lokal yang terfragmentasi, tanpa basis data terindeks untuk analisis *time-series* atau audit data.

### 1.3 Solution & Scope
**SIPENA-KTT** adalah platform web otomatis berbasis AI yang dirancang untuk:
1. Melakukan web scraping terjadwal (daily cron) terhadap portal berita target regional Kalimantan Utara dan kata kunci terarah nasional.
2. Mengekstrak, merangkum, dan mengklasifikasikan fenomena ekonomi secara terstruktur menggunakan Google Gemini Flash melalui Vercel AI SDK dengan skema KBLI dan Komponen Pengeluaran yang baku.
3. Menyediakan antarmuka penelaahan (*Human-in-the-Loop Review Dashboard*) bagi analis BPS untuk memvalidasi, menyunting, menolak, atau menyetujui ekstraksi AI.
4. Menyediakan **Excel Export Center** yang menghasilkan berkas kerja `.xlsx` terformat resmi sesuai standar tabel kompilasi Diseminasi/Nerwilis BPS per triwulan dan sektor.

---

## 2. Target Data Sources & Ingestion Specifications

### 2.1 Regional Media Outlets (Primary Scope)

| Media Outlet | Base URL | Scraping Strategy | Target Coverage / Sections | Fallback Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Koran Kaltara** | `https://korankaltara.com` | RSS Feed + Cheerio DOM parsing | Kanal `tana-tidung`, `ekonomi-bisnis`, `kaltara` | Direct sitemap index XML parser |
| **Radar Tarakan** | `https://radartarakan.jawapos.com` | Cheerio DOM traversal (Jawa Pos Network structure) | Kanal `tana-tidung`, `kaltara`, `bisnis` | Puppeteer headless jika bot challenge aktif |
| **Tribun Kaltara** | `https://kaltara.tribunnews.com` | Cheerio pagination parser | Tag `tana-tidung`, `kabupaten-tana-tidung`, `ekonomi-kaltara` | Mobile subdomain (`m.tribunnews.com`) parsing |
| **Benuanta** | `https://benuanta.co.id` | WordPress REST API (`/wp-json/wp/v2/posts`) + Cheerio fallback | Kategori `tana-tidung`, `ekonomi` | Direct RSS feed (`/feed/`) |
| **Antara Kaltara** | `https://kaltara.antaranews.com` | RSS Feed (`/rss/terkini.xml`) + Cheerio content parser | Topik regional, perekonomian Kaltara | XML sitemap parser |

### 2.2 National Media Outlets with Context Filtering

Untuk media berskala nasional (misal: Antara News Nasional, Detik Finance, Kontan, Bisnis Indonesia, Kompas), data hanya ditarik apabila artikel lolos penyaringan **Boolean Keyword Expression**:

```text
("Tana Tidung" OR "KTT" OR "Tideng Pale" OR "Sesayap" OR "Sesayap Hilir" OR "Betayau" OR "Muruk Rian" OR "Tana Lia")
AND
("ekonomi" OR "inflasi" OR "sawit" OR "CPO" OR "batubara" OR "tambang" OR "APBD" OR "pembangunan" OR "infrastruktur" OR "pelabuhan" OR "feri" OR "speedboat" OR "pupuk" OR "gabah" OR "beras" OR "panen" OR "udang" OR "bandeng" OR "PDRB" OR "investasi" OR "semen")
```

### 2.3 Scraping Rules & Etiquette
- **User-Agent Identification**: `SIPENA-KTT-Bot/1.0 (+https://ktt.bps.go.id/sipena; bps6504@bps.go.id)`
- **Rate Limiting**: Maksimal 2 request per detik per target domain dengan jitter acak 500–1500 ms antar request.
- **Deduplication Strategy**: Menghitung `SHA-256` hash dari *canonical URL* yang dinormalisasi (menghilangkan query params pelacak seperti `utm_*`, `fbclid`, `ref`). Jika `url_hash` sudah ada di tabel `articles`, scraping dilewati.
- **Content Cleaning**: Membuang teks iklan, clickbait tags, elemen `aside`, `header`, `footer`, dan script tracking dari DOM; menyisakan teks paragraf inti berita (`article-content`).

---

## 3. Product Architecture & Core Modules

```
                    ┌──────────────────────────────────────────────┐
                    │               DATA INGESTION                 │
                    │  (Daily Cron: Cheerio / Puppeteer Scraper)   │
                    └──────────────────────┬───────────────────────┘
                                           │ Inserts raw articles
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │         POSTGRESQL (Table: articles)         │
                    └──────────────────────┬───────────────────────┘
                                           │ Unprocessed articles
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │            AI EXTRACTION PIPELINE            │
                    │   (Vercel AI SDK + Google Gemini Flash)     │
                    │   - Filter: Economic vs Non-Economic         │
                    │   - Taxonomy: KBLI 2025 (A-U) & Expenditure  │
                    │   - Metadata: Impact, Volume/Price, Q/Year   │
                    └──────────────────────┬───────────────────────┘
                                           │ Inserts structured output
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │   POSTGRESQL (Table: economic_phenomena)     │
                    │               Status: "pending"              │
                    └──────────────────────┬───────────────────────┘
                                           │
                      ┌────────────────────┴───────────────────┐
                      │                                        │
                      ▼                                        ▼
    ┌───────────────────────────────────┐    ┌───────────────────────────────────┐
    │    HUMAN-IN-THE-LOOP DASHBOARD    │    │        EXCEL EXPORT CENTER        │
    │  - BPS Analyst Review / Edit      │    │  - Filter by Quarter & Year       │
    │  - Approve / Reject / Adjust      │    │  - BPS Nerwilis Layout (.xlsx)    │
    │  - Audit Trail Logging            │    │  - Summary Aggregations           │
    └───────────────────────────────────┘    └───────────────────────────────────┘
```

---

## 4. Detailed Module Requirements

### 4.1 Module 1: Daily Ingestion Engine (Cron Job)
- **Schedule**: Dijalankan setiap hari pukul 05:00 WITA (21:00 UTC) pada VPS Biznet GIO.
- **Workflow**:
  1. Fetch indeks artikel/RSS feed dari daftar media target untuk artikel yang terbit dalam kurun 24–48 jam terakhir.
  2. Periksa keberadaan URL di tabel `articles` via `url_hash`.
  3. Lakukan HTTP GET pada URL baru, parse markup HTML menggunakan selector outlet spesifik.
  4. Ekstrak: Judul artikel, tanggal publikasi asli, nama penulis/editor, dan teks artikel lengkap.
  5. Simpan ke tabel `articles` dengan status `is_processed = false`.
- **Fault Tolerance**:
  - Timeout 15 detik per request.
  - Percobaan ulang bertahap (*exponential backoff retry*): 3 kali percobaan sebelum menandai `scrape_error`.
  - Logging status eksekusi (jumlah artikel baru, lewati, gagal) ke file `/var/log/sipena/cron.log`.

### 4.2 Module 2: AI Phenomenon Extraction & Taxonomy Classification
- **Trigger**: Dijalankan otomatis segera setelah pipeline scraping selesai (pukul 05:30 WITA), atau dipicu manual oleh admin melalui antarmuka web.
- **Model**: `gemini-1.5-flash` / `gemini-2.0-flash` melalui Vercel AI SDK (`ai` v4).
- **Extraction Schema**:
  1. `is_economic_phenomenon` (boolean): Menilai apakah artikel memiliki relevansi langsung atau tidak langsung terhadap indikator PDRB Kabupaten Tana Tidung.
  2. `summary` (string): Ringkasan padat maksimal 3–4 kalimat dalam Bahasa Indonesia formal statistik yang menjelaskan apa peristiwanya, siapa pelakunya, komoditas apa yang terdampak, serta besaran kuantitatifnya jika ada.
  3. `kbli_category` (enum A s.d. U): Sektor lapangan usaha terdampak utama (contoh: Kategori A untuk perkebunan sawit, Kategori B untuk batubara, Kategori F untuk proyek jalan Sebawang, Kategori O untuk belanja APBD).
  4. `kbli_subsector` (string): Rincian subsektor spesifik (contoh: "Perkebunan Kelapa Sawit", "Pertambangan Batubara", "Konstruksi Sipil Jalan", "Perikanan Budidaya Air Payau").
  5. `expenditure_component` (enum): Komponen PDRB Pengeluaran terdampak (`PK_RT`, `PK_LNPRT`, `PK_P`, `PMTB`, `PI`, `EKSPOR`, `IMPOR`, `TIDAK_RELEVAN`).
  6. `impact_type` (enum): Arah dampak (`positif`, `negatif`, `netral`).
  7. `price_volume_effect` (enum): Transmisi dampak (`volume`, `harga`, `keduanya`, `tidak_langsung`).
  8. `affected_commodities` (array of string): Komoditas yang disebut (contoh: `["Tandan Buah Segar (TBS)", "CPO"]`).
  9. `key_numerical_data` (JSON): Metrik nominal/kuantitatif (nilai proyek, persentase inflasi, volume produksi, tonnase).
  10. `quarter` (enum `Q1`, `Q2`, `Q3`, `Q4`) & `year` (integer): Periode triwulan berjalannya dampak.
  11. `confidence_score` (float 0.0–1.0): Estimasi keyakinan model terhadap hasil klasifikasi.
- **Handling Non-Economic News**: Jika `is_economic_phenomenon = false` (misal kriminalitas murni, perayaan seremonial non-anggaran), entri tetap disimpan di `economic_phenomena` namun otomatis diberi status `rejected` dengan alasan *"Non-economic content"*.

### 4.3 Module 3: Human-in-the-Loop Review Dashboard
- **Antarmuka Utama**:
  - Tabel interaktif (TanStack Table) menampilkan daftar fenomena berstatus `pending`, `approved`, atau `rejected`.
  - Filter multi-kriteria: Periode Triwulan & Tahun, Kategori KBLI, Komponen Pengeluaran, Sumber Media, Status Validasi.
  - Kolom pencarian teks penuh (full-text search) pada ringkasan dan judul berita.
- **Modal Review Dua Panel (Side-by-Side Review)**:
  - **Panel Kiri**: Teks asli artikel berita lengkap, tautan ke portal asli, tanggal publikasi, dan metadata sumber.
  - **Panel Kanan**: Formulir hasil ekstraksi AI yang dapat diedit langsung (*inline editable form*):
    - Pengubahan Kategori KBLI & Subsektor.
    - Pengubahan Komponen Pengeluaran.
    - Pengeditan kalimat ringkasan fenomena.
    - Penyesuaian dampak (Positif/Negatif) dan efek Harga/Volume.
    - Tombol aksi: **"Approve Phenomenon"**, **"Reject Phenomenon"**, atau **"Save Draft"**.
- **Audit & Akuntabilitas**:
  - Menyimpan ID staf pemeriksa (`verified_by`), timestamp persetujuan (`verified_at`), serta catatan koreksi (`reviewer_notes`).

### 4.4 Module 4: Excel Export Center
- **Tujuan**: Memproduksi file `.xlsx` standar kompilasi BPS yang siap digunakan langsung dalam forum Rekonsiliasi PDRB Triwulanan Kaltara.
- **Format Spreadsheet**:
  - Dibuat via library `exceljs`.
  - Header standar BPS:
    - Judul Dokumen: *"KOMPILASI FENOMENA EKONOMI TRIWULAN [Q] TAHUN [TAHUN] - KABUPATEN TANA TIDUNG"*
  - **Sheet 1: Fenomena Lapangan Usaha (PDRB Lapangan Usaha)**:
    - Dikelompokkan per Kategori KBLI (A s.d. U).
    - Kolom: No, Kategori KBLI, Subsektor, Ringkasan Fenomena Ekonomi, Arah Dampak (Positif/Negatif), Efek (Harga/Volume), Komoditas Terkait, Sumber Berita, Tanggal Terbit, Tautan URL.
  - **Sheet 2: Fenomena Pengeluaran (PDRB Pengeluaran)**:
    - Dikelompokkan per Komponen (PK-RT, PK-P, PMTB, Ekspor, Impor).
    - Kolom identik yang disesuaikan untuk komponen pengeluaran.
  - **Sheet 3: Ringkasan Eksekutif & Statistik Berita**:
    - Distribusi jumlah fenomena per sektor dan sentimen dampak.
  - Format visual: Gaya border tipis abu-abu, baris header berwarna biru BPS (`#003366`) dengan teks putih tebal, *text wrapping* aktif pada kolom narasi, dan lebar kolom proporsional otomatis.

---

## 5. Non-Functional Requirements & Performance Targets

| Parameter | Metric / Requirement | Rationale |
| :--- | :--- | :--- |
| **Scraping Job Duration** | < 10 menit untuk batch harian (50–100 artikel) | Menghindari konsumsi bandwidth berlebih dan time-out cron job pada VPS |
| **AI Extraction Throughput** | Maksimal 3 detik per artikel | Menjaga efisiensi kuota rate limit Google Gemini API dan runtime batch |
| **Dashboard Query Latency** | P95 < 800 ms pada dataset 50.000 artikel | Penggunaan PostgreSQL b-tree indeks pada `status`, `quarter`, `year`, `kbli_category` |
| **Uptime & Reliability** | 99.5% availability pada jam operasional kerja (08:00 - 18:00 WITA) | Diperlukan stabil saat periode rilis PDRB triwulanan BPS |
| **Data Integrity** | Tidak ada duplikasi URL (`url_hash` unique constraint) | Mencegah fenomena ganda dalam analisis neraca |
| **Role-Based Security** | Minimal 3 peran: `admin`, `editor` (staf neraca), `viewer` | Menjaga integritas data angka sebelum rilis resmi |

---

## 6. Success Criteria & KPIs
1. **Reduksi Waktu Kompilasi**: Pembuatan dossier fenomena triwulanan berkurang dari 60 jam menjadi < 4 jam kerja per triwulan.
2. **Cakupan Media**: 100% berita terkait ekonomi KTT dari 5 media utama Kaltara terindeks dalam 24 jam setelah terbit.
3. **Akurasi Ekstraksi AI**: Akurasi klasifikasi sektor KBLI dan komponen pengeluaran mencapai ≥ 85% kecocokan dengan keputusan verifikator manusia BPS.

