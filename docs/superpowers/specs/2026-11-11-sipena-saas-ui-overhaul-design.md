# Design Spec: SIPENA KTT — Overhaul UI/UX "Super Modern Premium SaaS" (Sub-Proyek A)

**Tanggal:** 2026-11-11  
**Status:** Disetujui untuk Perencanaan Implementasi  
**Ruang Lingkup:** Sub-proyek A — Overhaul menyeluruh sistem desain, tipografi, palet warna, UI library, transisi antar-halaman, Landing Page (`/`), Public Portal (`/linimasa`), Login (`/login`), serta Admin Shell & seluruh workstation (`/admin/*`).  
**Di Luar Ruang Lingkup (Siklus Terpisah):** Sub-proyek B — Multi-Provider Free LLM Fallback & Workflow Scraper (poin #12) akan dibuatkan spesifikasi & siklus implementasinya sendiri setelah Sub-proyek A selesai dan terverifikasi.

---

## 1. Tujuan & Masalah yang Diselesaikan

Mengatasi seluruh 12 catatan UI/UX dari peninjauan antarmuka live `https://sipena6503.caplinlab.my.id`:
1. **Landing Page Awal (`/`):** Pengunjung disambut halaman beranda SaaS modern yang komunikatif dan hidup, bukan langsung dilempar ke daftar berita datar.
2. **Halaman Login Modern (`/login`):** Mengganti kartu tunggal datar menjadi pengalaman *split showcase* asimetris dengan kedalaman *Cobalt–Emerald gradient-glass*.
3. **Tagline Publik Baru:** Mengganti kalimat birokratis sebelumnya menjadi tagline terbuka dan presisi: *"Rekam jejak dinamika sektor usaha, pergerakan harga, dan aktivitas ekonomi Kabupaten Tana Tidung secara terkurasi dan transparan."*
4. **Public View Kaya & Interaktif (`/linimasa`):** Meningkatkan kekayaan visual, kontrol filter modern, grafik interaktif ECharts, dan kartu fenomena multi-warna.
5. **Tipografi Ramah Semua Mata:** Menghapus total penggunaan `JetBrains Mono` / kelas `font-mono` dari navigasi, badge, angka KPI, tahun, kartu, footer, dan filter; menggunakan **satu font tunggal `Inter`** secara konsisten dengan `tabular-nums` untuk keterbacaan angka.
6. **Ekspansi Library UI & Visual:** Menambahkan `motion-v`, `echarts` (`nuxt-echarts`), dan `@iconify-json/solar` di atas `@nuxt/ui` v3 + Tailwind CSS v4.
7–10. **Admin View, Sidebar Nav, Header Nav, & Komponen Detail Modern:** Merombak sidebar menjadi *collapsible luminous rail*, header mengambang terstruktur, serta menyeragamkan tombol, kartu, badge, `USelectMenu`/`USelect`, dan tabel di seluruh 10 halaman admin.
11. **Palet Lebih Berwarna:** Beralih dari kanvas abu-abu (`#EFF2F7`) + satu teal gelap ke sistem **Cobalt–Emerald Luminous SaaS** dengan spektrum warna semantik multi-kategori untuk 17 KBLI, 6 Pengeluaran, arah dampak, dan status kurasi.
13. **Transisi Halaman Halus:** Menambahkan Nuxt View Transitions API + Vue fallback `pageTransition` / `layoutTransition` serta *spring micro-interactions*.

---

## 2. Sistem Desain & Token (`Cobalt–Emerald Luminous SaaS`)

### 2.1 Palet Warna & Spektrum Semantik
- **Permukaan & Kanvas (`app/assets/css/main.css`):**
  - `--color-canvas`: `#F4F7FC` (putih kebiruan sejuk bercahaya, menggantikan `#EFF2F7`)
  - `--color-surface`: `#FFFFFF`
  - `--color-surface-elevated`: `#FAFBFD`
  - `--color-border-hairline`: `#E2E8F0`
  - `--color-ink-primary`: `#0F172A`
  - `--color-ink-secondary`: `#334155`
  - `--color-ink-muted`: `#64748B`
  - **Showcase/Hero Dark Surface (Landing Hero, Login Panel):** Gradien terkurasi `#090F24` → `#0F1D45` → `#0B3B3E` dengan *radial aurora highlights* Cobalt (`rgba(59, 130, 246, 0.28)`) dan Emerald (`rgba(16, 185, 129, 0.22)`).
- **Warna Aksi & Brand (`app/app.config.ts`):**
  - `primary`: `'indigo'` / Cobalt (`#2563EB`–`#4F46E5`)
  - `secondary`: `'emerald'` (`#059669`–`#10B981`)
  - `success`: `'emerald'`, `warning`: `'amber'`, `error`: `'rose'`, `info`: `'sky'`, `neutral`: `'slate'`
  - **Primary CTA Gradient Button:** Gradien diagonal halus `linear-gradient(135deg, #2563EB 0%, #4F46E5 55%, #0D9488 100%)` dengan `inset 0 1px 0 rgba(255,255,255,0.28)` dan bayangan warna lembut; kontras teks putih ≥ 4.5:1.
- **Spektrum Warna 4 Klaster KBLI & Komponen (Kontras WCAG ≥ 4.5:1):**
  Disediakan helper `getKbliClusterTheme(kbliOrGroup)` di `app/composables/usePdrbLabels.ts`:
  1. **Primer & Sumber Daya (`A`, `B`)**: **Emerald** (`bg-emerald-50`, `text-emerald-800`, `border-emerald-200`, aksen bar `#10B981`).
  2. **Industri, Energi & Konstruksi (`C`, `D`, `E`, `F`)**: **Amber–Orange** (`bg-amber-50`, `text-amber-800`, `border-amber-200`, aksen bar `#F59E0B`).
  3. **Perdagangan, Logistik & Pariwisata (`G`, `H`, `I`, `J`)**: **Cobalt–Sky** (`bg-blue-50`, `text-blue-800`, `border-blue-200`, aksen bar `#2563EB`).
  4. **Keuangan, Properti & Jasa Publik (`K`, `L`, `M,N`, `O`, `P`, `Q`, `R,S,T,U`)**: **Violet–Indigo** (`bg-violet-50`, `text-violet-800`, `border-violet-200`, aksen bar `#7C3AED`).
- **Arah Dampak Makro:**
  - Ekspansi (`INCREASE_NTB` / `INCREASE_REAL`): **Emerald**
  - Kontraksi (`DECREASE_NTB` / `DECREASE_REAL`): **Rose**
  - Kenaikan Harga (`INCREASE_PRICE` / `INCREASE_DEFLATOR`): **Amber**
  - Penurunan Harga (`DECREASE_PRICE` / `DECREASE_DEFLATOR`): **Cyan**

### 2.2 Sistem Tipografi Tunggal
- **Keluarga Font Tunggal:** Google Font **`Inter`** (`400;500;600;700;800`) dimuat di `nuxt.config.ts` menggantikan kombinasi `Plus Jakarta Sans` + `JetBrains Mono`.
- **Aturan Wajib:** Tidak ada kelas `font-mono` atau `JetBrains Mono` pada elemen UI mana pun (badge, tahun, header grup sidebar, footer, tombol shortcut, jam WITA, kode KBLI, tabel). Seluruh angka statistik, tanggal, persentase, dan counter memakai utilitas `.tabular-nums` (`font-variant-numeric: tabular-nums`) pada `Inter`.

### 2.3 Komponen Detail & Primitif UI
- Styling terpusat di `app/app.config.ts` (`UCard`, `UButton`, `UBadge`, `UInput`, `USelect`, `USelectMenu`, `UTable`, `UModal`, `USlideover`, `UTabs`).
- Mengganti seluruh `<select>` HTML bawaan pada filter publik & toolbar admin dengan `USelect` / `USelectMenu` Nuxt UI agar konsisten secara visual, mendukung pencarian KBLI, dan mematuhi fokus keyboard.
- Kartu menggunakan `.saas-card` dengan `rounded-2xl`, border lembut bergradasi halus saat hover (`.saas-card-interactive`), dan elevasi bertingkat tanpa *shadow* gelap berat.

---

## 3. Penambahan Library Stack & Arsitektur Transisi

| Kebutuhan | Library / Mekanisme | Integrasi di Nuxt 3 (`3.21.11`) | Catatan Keamanan & Performa |
|---|---|---|---|
| **Motion & Micro-interaction** | `motion-v` (`motion-v/nuxt`) | Modul `motion-v/nuxt` di `nuxt.config.ts`; dipakai untuk hero reveal, bento stagger, dan shared layout indicator tab/nav. | Menghormati `prefers-reduced-motion: reduce`; animasi hanya properti compositor (`transform`, `opacity`). |
| **Interactive Data Charts** | `echarts` (`^6.1.0`) + `vue-echarts` (`^8.3.0`) + `nuxt-echarts` (`^1.1.0`) | Modul `nuxt-echarts` dengan registrasi tree-shaken (`BarChart`, `LineChart`, `PieChart`, `TooltipComponent`, `GridComponent`, `CanvasRenderer`). Memasang `echarts` dan `vue-echarts` eksplisit agar peer dependency terpenuhi. | Dibungkus aman SSR (`<ClientOnly>` + height container tetap + skeleton placeholder) agar 0 CLS dan bebas mismatch hidrasi. |
| **Duotone SaaS Icons** | `@iconify-json/solar` | Bundled via `@nuxt/icon` (`server` provider lokal) dengan nama ikon `i-solar-*` (bold-duotone) untuk navigasi, KPI, & hero bento; `i-lucide-*` tetap untuk kontrol kecil (`chevron`, `x`, `check`). | Tetap offline-ready dari server bundle tanpa bergantung API ikon eksternal saat runtime. |
| **Page & Layout Transitions** | Nuxt `experimental.viewTransition` + `pageTransition` / `layoutTransition` | Aktif di `nuxt.config.ts` + `app/middleware/page-transition.global.ts` yang otomatis mematikan Vue transition di browser pendukung `document.startViewTransition` dan fallback ke transisi CSS `fade-slide` (240ms `cubic-bezier(0.22, 1, 0.36, 1)`) untuk Safari/Firefox. | Mematikan durasi ke `0ms` bila user mengaktifkan `prefers-reduced-motion: reduce`. |

---

## 4. Arsitektur Halaman, Navigasi, & Alur Data

### 4.1 Pemetaan Rute Baru & Kompatibilitas Link Lama
- **`/` (`app/pages/index.vue` — Landing Page SaaS Penuh):**
  - Menggunakan `layout: 'default'`.
  - **Smart Legacy Query Redirect:** Bila request ke `/` mengandung query filter/linimasa (`year`, `quarter`, `q`, `kbli`, `pdrbGroup`, `expenditure`, `impactMacro`, `sourceType`, `view`, `page`), langsung diarahkan via `navigateTo({ path: '/linimasa', query: route.query }, { replace: true })` agar tautan lama tidak pernah rusak.
  - **Komposisi Landing Page (`/`):**
    1. **Hero *Midnight Cobalt–Emerald Gradient Glass*:** Badge institusional BPS Kabupaten Tana Tidung (Nerwilis), judul besar `Inter 800`, deskripsi ringkas bernilai tinggi, dua CTA utama (*"Jelajahi Linimasa Ekonomi"* → `/linimasa`, *"Buka Workstation Admin"* → `/login` atau `/admin`), serta **Interactive Live PDRB Snapshot Bento** di kanan yang mengambil data asli dari `/api/public/overview` (fallback otomatis ke `availablePeriods.find(p => p.count > 0)` bila triwulan berjalan belum terisi; tidak pernah mengarang angka palsu).
    2. **Strip Metrik Taksonomi & Arsitektur Sistem:** Menampilkan angka struktural faktual sistem (`17 Kategori KBLI`, `6 Komponen Pengeluaran`, `Sumber Regional + Nasional`, `Kurasi Analis Nerwilis`).
    3. **Bento Grid Kapabilitas "Bagaimana SIPENA Bekerja" (`#cara-kerja`):** 4 kartu multi-warna berikon `Solar` duotone (Penjaringan Harian, Klasifikasi Ganda PDRB, Kurasi Berbasis Bukti, & Ringkasan Triwulanan) dengan animasi masuk halus.
    4. **Preview Fenomena Terkurasi Terbaru:** Menampilkan 3 kartu terbaru asli dari `/api/public/articles?limit=3` (atau state informatif jujur beserta tombol eksplorasi periode terisi jika 0 artikel pada periode aktif), diikuti banner CTA penutup menuju `/linimasa`.
- **`/linimasa` (`app/pages/linimasa.vue` — Public Portal):**
  - Halaman eksplorasi penuh yang mewarisi seluruh kemampuan query URL (`?year=&quarter=&kbli=&pdrbGroup=&expenditure=&impactMacro=&sourceType=&q=&view=&page=`), mode Stream Timeline & Tabel Ringkas PDRB, drawer statistik, dan modal detail fenomena.
  - **Header Seksi Editorial:** Judul *Linimasa Fenomena Ekonomi Tana Tidung*, tagline baru yang disetujui, segmented control *Linimasa Stream* vs *Tabel Ringkas*, pemilih Tahun (`USelect`), kontrol Triwulan (`TW I–IV`) dengan pill aktif modern, serta tombol drawer **Statistik Periode** dengan aksen Cobalt–Emerald.
  - **Drawer Statistik ECharts:**
    - `app/components/public/KpiSnapshotGrid.vue`: 4 kartu KPI dengan ikon duotone berwarna (`Cobalt`, `Emerald`, `Amber`, `Violet`).
    - `app/components/public/SectorDistributionCharts.vue`: Menggantikan bar `div` manual dengan **2 chart interaktif ECharts** — (kiri) Bar Horizontal Sebaran Lapangan Usaha KBLI dengan warna per klaster sektor + event `@click` untuk filter timelinenya; (kanan) Donut/Ring Chart 6 Komponen Pengeluaran interaktif dengan legenda & klik-filter.
  - **Filter Rail (`PublicFilterBar.vue`) & Kartu Feed (`PhenomenonFeedCard.vue`):**
    - `PublicFilterBar.vue` memakai kartu luminous berlapis dengan `USelectMenu` searchable untuk 17 KBLI, pill sumber berita, serta daftar komponen pengeluaran & arah dampak bertitik warna semantik.
    - `PhenomenonFeedCard.vue` mendapat aksen garis kiri 3px sesuai warna klaster KBLI, chip sumber & periode bersih tanpa font mono, judul tebal responsif, ringkasan 3–5 kalimat, serta *Dual-Axis Strip* berwarna lembut.

### 4.2 Header Navigasi & Footer Publik (`app/layouts/default.vue`)
- Topbar lengket `h-16` berlatar kaca buram terang (`bg-white/80 backdrop-blur-xl border-b border-slate-200/80`) dengan `view-transition-name: sipena-public-header`.
- **Kiri:** Brand lockup `SIPENA KTT` dengan ikon kotak bergradien Cobalt–Emerald + sub-label *Pemantauan Ekonomi Tana Tidung*.
- **Tengah:** Pill navigasi utama (`Beranda` `/`, `Linimasa` `/linimasa`, `Metodologi` `/#cara-kerja`) dengan indikator pill aktif halus; mengganti pengecekan `isPublicIndex` (`route.path === '/'`) menjadi `isPublicTimeline` (`route.path === '/linimasa'`) sehingga search bar cepat (`⌘K`) aktif tepat di halaman linimasa publik.
- **Kanan:** Status periode aktif dengan titik indikator emerald berdenyut lembut, tombol gradien *"Masuk Admin"* / *"Workspace Admin"*, serta drawer navigasi mobile. Footer tetap bersih memakai `Inter` (tanpa font mono) dengan tautan cepat ke `/`, `/linimasa`, dan `/login`.

### 4.3 Login Page Split Luminous (`app/pages/login.vue`)
- **Desktop (`lg:grid-cols-12`):**
  - Kolom kiri (5–6 kolom): Panel *Midnight Cobalt–Emerald Gradient Glass* menampilkan identitas resmi BPS Kabupaten Tana Tidung (Fungsi Nerwilis), 3 highlight kapabilitas workstation berikon `Solar`, dan indikator keamanan akses *OAuth-First Whitelist*.
  - Kolom kanan: Kartu login elevated bersih di atas kanvas luminous dengan tombol Google OAuth berdimensi modern, panel *disclosure* login email & kata sandi lokal, seluruh penanganan error `OAUTH_ERROR_MAP` & toast dipertahankan penuh, serta tautan kembali ke `/` (Beranda) dan `/linimasa`.
- **Mobile (`< lg`):** Header ringkas *brand badge* diikuti langsung oleh kartu login agar akses satu klik selalu berada di atas lipatan layar.

### 4.4 Admin Shell Modern (`app/layouts/admin.vue`) & 10 Halaman Admin
- **Collapsible Modern SaaS Sidebar Rail:**
  - Mendukung toggle lebar desktop (`w-64` penuh ↔ `w-20` ikon-saja dengan tooltip nama menu; state disimpan di `useState` + `localStorage` dengan fallback SSR aman ke `w-64`) dan `USlideover` di mobile.
  - Grup menu terstruktur dengan label huruf biasa yang bersih (`font-semibold text-xs text-slate-400`, tanpa monospace uppercase kaku).
  - Item aktif memakai pill *Cobalt–Emerald luminous* (`bg-gradient-to-r from-indigo-50 to-emerald-50/70 text-indigo-950 border-indigo-200/80` + garis aksen vertikal Cobalt) dengan ikon `Solar` duotone berwarna serta badge antrean berwarna (`amber` untuk Review Pending, `rose` untuk AI Gagal).
  - Footer sidebar menampilkan tombol portal publik `/linimasa` dan kartu profil admin dengan avatar inisial bergradien & tombol keluar.
- **Floating Glass Admin Header Bar:**
  - `view-transition-name: sipena-admin-header`; berisi breadcrumb modern berikon, badge periode aktif, tombol trigger **Command Palette (`⌘K`)**, pemilih Tahun menggunakan `USelect` Nuxt UI (menggantikan `<select>` HTML), kontrol Triwulan pill modern, serta tombol utama gradien Cobalt–Emerald **"Buka Review"**.
- **Peningkatan Visual 10 Halaman & Komponen Admin (`app/pages/admin/*.vue` & `app/components/admin/*.vue`):**
  - **`app/pages/admin/index.vue`:** 4 KPI cards dengan ikon `Solar` berwarna + **ECharts Donut/Bar Proporsi Ketercakupan 17 Sektor (Tercakup vs Tipis vs Gap)** di samping matriks silang Heatmap 17×6 bergradasi Cobalt–Emerald dan grid detektor gap.
  - **`app/pages/admin/trends.vue`:** Menggantikan bar CSS 8 triwulan dengan **ECharts Stacked/Bar + Smooth Area Trendline** interaktif (hover tooltip jumlah artikel, rasio ekspansi vs kontraksi, klik titik/batang untuk langsung pindah ke triwulan terkait).
  - **`app/pages/admin/review.vue`, `articles.vue`, `synthesis.vue`, `portals.vue`, `keywords.vue`, `taxonomy.vue`, `scrapers.vue`, `users.vue`, serta seluruh modal/slideover (`ReviewSlideover`, `ManualArticleModal`, `KeywordFormModal`, `UserFormModal`, `CommandPaletteModal`, `ScraperLogTable`):**
    - Seluruh `<select>` HTML diganti `USelect` / `USelectMenu` Nuxt UI, seluruh `font-mono` non-teknis dihapus dan diganti `Inter` + `.tabular-nums`, badge & aksen memakai palet semantik Cobalt–Emerald multi-warna baru, sementara kontrak API, cetak A4 BRS (`@media print` di `synthesis.vue`), ekspor Excel/CSV, validasi Zod, serta aturan RBAC tetap identik 100%.

---

## 5. Penanganan Error, Aksesibilitas, & Ketentuan Teknis Vue/Nuxt

- **SSR Hydration & Fallback States:** Seluruh chart ECharts dibungkus aman agar tidak menghasilkan mismatch DOM antara SSR Nitro dan klien; saat data kosong (`totalVerified === 0`) atau gagal fetch, ditampilkan komponen empty/alert modern dengan tombol aksi nyata (*Lihat periode terakhir yang terisi* / *Muat Ulang*).
- **Aksesibilitas (WCAG 2.2 AA):** Kontras teks-latar minimal 4.5:1 di semua badge berwarna maupun tombol gradien, *focus-visible outline* Cobalt `#2563EB` selebar 2px yang jelas di semua elemen interaktif, target sentuh minimum pada tombol ikon/mobile, serta kepatuhan `prefers-reduced-motion: reduce`.
- **Volar 3.3.14 & TypeScript Strict:** Seluruh event handler inline `@click` yang mengubah state di komponen `@nuxt/ui` (seperti `UButton`) dibungkus blok eksplisit `@click="() => { ...; }"` guna menjaga 0 diagnostik Volar (`TS2322`).

---

## 6. Kriteria Verifikasi Sebelum Merge & Deploy

1. **Test Suite & Build Produksi:** `npm test` seluruh test lulus, `npx nuxt typecheck` lulus 0 error, `npm run build` sukses bersih tanpa warning fatal SSR/chunk.
2. **Audit Statis:** Pemindaian Volar/TS pada seluruh file `.vue` dan pengecekan zero sisa `JetBrains Mono` / raw `<select>` yang terlewat di komponen UI.
3. **Verifikasi Browser Langsung (Desktop `1440px` & Mobile `375px`):** Memastikan transisi `/` → `/linimasa` → `/login` → `/admin/*` berjalan mulus, grafik ECharts merender responsif tanpa CLS/console error, sidebar collapse berfungsi, dan tidak ada luapan horizontal (*horizontal overflow*).
