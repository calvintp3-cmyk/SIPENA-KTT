# Rancangan Antarmuka UI/UX & Layout Nuxt UI — SIPENA KTT

**Versi Dokumen:** 1.0.0 (Single Source of Truth)  
**Framework UI:** Nuxt UI v3 (`@nuxt/ui` berbasis Reka UI + Tailwind CSS v4 + TanStack Table v8)  
**Ikonografi:** `@nuxt/icon` (`lucide` collection via `i-lucide-*`)  
**Arah Estetika:** *Institutional Civic-Analytical Workstation* — antarmuka terang yang tenang, presisi tinggi, padat informasi tanpa kekacauan visual, memprioritaskan keterbacaan narasi berita dan akurasi kurasi klasifikasi PDRB dua sisi.

---

## 1. Design System Tokens

### 1.1 Konfigurasi Tema Global (`app/app.config.ts` & `app/assets/css/main.css`)
Menggunakan arsitektur token tiga lapis (*Primitive -> Semantic -> Component*) dari Tailwind CSS v4 dan Nuxt UI v3:

```ts
// app/app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'teal',
      neutral: 'slate',
      success: 'emerald',
      warning: 'amber',
      error: 'rose',
      info: 'sky',
    },
    card: {
      slots: {
        root: 'rounded-xl ring-1 ring-slate-200/80 dark:ring-slate-800 bg-white dark:bg-slate-900 shadow-xs',
      },
    },
    badge: {
      defaultVariants: {
        variant: 'subtle',
        size: 'sm',
      },
    },
    table: {
      slots: {
        th: 'text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/60 py-2.5 px-3',
        td: 'py-2.5 px-3 text-sm text-slate-700 dark:text-slate-200 align-top',
      },
    },
  },
});
```

