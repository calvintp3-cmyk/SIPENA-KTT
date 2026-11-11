# Rancangan Antarmuka UI/UX & Layout Nuxt UI — SIPENA KTT

**Versi Dokumen:** 2.0.0 (Single Source of Truth — *Cobalt–Emerald Luminous SaaS*)  
**Framework UI & Motion:** Nuxt UI v3 (`@nuxt/ui ^3.3.7`), Tailwind CSS v4, `motion-v` (`^2.12.0`), `echarts` (`^6.1.0`) + `vue-echarts` (`^8.3.2`) + `nuxt-echarts` (`^1.1.0`)  
**Ikonografi:** `@nuxt/icon` (`provider: 'server'`) dengan koleksi `@iconify-json/solar` (`i-solar-*-bold-duotone` untuk navigasi, KPI, hero bento) + `i-lucide-*` untuk mikro-kontrol (`chevron`, `x`, `check`)  
**Arah Estetika:** *Cobalt–Emerald Luminous SaaS* — antarmuka SaaS modern terang bercahaya untuk portal publik & workstation analitis BPS Kabupaten Tana Tidung (Nerwilis), dipadukan panel showcase gelap *Midnight Cobalt–Emerald* (`hero-mesh-dark`) pada Landing Hero (`/`) dan Split Login (`/login`), tanpa kekakuan birokratis dan bebas font monospace di antarmuka.

---

## 1. Design System Tokens

### 1.1 Konfigurasi Tema Global (`app/app.config.ts` & `app/assets/css/main.css`)
Menggunakan arsitektur token tiga lapis (*Primitive → Semantic → Component*) dari Tailwind CSS v4 dan Nuxt UI v3:

```ts
// app/app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'indigo',
      secondary: 'emerald',
      neutral: 'slate',
      success: 'emerald',
      warning: 'amber',
      error: 'rose',
      info: 'sky',
    },
    card: {
      slots: {
        root: 'rounded-2xl ring-1 ring-slate-900/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-12px_rgba(37,99,235,0.08)]',
      },
    },
    button: {
      slots: {
        base: 'rounded-xl font-semibold transition-all duration-150 cursor-pointer',
      },
    },
    badge: {
      slots: {
        base: 'rounded-full font-medium tabular-nums',
      },
      defaultVariants: {
        variant: 'subtle',
        size: 'sm',
      },
    },
    input: {
      slots: {
        base: 'rounded-xl',
      },
    },
    select: {
      slots: {
        base: 'rounded-xl cursor-pointer',
        content: 'rounded-xl shadow-xl ring-slate-200/90',
      },
    },
    selectMenu: {
      slots: {
        base: 'rounded-xl cursor-pointer',
        content: 'rounded-xl shadow-xl ring-slate-200/90',
      },
    },
    table: {
      slots: {
        th: 'text-[11px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50/95 py-3 px-3.5 border-b border-slate-200 whitespace-nowrap',
        td: 'py-3.5 px-3.5 text-[13px] text-slate-700 align-top',
      },
    },
  },
});
```

Token CSS inti di `app/assets/css/main.css`:
- `--font-sans`: `"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` (dipaksakan juga pada `code, kbd`).
- Permukaan & Ink:
  - `--color-canvas`: `#F4F7FC` (disertai `.canvas-aurora-light` bergradasi radial Cobalt–Emerald sangat halus)
  - `--color-surface`: `#FFFFFF`, `--color-surface-elevated`: `#FAFBFD`, `--color-surface-subtle`: `#EDF2FA`
  - `--color-border-hairline`: `#E2E8F0`
  - `--color-ink-obsidian` / `--color-ink-primary`: `#0F172A`, `--color-ink-secondary`: `#334155`, `--color-ink-muted`: `#64748B`
  - Brand accents: `--color-brand-primary`: `#2563EB`, `--color-brand-indigo`: `#4F46E5`, `--color-brand-emerald`: `#059669`, `--color-brand-teal`: `#0D9488`
- Utilitas Visual Utama:
  - `.hero-mesh-dark`: Latar gradient-aurora *Midnight Cobalt–Emerald* (`#090F24` → `#0F1D45` → `#0B3B3E`) untuk hero landing (`/`) dan panel showcase login (`/login`).
  - `.saas-card` & `.saas-card-interactive`: Kartu putih `rounded-2xl` berbayang lembut Cobalt dengan elevasi interaktif saat hover.
  - `.btn-primary-gradient` (serta alias kompatibel `.obsidian-button`): Tombol aksi utama gradien `#2563EB` → `#4F46E5` → `#0D9488` berteks putih murni (kontras ≥ 4.5:1) dengan highlight atas bagian dalam (`inset 0 1px 0`).
  - `.active-nav-card`: Pill aktif sidebar admin bergradasi indigo–emerald lembut dengan aksen garis vertikal kiri `#2563EB`.
  - `.timeline-spine`: Garis vertikal kronologis gradien Cobalt–Emerald di halaman `/linimasa`.
  - `.saas-table-scroller` & `.saas-scroll`: Area scroll horizontal/vertikal ramah keyboard dengan `scrollbar-width: thin`.
  - `@media print`: Menjaga `.no-print` dan `.synthesis-print-sheet` tetap rapi untuk cetak A4 Berita Resmi Statistik (`/admin/synthesis`).

---

### 1.2 Spektrum Warna Multi-Klaster KBLI, Pengeluaran, & Semantik Dampak

Selain semantik arah dampak (`usePdrbLabels.ts`), antarmuka v2.0.0 menambahkan spektrum warna terstruktur di `shared/utils/pdrb-colors.ts` (diekspos juga lewat `usePdrbLabels()`):

#### A. 4 Klaster Warna 17 Sektor KBLI (`getKbliClusterKey` & `getKbliClusterTheme`)
| Klaster (`PdrbClusterKey`) | Cakupan Huruf / Grup KBLI | Warna Dominan | Hex Utama | Kelas Pill (WCAG ≥ 4.5:1) |
|---|---|---|---|---|
| `PRIMARY_SDA` | `A`, `B` | **Emerald** | `#059669` | `bg-emerald-50 text-emerald-800 border-emerald-200/90` |
| `INDUSTRY_BUILD` | `C`, `D`, `E`, `F` | **Amber** | `#D97706` | `bg-amber-50 text-amber-800 border-amber-200/90` |
| `TRADE_LOGISTICS` | `G`, `H`, `I`, `J` | **Cobalt Blue** | `#2563EB` | `bg-blue-50 text-blue-800 border-blue-200/90` |
| `FINANCE_PUBLIC` | `K`, `L`, `M,N`, `O`, `P`, `Q`, `R,S,T,U` | **Violet Indigo** | `#7C3AED` | `bg-violet-50 text-violet-800 border-violet-200/90` |

Setiap objek `PdrbClusterTheme` menyediakan `hex`, `hexLight`, `pillClass`, `accentBarClass`, `softStripClass`, dan `iconBgClass`.

#### B. 6 Warna Komponen PDRB Pengeluaran (`getExpenditureColorTheme`)
| Komponen | Hex Chart & Titik | Kelas Pill |
|---|---|---|
| `PK_RT` (Konsumsi Rumah Tangga) | `#2563EB` (Cobalt Blue) | `bg-blue-50 text-blue-800 border-blue-200/90` |
| `PK_LNPRT` (Konsumsi LNPRT) | `#7C3AED` (Violet) | `bg-violet-50 text-violet-800 border-violet-200/90` |
| `PK_P` (Konsumsi Pemerintah) | `#0D9488` (Teal) | `bg-teal-50 text-teal-800 border-teal-200/90` |
| `PMTB` (Pembentukan Modal Tetap Bruto) | `#D97706` (Amber) | `bg-amber-50 text-amber-800 border-amber-200/90` |
| `INVENTORY_CHANGE` (Perubahan Inventori) | `#DB2777` (Pink) | `bg-pink-50 text-pink-800 border-pink-200/90` |
| `NET_EXPORT` (Ekspor Bersih) | `#059669` (Emerald) | `bg-emerald-50 text-emerald-800 border-emerald-200/90` |