```css
/* app/assets/css/main.css */
@import "tailwindcss";
@import "@nuxt/ui";

@theme {
  /* Layer 1: Primitive Font & Surface Tokens */
  --font-sans: "Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  /* Layer 2: Semantic Surface & Border Tokens */
  --color-canvas: #f8fafc;          /* slate-50: latar workstation agar mata tidak lelah */
  --color-surface: #ffffff;         /* kartu & drawer */
  --color-surface-subtle: #f1f5f9;  /* panel teks snippet berita 200 kata */
  --color-ink-primary: #0f172a;     /* slate-900: kontras >= 14:1 di atas putih */
  --color-ink-secondary: #475569;   /* slate-600: kontras >= 6.8:1 */
  --color-ink-muted: #64748b;       /* slate-500 */
  --color-brand-accent: #0d9488;    /* teal-600: identitas resmi SIPENA KTT */
}

/* Kepastian keterbacaan angka statistik, tanggal, kode KBLI, dan counter token */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

### 1.2 Semantik Warna Dampak PDRB & Status (Color Encoding Konsisten)

Agar ekonom Nerwilis dapat memindai arah dampak puluhan berita dalam hitungan detik, warna `<UBadge>` dibakukan di seluruh halaman (`usePdrbLabels.ts`):

| Nilai Enum Domain | Warna Nuxt UI (`color`) | Ikon Lucide | Makna Ekonomi Cepat |
|---|---|---|---|
| `INCREASE_NTB` / `INCREASE_REAL` | `success` (Emerald) | `i-lucide-trending-up` | Ekspansi volume output riil (ADHK) |
| `DECREASE_NTB` / `DECREASE_REAL` | `error` (Rose) | `i-lucide-trending-down` | Kontraksi / gangguan volume riil |
| `INCREASE_PRICE` / `INCREASE_DEFLATOR` | `warning` (Amber) | `i-lucide-arrow-up-right` | Kenaikan harga / tekanan inflasi / deflator naik |
| `DECREASE_PRICE` / `DECREASE_DEFLATOR` | `info` (Sky) | `i-lucide-arrow-down-right` | Penurunan harga / deflasi sektoral |
| `VerificationStatus.PENDING` | `warning` (Amber) | `i-lucide-clock` | Menunggu verifikasi staf |
| `VerificationStatus.VERIFIED` | `success` (Emerald) | `i-lucide-check-circle-2` | Valid & tayang ke publik / ekspor |
| `VerificationStatus.IGNORED` | `neutral` (Slate) | `i-lucide-archive-x` | Non-ekonomi / diabaikan |
| `LlmStatus.FAILED` | `error` (Rose) | `i-lucide-alert-triangle` | Klasifikasi AI tertunda (kuota/error), perlu retry atau isi manual |

### 1.3 Tipografi, Kepadatan Data (*Data Density*), & Aksesibilitas
- **Skala Tipografi:**
  - Judul Halaman (*Page Title*): `20px` (`text-xl font-bold tracking-tight text-slate-900`)
  - Judul Berita di Tabel / Feed: `14px`–`15px` (`font-semibold leading-snug`), dibatasi 2 baris di tabel (`line-clamp-2`) dengan tooltip teks penuh.
  - Cuplikan Berita 200 Kata di Drawer: `14px` dengan `leading-relaxed (1.65)` dan lebar baca nyaman `max-w-prose`.
  - Metadata Tanggal (`dd/mm/yyyy`), Triwulan (`TW IV 2026`), Kode KBLI (`KBLI A`), & Token Usage: `12px`–`13px` dengan kelas `font-mono tabular-nums`.
- **Standar Aksesibilitas:** Semua tombol aksi ikon-only wajib dibungkus `<UTooltip>` dan memiliki `aria-label`. Seluruh kontras badge menggunakan kombinasi latar lembut (`-50`) dan teks gelap (`-700`/`-800`) bawaan varian `subtle` Nuxt UI v3 guna memenuhi rasio kontras WCAG 2.2 AA (>= 4.5:1).

---

## 2. Inventaris Komponen Nuxt UI v3 per Halaman

| Halaman / Rute | Komponen Nuxt UI v3 Utama | Kegunaan Spesifik |
|---|---|---|
| **Public Dashboard & Feed** (`/`) | `<UCard>`, `<UBadge>`, `<USelectMenu>`, `<UInput>`, `<UButton>`, `<UPagination>`, `<UAlert>` | KPI Triwulanan, Sticky Filter Bar, Kartu Feed Linimasa *read-only*, Navigasi halaman |
| **Admin Daily Review** (`/admin/review`) | `<UTabs>`, `<UTable>`, `<USlideover>`, `<UBadge>`, `<USelectMenu>`, `<UTextarea>`, `<UCheckbox>`, `<UButton>`, `<UTooltip>` | Antrean Tab Pending/Verified/Ignored, Pemilihan Batch, Drawer Edit Kanan 200-kata |
| **Admin Bank Data** (`/admin/articles`) | `<UTable>`, `<UModal>`, `<UInput>`, `<USelectMenu>`, `<UTextarea>`, `<UFormField>`, `<UDropdownMenu>`, `<UButton>`, `<UPagination>` | Tabel Arsip Penuh, Filter Multi-Parameter, Modal Tambah Manual, Trigger Ekspor `.xlsx`/`.csv` |
| **Admin Master Keywords** (`/admin/keywords`) | `<UTable>`, `<USwitch>`, `<UModal>`, `<USelectMenu>`, `<UInput>`, `<UButton>`, `<UBadge>` | Daftar Keyword Nasional, Toggle `is_active` instan, Modal Tambah/Ubah Keyword |
| **Admin Scraper Monitor** (`/admin/scrapers`) | `<UCard>`, `<UTable>`, `<UModal>`, `<UButton>`, `<USelectMenu>`, `<UBadge>`, `<UProgress>`, `<UAlert>` | Monitor Token Gemini, Trigger Manual & Retry Failed LLM, Log & Detail Error JSON |
| **Admin Login** (`/login`) | `<UCard>`, `<UForm>`, `<UFormField>`, `<UInput>`, `<UButton>`, `<UAlert>` | Form kredensial email & kata sandi |

---

## 3. Wireframe Tekstual & Alur UX Mendetail

### 3.1 Public View (`/`) — Portal Informasi Fenomena Ekonomi Kab. Tana Tidung

**Tujuan UX:** Memberikan gambaran instan kondisi ekonomi makro Kabupaten Tana Tidung per triwulan kepada pemangku kepentingan daerah tanpa perlu login, bebas istilah teknis database, dan mudah ditelusuri hingga sumber berita asli.

**Wireframe Tekstual:**
```text
+---------------------------------------------------------------------------------------------------+
| [Logo] SIPENA KTT  |  Sistem Pemantauan Fenomena Ekonomi Kab. Tana Tidung        [ Masuk Admin -> ] |
+---------------------------------------------------------------------------------------------------+
| HEADER KONTEKSTUAL & KPI SNAPSHOT (Triwulan IV 2026 - Terverifikasi)                              |
| +-----------------------+ +-----------------------+ +-----------------------+ +-----------------+ |
| | Total Fenomena Valid  | | Sektor KBLI Dominan   | | Pengeluaran Teraktif  | | Rasio Ekspansi  | |
| | 48 Berita             | | [A] Pertanian/Sawit   | | [Ekspor Bersih]       | | 72% Positif Riil| |
| | +14% vs TW III 2026   | | 18 fenomena (37.5%)   | | 16 fenomena (33.3%)   | | 28% Tekanan/Turun| |
| +-----------------------+ +-----------------------+ +-----------------------+ +-----------------+ |
+---------------------------------------------------------------------------------------------------+
| GRAFIK SEBARAN PROPORSI (2 Kolom Responsif Grid 12 -> 6 + 6)                                      |
| +-----------------------------------------------+ +---------------------------------------------+ |
| | Sebaran Lapangan Usaha (KBLI A-U)             | | Sebaran Komponen PDRB Pengeluaran           | |
| | [A] Pertanian & Sawit  ================== 18  | | Ekspor Bersih      ================ 16      | |
| | [F] Konstruksi         ========== 10          | | PMTB (Investasi)   ============ 12          | |
| | [H] Transportasi       ======== 8             | | PK-RT (Rumah Tgg)  ========== 10            | |
| | [B] Pertambangan       ====== 6               | | PK-P (Pemerintah)  ======== 8               | |
| | [G] Perdagangan        ====== 6               | | Perubahan Inventori == 2                    | |
| +-----------------------------------------------+ +---------------------------------------------+ |
+---------------------------------------------------------------------------------------------------+
| [STICKY FILTER BAR] (top-0 z-20 bg-white/90 backdrop-blur border-b)                               |
| Periode: [Triwulan IV v] [2026 v] | KBLI: [Semua Kategori v] | Pengeluaran: [Semua Komponen v]    |
| Cari: [ Ketik judul/komoditas, mis. sawit, batubara, SOA...               ] [ Reset Filter ]      |
+---------------------------------------------------------------------------------------------------+
| LINIMASA FENOMENA EKONOMI TERVERIFIKASI (Menampilkan 1-20 dari 48 fenomena)                        |
|                                                                                                   |
| +-----------------------------------------------------------------------------------------------+ |
| | 14/10/2026  |  korankaltara.com  |  [Triwulan IV 2026]                                        | |
| | Harga TBS Sawit KTT Menguat di Awal Triwulan IV, Petani Desa Bebatu Mulai Ekspansi Panen       | |
| |                                                                                               | |
| | Harga pembelian TBS kelapa sawit di Kabupaten Tana Tidung naik menjadi Rp 2.980/kg pada       | |
| | awal Oktober 2026 seiring perbaikan jalan angkut dan tingginya permintaan CPO antarpulau.     | |
| | Kondisi ini memicu percepatan siklus panen serta meningkatkan volume pengiriman ke luar daerah.| |
| |                                                                                               | |
| | Sisi Lapangan Usaha: [KBLI A - Pertanian, Kehutanan & Perikanan] [^ Meningkatkan Harga]       | |
| | Sisi Pengeluaran   : [Ekspor Bersih Antar Daerah/LN]             [^ Meningkatkan Pengeluaran Riil] |
| |                                                                  [ Baca Berita Asli (Tab Baru) -> ]|
| +-----------------------------------------------------------------------------------------------+ |
|                                    [ <  1  2  3  > ] (UPagination)                                |
+---------------------------------------------------------------------------------------------------+
```

**Alur UX Halaman Publik:**
1. Memuat awal secara SSR pada periode default **Triwulan & Tahun berjalan** (diambil dari waktu WITA saat ini; jika awal triwulan baru masih `0` berita, tampilkan banner `<UAlert>` ringan dengan tautan 1-klik *"Lihat Triwulan Sebelumnya"*).
2. Mengubah filter pada **Sticky Filter Bar** langsung menyinkronkan URL query parameters (`/?year=2026&quarter=4&kbli=A`) dan memicu ulang fetch `/api/public/overview` serta `/api/public/articles` sehingga tautan hasil filter mudah dibagikan antar instansi Pemkab Tana Tidung.
3. Mengklik batang sektor pada grafik KBLI atau Pengeluaran akan otomatis mengaktifkan filter sektor tersebut pada feed di bawahnya.

---

### 3.2 Layout Global Admin Workspace (`/admin/**`)

Seluruh halaman admin menggunakan `layouts/admin.vue` yang memiliki **Sidebar Navigasi Kiri** (*collapsible* menjadi laci pada layar tablet/mobile):
- **Brand:** `SIPENA KTT • Nerwilis`
- **Menu Utama:**
  1. `Review Harian` (`/admin/review`) — dilengkapi `<UBadge color="amber">` menunjukkan jumlah real-time artikel `PENDING`.
  2. `Bank Data & Ekspor` (`/admin/articles`)
  3. `Master Keyword Nasional` (`/admin/keywords`)
  4. `Monitor Scraper & AI` (`/admin/scrapers`)
- **Footer Sidebar:** Link cepat ke `Lihat Portal Publik (/)`, nama user login, dan tombol `Keluar`.

---

### 3.3 Admin Review Harian (`/admin/review`) — Workspace Kurasi H-1

**Tujuan UX:** Memungkinkan staf Nerwilis menyelesaikan kurasi puluhan berita hasil crawling subuh (H-1) secepat mungkin menggunakan kombinasi tombol persetujuan 1-klik, batch checkbox, dan **Slide-over Drawer kanan** tanpa pindah halaman.

**Wireframe Tekstual:**
```text
+---------------------------------------------------------------------------------------------------+
| Review Harian Fenomena Ekonomi                                        [Filter: Hanya LLM Gagal []] |
| Antrean kurasi hasil crawling H-1 & hari berjalan sebelum terbit ke portal publik & bank data.    |
+---------------------------------------------------------------------------------------------------+
| UTabs: [ Menunggu Review (14) ]   [ Terverifikasi (48) ]   [ Diabaikan (29) ]                      |
+---------------------------------------------------------------------------------------------------+
| [Batch Bar — muncul saat >= 1 baris dicentang]:                                                  |
| 4 artikel dipilih   |   [ ✓ Verifikasi Terpilih ]   [ ✕ Abaikan Terpilih ]   [ Batal Pilih ]       |
+---------------------------------------------------------------------------------------------------+
| UTable (:data="articles" :columns="columns")                                                      |
| [ ] | Tgl / Sumber      | Judul & Pratinjau Ringkasan | KBLI & Dampak        | Pengeluaran & Dampak| Aksi |
|-----+-------------------+-----------------------------+----------------------+---------------------+------|
| [x] | 14/10/2026        | Harga TBS Sawit KTT Menguat | [A] Pertanian        | [Ekspor Bersih]     | [✓]  |
|     | korankaltara.com  | "Harga pembelian TBS..."    | [^ Meningkatkan Hrg] | [^ Naik Riil]       | [✎]  |
|     | TW IV 2026        | AI Conf: 96%                |                      |                     | [✕]  |
|-----+-------------------+-----------------------------+----------------------+---------------------+------|
| [ ] | 14/10/2026        | Ruas Jalan Tideng Pale-Ses..| [!] AI Gagal (429)   | [!] Belum Terpetakan| [✎]  |
|     | tribun kaltara    | "Pengerjaan proyek..."      | Klik ✎ untuk isi     |                     | [✕]  |
+---------------------------------------------------------------------------------------------------+

======== SLIDE-OVER DRAWER KANAN (<USlideover v-model:open="drawerOpen" side="right" class="max-w-2xl">) ========
+------------------------------------------------------------------+
| Edit & Verifikasi Fenomena                                   [X] |
| korankaltara.com  •  Rilis: 14/10/2026 09:15 WITA   [Buka URL ↗] |
+------------------------------------------------------------------+
| [ JUDUL BERITA (Editable Input) ]                                |
| Harga TBS Sawit KTT Menguat di Awal Triwulan IV...               |
|                                                                  |
| [ PANEL CUPLIKAN TEKS ASLI (192 Kata — Read-only Verification) ] |
| +--------------------------------------------------------------+ |
| | TANJUNG SELOR - Harga Tandan Buah Segar (TBS) kelapa sawit   | |
| | di wilayah Kabupaten Tana Tidung kembali mencatatkan tren... | |
| | (maksimal tinggi 180px scroll internal bg-slate-50 p-3 text-sm)| |
| +--------------------------------------------------------------+ |
|                                                                  |
| [ RINGKASAN BERITA (2-3 Kalimat untuk Publik & Excel) ]          |
| [ UTextarea rows="3"                                           ] |
|                                                                  |
| +-- SISI LAPANGAN USAHA ----------+ +-- SISI PENGELUARAN ------+ |
| | Kategori KBLI (A-U)             | | Komponen Pengeluaran     | |
| | [USelectMenu searchable A..U v] | | [USelectMenu 6 komp.  v] | |
| | Dampak Lapangan Usaha           | | Dampak Pengeluaran       | |
| | [USelectMenu 4 dampak     v]    | | [USelectMenu 4 dampak v] | |
| +---------------------------------+ +--------------------------+ |
|                                                                  |
| +-- PERIODE PDRB -----------------+ +-- KATEGORI FENOMENA -----+ |
| | Triwulan: [TW IV v] Tahun:[2026]| | [x] Fenomena Ekonomi Sah | |
| +---------------------------------+ +--------------------------+ |
+------------------------------------------------------------------+
| FOOTER STICKY: [ Abaikan ]   [ Simpan Draft ]  [ ✓ Simpan & Verifikasi ] |
+------------------------------------------------------------------+
```

**Detail Alur UX Drawer & Batch Action:**
1. **Approval 1-Klik:** Menekan ikon `✓` langsung pada baris tabel memanggil `PATCH /api/admin/articles/[id]` dengan `{ verificationStatus: 'VERIFIED' }`. Jika ada kolom klasifikasi yang kosong (`llmStatus = 'FAILED'`), sistem tidak mengizinkan verifikasi langsung melainkan otomatis membuka Slide-over Drawer dengan sorotan fokus pada field yang wajib dilengkapi!
2. **Rescue dari Tab `Ignored`:** Pada tab `Diabaikan (Ignored)`, admin dapat membuka Drawer artikel yang ditolak AI (`is_economic_phenomenon = false`), mencentang *"Fenomena Ekonomi Sah"*, mengisi klasifikasi, dan menekan **Simpan & Verifikasi** untuk memindahkannya ke daftar publik.
3. **Kontinuitas Keyboard / Alur Cepat:** Setelah menekan **Simpan & Verifikasi** di dalam Drawer, opsi *"Otomatis buka antrean Pending berikutnya"* (toggle kecil di header drawer) mempermudah kurasi beruntun 10–20 artikel tanpa menutup/membuka ulang drawer berkali-kali.

---

### 3.4 Admin Bank Data Arsip (`/admin/articles`) & Ekspor Excel Resmi

**Tujuan UX:** Pusat penelusuran historis seluruh fenomena ekonomi lintas triwulan, input manual fenomena non-crawler, dan ekspor berkas kertas kerja `.xlsx` / `.csv`.

**Wireframe Tekstual:**
```text
+---------------------------------------------------------------------------------------------------+
| Bank Data Fenomena Ekonomi                    [ + Tambah Berita Manual ]   [ Ekspor Data (v) ]   |
| Arsip terpusat & generator lampiran analisis PDRB Kabupaten Tana Tidung.   | -> Unduh Excel (.xlsx) |
|                                                                            | -> Unduh CSV (.csv)    |
+---------------------------------------------------------------------------------------------------+
| TOOLBAR PENCARIAN MULTI-PARAMETER (UCard compact)                                                 |
| Kata Kunci: [ Cari judul/ringkasan/URL... ] | Triwulan: [Semua v] | Tahun: [2026 v]               |
| KBLI: [Semua A-U v] | Pengeluaran: [Semua v] | Portal: [Semua v]  | Status: [Terverifikasi v]     |
| Rentang Rilis: [ 01/10/2026 ] s.d. [ 31/12/2026 ]                                  [ Reset ]      |
+---------------------------------------------------------------------------------------------------+
| UTable Arsip (Server-side Pagination 25 baris/halaman)                                            |
| Waktu Rilis | Judul Berita & URL | KBLI | Dampak KBLI | Pengeluaran | Dampak Peng. | Periode | Status | Aksi |
+---------------------------------------------------------------------------------------------------+
```

**Modal Tambah Berita Manual (`<UModal v-model:open="manualModalOpen">`):**
- Field wajib: Judul Berita (`<UInput>`), URL Sumber (`<UInput type="url">`, atau teks referensi surat/dokumen yang dihash aman), Nama Sumber Portal (`<UInput>`, default `"Input Manual"`), Waktu Rilis (`<UInput type="date">`), Cuplikan/Uraian Sumber (`<UTextarea>`), Ringkasan 2–3 Kalimat (`<UTextarea>`), Kategori KBLI (`<USelectMenu>`), Dampak KBLI (`<USelectMenu>`), Komponen Pengeluaran (`<USelectMenu>`), Dampak Pengeluaran (`<USelectMenu>`), Triwulan & Tahun (otomatis terisi saat Waktu Rilis dipilih, tetap bisa diubah manual), dan Checkbox *"Langsung tandai Terverifikasi"*.

**Spesifikasi Output Ekspor Excel (`.xlsx` via `exceljs`) — 10 Kolom Mutlak:**
Saat tombol **Unduh Excel (.xlsx)** diklik, parameter filter aktif (`year`, `quarter`, `kbli`, `expenditure`, `status`, `from`, `to`, `q`) diteruskan ke `GET /api/admin/articles/export?format=xlsx&...` agar hanya data yang relevan ikut diekspor. Urutan kolom lembar kerja *Sheet 1 ("Fenomena PDRB KTT")* **wajib persis**:

| Urutan Kolom | Nama Header Kolom di File `.xlsx` | Format Isi / Nilai Contoh | Lebar & Gaya ExcelJS |
|---|---|---|---|
| **1** | `Waktu Rilis Berita` | `14/10/2026` (`dd/mm/yyyy` zona WITA) | Lebar `18`, rata tengah |
| **2** | `Judul Berita` | `Harga TBS Sawit KTT Menguat di Awal Triwulan IV...` | Lebar `42`, `wrapText: true` |
| **3** | `Kategori Lapangan Usaha (KBLI)` | `A - Pertanian, Kehutanan, dan Perikanan` | Lebar `34`, `wrapText: true` |
| **4** | `Dampak Sisi Lapangan Usaha` | `Meningkatkan Harga` | Lebar `22` |
| **5** | `Komponen PDRB Pengeluaran` | `Ekspor Bersih Antar Daerah/Luar Negeri` | Lebar `32`, `wrapText: true` |
| **6** | `Dampak Sisi Pengeluaran` | `Meningkatkan Pengeluaran Riil` | Lebar `28` |
| **7** | `Ringkasan Berita` | `Harga pembelian Tandan Buah Segar (TBS) kelapa sawit...` (2-3 kalimat) | Lebar `55`, `wrapText: true` |
| **8** | `Sumber Berita (URL)` | `https://korankaltara.com/...` (disimpan sebagai clickable Excel hyperlink) | Lebar `40`, warna biru hyperlink |
| **9** | `Periode Berita` | `Triwulan IV 2026` | Lebar `18`, rata tengah |
| **10** | `Status Verifikasi` | `Terverifikasi` / `Menunggu Review` / `Diabaikan` | Lebar `18`, rata tengah |

---

### 3.5 Admin Master Keyword (`/admin/keywords`)

**Tujuan UX:** Mengelola kata kunci penjaringan berita nasional dengan cepat termasuk melihat efektivitas masing-masing kata kunci (berapa artikel yang berhasil terjaring) dan menyalakan/mematikannya secara instan.

**Wireframe Tekstual:**
```text
+---------------------------------------------------------------------------------------------------+
| Master Keyword Berita Nasional                                             [ + Tambah Keyword ]   |
| Kata kunci transmisi ekonomi nasional ke Kabupaten Tana Tidung (aktif dijaring setiap 04:00 WITA).|
+---------------------------------------------------------------------------------------------------+
| UTable Keywords                                                                                   |
| Kata Kunci (Keyword)      | Asosiasi Default KBLI   | Default Pengeluaran  | Terjaring | Aktif  | Aksi |
|---------------------------+-------------------------+----------------------+-----------+--------+------|
| harga batubara acuan      | [B] Pertambangan        | Ekspor Bersih        | 14 artikel| [===o] | [✎][🗑]|
| harga TBS kelapa sawit    | [A] Pertanian & Sawit   | Ekspor Bersih        | 23 artikel| [===o] | [✎][🗑]|
| DBH migas kaltara         | [O] Adm. Pemerintahan   | PK-P                 | 9 artikel | [===o] | [✎][🗑]|
| subsidi ongkos angkut     | [H] Pengangkutan        | PK-P                 | 6 artikel | [===o] | [✎][🗑]|
| moratorium kayu           | [A] Pertanian/Kehutanan | Ekspor Bersih        | 2 artikel | [o===] | [✎][🗑]|
+---------------------------------------------------------------------------------------------------+
```
- Menggeser `<USwitch v-model="row.original.isActive" />` memicu `PATCH /api/admin/keywords/[id]` secara langsung dengan indikator *loading* pada switch dan notifikasi Toast konfirmasi.
- Menghapus keyword menampilkan `<UModal>` konfirmasi ringan dengan keterangan eksplisit bahwa berita yang sudah terjaring di Bank Data tidak akan ikut terhapus.

---

### 3.6 Admin Scraper & LLM Monitor (`/admin/scrapers`)

**Tujuan UX:** Memberikan transparansi penuh atas kesehatan *crawler* subuh (04:00 WITA), penghematan kuota token *Gemini Flash Free Tier*, kontrol eksekusi manual, dan pemulihan artikel apabila terjadi limit API `429`.

**Wireframe Tekstual:**
```text
+---------------------------------------------------------------------------------------------------+
| Monitor Crawler & Pemakaian Token Gemini Flash                                                    |
| Pemantauan eksekusi harian otomatis (04:00 WITA), retry artikel gagal, dan efisiensi Free Tier.   |
+---------------------------------------------------------------------------------------------------+
| 4 KARTU METRIK OBSERVABILITAS                                                                     |
| +---------------------+ +---------------------+ +---------------------+ +-----------------------+ |
| | Eksekusi Terakhir   | | Token LLM (30 Hari) | | Antrean LLM Gagal   | | Efisiensi Deduplikasi | |
| | Sukses • 04:02 WITA | | 142.850 Tokens      | | 2 Artikel           | | 68% URL Ditolak Awal  | |
| | Durasi: 1 menit 42d | | In: 112k | Out: 30k | | [ Retry LLM Gagal ] | | Hemat ~1.800 panggilan| |
| +---------------------+ +---------------------+ +---------------------+ +-----------------------+ |
+---------------------------------------------------------------------------------------------------+
| PANEL KONTROL MANUAL TRIGGER (UCard)                                                              |
| Cakupan Scraping: [ Semua Sumber (4 Portal Lokal + Keyword Nasional) v ]                          |
|                   [ > Jalankan Scraping Manual Sekarang ]   [ ↻ Proses Ulang Artikel LLM Gagal ]  |
| *(Saat status = RUNNING: tampilkan UProgress indeterminate + auto-polling setiap 4 detik)*       |
+---------------------------------------------------------------------------------------------------+
| RIWAYAT LOG EKSEKUSI CRAWLER (`scraper_logs`)                                                     |
| Waktu Mulai (WITA) | Jenis     | Status   | Diambil / Dedup / Masuk | Ekon / Non | Token LLM | Durasi | Log |
|--------------------+-----------+----------+-------------------------+------------+-----------+--------+-----|
| 11/11/2026 04:00   | SCHEDULED | [SUKSES] | 48 / 33 dedup / +15 baru| 9 Ekon / 6 | 11.420 tk | 1m 42d | [Detail]|
| 10/11/2026 14:22   | MANUAL    | [PARSIAL]| 51 / 46 dedup / +5 baru | 3 / 0 (+2!)| 3.910 tk  | 52 dtk | [Detail]|
+---------------------------------------------------------------------------------------------------+
```
- Mengklik tombol **Detail** pada baris log membuka `<UModal>` menampilkan daftar *error_summary* (misal portal mana yang mengalami timeout atau error HTTP 429 beserta URL terdampaknya) guna mempermudah diagnosa selector HTML jika ada portal berita daerah mengubah tata letak webnya.

---

## 4. Ringkasan Responsivitas & Perilaku Mobile

1. **Public View (`/`):** Pada viewport `< 768px`, KPI Grid berubah dari 4 kolom menjadi 2x2; grafik dua kolom bertumpuk vertikal; Sticky Filter Bar melipat opsi filter lanjutan ke dalam tombol toggle *"Filter Lanjutan (3)"* agar feed berita tetap terlihat segera di bawah lipatan (*above the fold*).
2. **Admin Workspace (`/admin/**`):** Sidebar navigasi otomatis berubah menjadi menu *drawer* atas; pada `/admin/review`, `<USlideover>` terbuka penuh (`w-full max-w-2xl`) sehingga verifikasi berita tetap nyaman dilakukan bahkan dari tablet atau ponsel saat dinas luar kota.