#### C. Semantik Dampak PDRB & Status (`usePdrbLabels.ts`)
| Nilai Enum Domain | Warna Nuxt UI (`color`) | Ikon | Makna Ekonomi Cepat |
|---|---|---|---|
| `INCREASE_NTB` / `INCREASE_REAL` | `success` (Emerald) | `i-lucide-trending-up` | Ekspansi volume output riil (ADHK) |
| `DECREASE_NTB` / `DECREASE_REAL` | `error` (Rose) | `i-lucide-trending-down` | Kontraksi / gangguan volume riil |
| `INCREASE_PRICE` / `INCREASE_DEFLATOR` | `warning` (Amber) | `i-lucide-arrow-up-right` | Kenaikan harga / tekanan inflasi / deflator naik |
| `DECREASE_PRICE` / `DECREASE_DEFLATOR` | `info` (Sky) | `i-lucide-arrow-down-right` | Penurunan harga / deflasi sektoral |
| `VerificationStatus.PENDING` | `warning` (Amber) | `i-lucide-clock` | Menunggu verifikasi staf |
| `VerificationStatus.VERIFIED` | `success` (Emerald) | `i-lucide-check-circle-2` | Valid & tayang ke publik / ekspor |
| `VerificationStatus.IGNORED` | `neutral` (Slate) | `i-lucide-archive-x` | Non-ekonomi / diabaikan |
| `LlmStatus.FAILED` | `error` (Rose) | `i-lucide-alert-triangle` | Klasifikasi AI tertunda, perlu retry atau isi manual |

---

### 1.3 Tipografi Tunggal, Transisi, Motion, & Aksesibilitas
- **Sistem Font Tunggal (`Inter`):** Seluruh antarmuka hanya memuat Google Font `Inter` (`wght 400;500;600;700;800`) dari `nuxt.config.ts`. Kelas `font-mono` dan font `JetBrains Mono` **dihilangkan total** dari seluruh halaman, badge, tahun, header sidebar, tabel, dan footer. Seluruh angka statistik, persentase, tanggal, dan kode periode memakai utilitas `.tabular-nums`.
- **Arsitektur Transisi Hybrid & Motion:**
  - `nuxt.config.ts` mengaktifkan `experimental.viewTransition: true` serta fallback CSS `pageTransition` (`page`, `out-in`) dan `layoutTransition` (`layout`, `out-in`).
  - Global route middleware `app/middleware/page-transition.global.ts` otomatis menonaktifkan `to.meta.pageTransition` dan `to.meta.layoutTransition` pada browser Chromium/Safari/Firefox modern yang mendukung `document.startViewTransition`, dan membiarkan transisi Vue CSS bekerja di browser lama tanpa kedipan ganda.
  - Persistent shared element headers memakai `view-transition-name: sipena-public-header` (`default.vue`) dan `view-transition-name: sipena-admin-header` (`admin.vue`).
  - Root `app/app.vue` membungkus seluruh aplikasi dalam `<MotionConfig reduced-motion="user">` (`motion-v/nuxt`) serta menyertakan `<NuxtRouteAnnouncer />` untuk pembaca layar.
  - CSS `main.css` menghormati `@media (prefers-reduced-motion: reduce)` dengan mematikan animasi pseudo-element `::view-transition-*`, menghilangkan geseran `transform`, dan menjaga transisi opacity ringan.
- **Standar Aksesibilitas & Kontrol Select:**
  - Seluruh layout (`default.vue`, `admin.vue`) menyediakan **Skip Link** (`Lewati ke konten utama`) menuju `<main id="main-content" tabindex="-1">`, serta menjaga aturan **satu `<h1>` per halaman**.
  - Indikator `:focus-visible` berwarna Cobalt `#2563EB` (`outline: 2px solid #2563EB; outline-offset: 2px`).
  - **Zero Raw HTML `<select>`:** Seluruh kontrol dropdown di portal publik maupun admin memakai `<USelect>` atau `<USelectMenu>` Nuxt UI.
  - **Aturan Volar 3.3.14:** Seluruh mutasi state pada `@click` / `@update:model-value` dibungkus fungsi lambda eksplisit `@click="() => { ...; }"` demi 0 diagnostik TypeScript (`TS2322`).

---

## 2. Inventaris Rute, Layout, & Komponen Utama

| Rute / Komponen | File Utama | Peran & Elemen Kunci |
|---|---|---|
| **Root & Chart Wrapper** | `app/app.vue`, `app/components/shared/AppChart.vue` | `<MotionConfig>`, `<NuxtRouteAnnouncer>`, `<NuxtLoadingIndicator>`, `<AppChart>` pembungkus `<VChart>` tree-shaken di dalam `<ClientOnly>` + loading skeleton + empty state aman SSR. |
| **Layout Publik** | `app/layouts/default.vue` | *Floating Frosted Glass Navbar* (`Beranda`, `Linimasa Ekonomi`, `Metodologi`), Quick Search bar (`⌘K`) aktif di `/linimasa`, pill periode WITA, CTA gradien, `<USlideover>` menu mobile, footer institusional. |
| **Landing Page** (`/`) | `app/pages/index.vue` | Hero *Midnight Cobalt–Emerald* + **Live PDRB Snapshot Bento** dari `/api/public/overview` (fallback otomatis via `pickLandingSnapshotPeriod`), strip 4 pilar taksonomi, Bento Grid 4 kapabilitas (`#cara-kerja`), preview maksimal 3 fenomena terbaru, redirect query lama (`/?year=...`) ke `/linimasa`. |
| **Public View** (`/linimasa`) | `app/pages/linimasa.vue` & `app/components/public/*` | `KpiSnapshotGrid` (4 kartu KPI berikon Solar), `SectorDistributionCharts` (**2 grafik interaktif ECharts**: Bar KBLI per klaster warna & Donut 6 Pengeluaran dengan klik-filter), `PublicFilterBar` (`USelectMenu` searchable KBLI + multi-warna filter), `PhenomenonFeedCard` (aksen garis kiri warna klaster), `PublicArticleDetailModal`, serta switcher Stream Timeline / Tabel Ringkas. |
| **Split Login Showcase** (`/login`) | `app/pages/login.vue` | Layout 2 kolom (`lg:grid-cols-12`): kiri panel showcase *hero-mesh-dark* dengan 3 highlight Nerwilis, kanan kartu auth elevated berfokus pada Google OAuth Whitelist + form cadangan email/kata sandi dengan `OAUTH_ERROR_MAP` lengkap; mobile menempatkan form OAuth di atas lipatan layar. |
| **Layout Admin** (`/admin/**`) | `app/layouts/admin.vue` & `CommandPaletteModal.vue` | **Collapsible Sidebar Rail** (`w-64` ↔ `w-20` tersimpan di `localStorage` + `UTooltip` saat ciut), item aktif `.active-nav-card`, badge `PENDING` & `FAILED`, Floating Glass Header dengan `<USelect>` tahun + pill triwulan global + Command Palette (`⌘K`), serta judul tab dinamis per rute. |
| **Dashboard & Tren** | `app/pages/admin/index.vue`, `app/pages/admin/trends.vue` | `admin/index.vue`: 4 KPI + **ECharts Donut Ketercakupan 17 Sektor** + Heatmap 17×6 Cobalt–Emerald + radar gap. `trends.vue`: **ECharts Stacked Bar + Smooth Area Trendline** 8 triwulan interaktif dengan klik-navigasi periode + ekspor Excel. |
| **Kurasi, Bank Data, Sintesis** | `review.vue`, `articles.vue`, `synthesis.vue`, `ReviewSlideover.vue`, `ManualArticleModal.vue` | Antrean tab kurasi + batch action, Bank Data dengan multi-filter `<USelect>`/`<USelectMenu>` & ekspor 10 kolom `.xlsx`/`.csv`, generator narasi BRS dengan `<USelectMenu>` target + `<USelect>` gaya narasi + draft PostgreSQL + `.synthesis-print-sheet` cetak A4 utuh. |
| **Sumber & Taksonomi** | `portals.vue`, `keywords.vue`, `taxonomy.vue`, `KeywordFormModal.vue` | Direktori portal Kaltara + external ingestion health, master keyword nasional dengan multi-warna KBLI/pengeluaran & switch instan, serta kamus interaktif 17 KBLI × 6 Pengeluaran + matriks dampak. |
| **Monitor & Akses** | `scrapers.vue`, `users.vue`, `ScraperLogTable.vue`, `UserFormModal.vue` | Panel kontrol manual/retry LLM + polling live + 4 kartu telemetri token, riwayat log dengan modal error JSON, dan kelola akses tim whitelist OAuth-First + RBAC role badge. |

---

## 3. Wireframe Konseptual Halaman Utama

### 3.1 Landing Page (`/`) & Public Portal (`/linimasa`)

```text
+---------------------------------------------------------------------------------------------------+
| [SIPENA KTT • Nerwilis]     [Beranda] [Linimasa Ekonomi] [Metodologi]     [TW IV 2026] [Admin ->] |
+---------------------------------------------------------------------------------------------------+
| === (Rute /) LANDING HERO (hero-mesh-dark) ====================================================== |
| Satu Portal Intelijen Dinamika Ekonomi Tana Tidung           | Live PDRB Snapshot Bento (API riil)|
| Tagline: Rekam jejak dinamika sektor usaha, pergerakan harga | Total Terverifikasi | Dominan KBLI |
| [Jelajahi Linimasa Ekonomi ->]  [Buka Workstation Admin]     | Top 3 Sektor KBLI Berwarna Klaster |
|---------------------------------------------------------------------------------------------------|
| Strip 4 Pilar Taksonomi (17 KBLI | 6 Pengeluaran | 4 Klaster Warna | Verifikasi Nerwilis)          |
| Bento Grid Kapabilitas (#cara-kerja) -> Preview 3 Fenomena Terbaru -> Bottom CTA Banner            |
+---------------------------------------------------------------------------------------------------+

+---------------------------------------------------------------------------------------------------+
| === (Rute /linimasa) PUBLIC PORTAL ============================================================== |
| Linimasa Fenomena Ekonomi Tana Tidung                                                             |
| "Rekam jejak dinamika sektor usaha, pergerakan harga, dan aktivitas ekonomi Kabupaten Tana Tidung |
|  secara terkurasi dan transparan."             [Linimasa Stream | Tabel Ringkas] [Statistik ->]  |
| Tahun: [USelect 2026 v] | Triwulan: [TW I] [TW II] [TW III] [*TW IV*] | Status: 48 Fenomena Sah    |
|---------------------------------------------------------------------------------------------------|
| [L: PublicFilterBar Sticky]          | [R: Stream Timeline (.timeline-spine) / Tabel Ringkas]    |
| • Search / USelectMenu 17 KBLI       | +--- [Garis Aksen Warna Klaster 3px] --------------------+ |
| • Pill Sumber (Semua/Lokal/Nasional) | | [Emerald: KBLI A] [Ekspor Bersih]   14 Okt • Kaltara | |
| • Komponen Pengeluaran (6 titik wrn) | | Harga TBS Sawit KTT Menguat di Awal Triwulan IV...     | |
| • Arah Dampak (Ekspansi/Kontraksi/..) | | [Ringkasan terkurasi] • [Dual-Axis Strip] • [Detail] | |
+---------------------------------------------------------------------------------------------------+
```

**Tagline Resmi Portal Publik (`/linimasa` & Landing Hero):**
> *"Rekam jejak dinamika sektor usaha, pergerakan harga, dan aktivitas ekonomi Kabupaten Tana Tidung secara terkurasi dan transparan."*

---

### 3.2 Split Login (`/login`) & Admin Shell (`/admin/**`)

```text
+--------------------------------------------+ +--------------------------------------------------+
| [Panel Kiri Desktop: hero-mesh-dark]       | | [Kartu Auth Kanan: .saas-card]                   |
| BPS Kab. Tana Tidung • Nerwilis            | | SIPENA KTT • Admin                  * Terproteksi|
| Workstation Intelijen Ekonomi Daerah       | | Masuk ke Workstation Nerwilis                    |
| • Radar Gap Sektoral 17 × 6                | | [ (G) Masuk dengan Google (Staf Whitelist)     ] |
| • Kurasi Berbasis Bukti Berita             | | ------------------------------------------------ |
| • Sintesis Narasi BRS Terstruktur          | | [v] Login alternatif email & kata sandi lokal    |
+--------------------------------------------+ +--------------------------------------------------+

==================== ADMIN SHELL (app/layouts/admin.vue) ============================================
[w-64 <-> w-20 Sidebar Rail]     | [Floating Glass Header: Breadcrumb | [⌘K] | [USelect Thn][TW1-4] | [Buka Review]]
• Analitik & Sintesis PDRB       |------------------------------------------------------------------
  - Dashboard & Gap Sektoral     | <main id="main-content" class="max-w-[1440px]">
  - Tren & Komparasi (ECharts)   |   Konten halaman workstation (.saas-card, KPI Solar duotone,
  - Sintesis Narasi PDRB (BRS)   |   ECharts interaktif, UTable / USlideover / UModal)
• Kurasi & Repositori Data       |
  - Review Harian [badge PENDING]|
  - Bank Data & Ekspor           |
• Sumber Berita & Taksonomi      |
  - Direktori Portal Regional    |
  - Master Keyword Nasional      |
  - Kamus & Taksonomi PDRB       |
• Sistem & Tata Kelola           |
  - Monitor Scraper & AI [badge] |
  - Kelola Akses & Tim (Admin)   |
[Lihat Portal Publik ->/linimasa]|
[Avatar + Profil + Keluar]       |
====================================================================================================
```

---

## 4. Kontrak Output Khusus yang Dipertahankan Penuh

### 4.1 Spesifikasi Ekspor Excel (`.xlsx` via `exceljs`) — 10 Kolom Mutlak
Ditrigger dari `/admin/articles` & `/admin/trends` (`GET /api/admin/articles/export?format=xlsx&...`). Urutan kolom pada *Sheet 1 ("Fenomena PDRB KTT")* **wajib tetap persis**:

| Urutan Kolom | Nama Header Kolom di File `.xlsx` | Format Isi / Nilai Contoh | Lebar & Gaya ExcelJS |
|---|---|---|---|
| **1** | `Waktu Rilis Berita` | `14/10/2026` (`dd/mm/yyyy` zona WITA) | Lebar `18`, rata tengah |
| **2** | `Judul Berita` | `Harga TBS Sawit KTT Menguat di Awal Triwulan IV...` | Lebar `42`, `wrapText: true` |
| **3** | `Kategori Lapangan Usaha (KBLI)` | `A - Pertanian, Kehutanan, dan Perikanan` | Lebar `34`, `wrapText: true` |
| **4** | `Dampak Sisi Lapangan Usaha` | `Meningkatkan Harga` | Lebar `22` |
| **5** | `Komponen PDRB Pengeluaran` | `Ekspor Bersih Antar Daerah/Luar Negeri` | Lebar `32`, `wrapText: true` |
| **6** | `Dampak Sisi Pengeluaran` | `Meningkatkan Pengeluaran Riil` | Lebar `28` |
| **7** | `Ringkasan Berita` | `Harga pembelian Tandan Buah Segar (TBS) kelapa sawit...` (2–3 kalimat) | Lebar `55`, `wrapText: true` |
| **8** | `Sumber Berita (URL)` | `https://korankaltara.com/...` (disimpan sebagai clickable Excel hyperlink) | Lebar `40`, warna biru hyperlink |
| **9** | `Periode Berita` | `Triwulan IV 2026` | Lebar `18`, rata tengah |
| **10** | `Status Verifikasi` | `Terverifikasi` / `Menunggu Review` / `Diabaikan` | Lebar `18`, rata tengah |

### 4.2 Lembar Cetak A4 Sintesis Narasi BRS (`/admin/synthesis`)
- Seluruh kontrol kerja memakai kelas `.no-print` sehingga hilang otomatis saat `window.print()`.
- Kontainer narasi memakai `.synthesis-print-sheet` dengan margin bersih, sitasi nomor `[1]` terhubung ke daftar pustaka berita terverifikasi di bagian bawah, serta ekspor dokumen `.doc` (HTML Word-compatible Blob) yang tidak terpengaruh oleh perombakan kelas CSS layout layar.

---

## 5. Responsivitas Mobile (`< 768px` / `375px`)
1. **Landing (`/`):** Hero CTA & Live Snapshot Bento tersusun vertikal rapi; grid 4 pilar & 4 bento kapabilitas merapat ke 1 kolom dengan `0px` horizontal overflow.
2. **Public Portal (`/linimasa`):** KPI Grid 4 kartu bertransisi 2×2; kontrol tahun & triwulan membungkus rapi; drawer statistik ECharts terbuka penuh dengan ukuran kontainer tinggi eksplisit; filter lanjutan dilipat rapi agar feed berita segera terlihat.
3. **Login (`/login`):** Kolom auth berpindah ke urutan pertama (`order-1`) di atas lipatan layar sementara panel showcase bergeser ke `order-2` di bawahnya.
4. **Admin Workstation (`/admin/*`):** Sidebar rail desktop tersembunyi otomatis digantikan `<USlideover>` kiri pada layar mobile; seluruh tabel dibungkus `.saas-table-scroller` agar dapat digeser horizontal tanpa merusak lebar viewport halaman.
