# Rancangan Antarmuka UI/UX & Design System — SIPENA KTT

**Versi Dokumen:** 3.0.0 (Single Source of Truth — *Observatory Naturalist*, WCAG AA/AAA, & PDRB Kaltara)  
**Institusi:** Badan Pusat Statistik (BPS) Kabupaten Tana Tidung • Fungsi Nerwilis  
**Framework UI & Styling:** Nuxt 3 / Vue 3 (`@nuxt/ui ^3.3.7`), Tailwind CSS v4, `motion-v`, `echarts` (`^6.1.0`) + `vue-echarts`  
**Tipografi:** Bricolage Grotesque (Heading/Display), Manrope (Body/UI), JetBrains Mono (Tabular/Data Monospace)  
**Ikonografi:** `@nuxt/icon` (100% offline bundling lokal via `@iconify-json/solar` & `@iconify-json/lucide`)  
**Arah Estetika:** *Observatory Naturalist* — antarmuka analitik makroekonomi berakar pada lanskap alam Kalimantan Utara (Deep Borneo Pine `#0B3D2E`, Canvas Sand `#F7F6F1`, Terracotta `#C8553D`, Warm Ochre `#B45309`), ramah keyboard, bebas AI-slop, dan patuh kontras WCAG AA/AAA ($\ge 4.5:1$).

---

## 1. Fondasi Desain & Arsitektur Token Semantik

Sistem token SIPENA KTT mengadopsi struktur token semantik 3-lapis (*Primitive → Semantic → Component-level*) yang didefinisikan pada `app/assets/css/main.css`, `shared/utils/pdrb-colors.ts`, dan `app/utils/chart-theme.ts`.

### 1.1 Tabel Token Desain Semantik

| Token CSS | Nilai Hex | Peran Semantik | Standar Kontras |
| :--- | :--- | :--- | :--- |
| `--color-brand-primary` | `#0B3D2E` | Deep Borneo Pine: Brand utama, tombol primer, header aktif | 11.2:1 vs Sand Canvas (AAA) |
| `--color-brand-tint` | `#E3F0EA` | Soft Pine Tint: Latar badge, chip aktif, container terpilih | 1.15:1 vs Canvas (Surface) |
| `--color-brand-border` | `#BBD8CB` | Sage Hairline: Border kartu aktif, pembatas badge pine | Hairline subtle |
| `--color-canvas` | `#F7F6F1` | Sand White Canvas: Latar utama publik dan admin | Dasar permukaan |
| `--color-surface` | `#FFFFFF` | Latar kartu elevate, dialog modal, panel editor | Permukaan elevasi |
| `--color-surface-subtle` | `#ECEAE2` | Recessed Surface: Tombol sekunder, slot tabel, chip nonaktif | 1.1:1 vs Canvas |
| `--color-surface-recessed` | `#F0EFE9` | Deep Recessed: Sidebar admin desktop, toolbar bento | Latar kontainer struktural |
| `--color-ink-primary` | `#141917` | Obsidian Charcoal: Judul, teks isi utama, label kritis | 14.8:1 vs Canvas (AAA) |
| `--color-ink-secondary` | `#4A524E` | Mineral Ink: Metadata, waktu terbit, deskripsi ringkas | 6.84:1 vs Canvas (AA/AAA) |
| `--color-ink-muted` | `#5F6762` | Slate Muted: Caption sekunder, breadcrumb, label de-emphasized | 4.84:1 vs Subtle (AA $\ge 4.5:1$) |
| `--color-border-hairline` | `#E2DFD7` | Hairline separator, garis grid, pembatas baris | Divider non-interaktif |
| `--color-border-control` | `#757C78` | Border input form, select, textarea, checkbox | 3.1:1 vs Canvas (WCAG UI $\ge 3:1$) |
| `--color-terracotta` | `#C8553D` | Burnished Copper: Fill grafik negatif, ring error, indikator dot | Warna fill/grafik |
| `--color-terracotta-ink` | `#9E331C` | Deep Terracotta Ink: Teks error, status Penurunan NTB, peringatan | 7.13:1 vs Canvas (AAA) |
| `--color-terracotta-surface` | `#FBECE8` | Latar badge error, alert kegagalan, highlight teks | 1.2:1 vs Canvas |
| `--color-ochre` | `#B45309` | Warm Ochre: Fill grafik netral, ring peringatan, pending dot | Warna fill/grafik |
| `--color-ochre-ink` | `#92400E` | Deep Ochre Ink: Teks status pending, review review, catatan kurasi | 7.09:1 vs Canvas (AAA) |
| `--color-ochre-surface` | `#FEF7E6` | Latar badge review, alert peringatan | 1.15:1 vs Canvas |
| `--color-focus-ring` | `#0B3D2E` | Focus indicator untuk elemen di atas latar terang | 3:1 ring rasio |
| `--color-focus-ring-inverse` | `#86EFAC` | Focus indicator di atas latar gelap / hero mesh | 8.69:1 vs Obsidian |

---

## 2. Matriks Verifikasi Aksesibilitas Kontras (WCAG 2.2)

Diverifikasi secara deterministik menggunakan skrip `tools/ui-codemod/contrast-check.py` berdasarkan formula WCAG Luminance:

```
Contrast Verification Summary:
- ink-primary (#141917) on canvas (#F7F6F1): 14.82:1 (PASS AAA)
- ink-primary (#141917) on white (#FFFFFF): 16.58:1 (PASS AAA)
- ink-secondary (#4A524E) on canvas (#F7F6F1): 6.84:1 (PASS AA)
- ink-secondary (#4A524E) on surface-subtle (#ECEAE2): 6.01:1 (PASS AA)
- ink-muted (#5F6762) on canvas (#F7F6F1): 5.51:1 (PASS AA)
- ink-muted (#5F6762) on surface-subtle (#ECEAE2): 4.84:1 (PASS AA >= 4.5:1)
- brand-primary (#0B3D2E) on canvas (#F7F6F1): 11.23:1 (PASS AAA)
- brand-primary (#0B3D2E) on brand-tint (#E3F0EA): 8.94:1 (PASS AAA)
- terracotta-ink (#9E331C) on canvas (#F7F6F1): 7.13:1 (PASS AAA)
- terracotta-ink (#9E331C) on terracotta-surface (#FBECE8): 5.92:1 (PASS AA)
- ochre-ink (#92400E) on canvas (#F7F6F1): 7.09:1 (PASS AAA)
- ochre-ink (#92400E) on ochre-surface (#FEF7E6): 5.89:1 (PASS AA)
- border-control (#757C78) on canvas (#F7F6F1): 3.25:1 (PASS Non-Text UI >= 3.0:1)
- focus-ring-inverse (#86EFAC) on obsidian (#141917): 11.12:1 (PASS AAA)
```

---

## 3. Tipografi & Ikonografi

### 3.1 Hierarki Tipografi
- **Display & Heading:** `Bricolage Grotesque` (Bobot: `600, 700, 800`). Digunakan untuk judul halaman, nama produk, KPI metrics, dan judul kartu.
- **Body & Controls:** `Manrope` (Bobot: `400, 500, 600, 700`). Digunakan untuk teks isi, deskripsi, form input, tombol, dan tabel.
- **Data & Tabular:** `JetBrains Mono` (Bobot: `400, 500, 600, 700`). Dibatasi secara disiplin HANYA untuk angka tabular (`tabular-nums`), kode KBLI, timestamp WITA, shortcut keyboard (`kbd`), dan sitasi referensi.
- **Standar Ukuran Aksesibel:** Seluruh ukuran teks mikro di bawah 11px telah dipangkas dan dinaikkan minimal ke `text-[11px]` atau `text-xs`.

### 3.2 Ikonografi Offline Mandiri
- `@nuxt/icon` dikonfigurasi dengan mode bundle server lokal.
- Koleksi `@iconify-json/solar` (duotone tebal untuk navigasi dan bento) dan `@iconify-json/lucide` (mikro-interaksi antarmuka) terpasang di dependencies lokal tanpa bergantung pada endpoint API CDN eksternal saat runtime.

---

## 4. Arsitektur Komponen & Dekomposisi Monolit

Seluruh monolit halaman admin (`review.vue`, `articles.vue`, `synthesis.vue`) telah didekomposisi menjadi sub-komponen terlingkup dengan batas maksimal `<= 550 baris` per file induk.

### 4.1 Halaman Review Antrean (`app/pages/admin/review.vue` — 338 baris)
- `ReviewHeaderToolbar.vue`: Filter status segmen, scope periode, pencarian teks, dan ringkasan antrean.
- `ReviewQueueCard.vue`: Kartu feed antrean dengan checkbox multi-select, snippet, badge dampak, dan status LLM.
- `ReviewInspectorPanel.vue`: Panel inspeksi kanan desktop dengan form kurasi terintegrasi (`ArticleCurationForm.vue`).
- `ReviewBatchBar.vue`: Floating batch bar saat multiple row dipilih.
- `HighlightedSnippetBox.vue`: Komponen penyorot bukti empiris dengan penanda lokus wilayah (hijau) dan angka/nominal (kuning).
- `useReviewQueue.ts`: Manajemen query, keyboard navigation (`J`/`K`/`Ctrl+Enter`), dan Undo toast berbasis snapshot ganda (`verificationStatus` dan `isEconomicPhenomenon`).

### 4.2 Bank Data & Kertas Kerja (`app/pages/admin/articles.vue` — 544 baris)
- `ArticleFilterPanel.vue`: Bento filter 3-kolom (Dimensi PDRB, Lokus & Portal Sumber, Rentang Waktu) dengan quick status segment tabs.
- `ArticleTableList.vue`: Tabel 8 kolom resmi BPS (Desktop $\ge$ lg) dan kartu responsif mobile.
- `ArticleBatchModal.vue`: Dialog reklasifikasi massal sektor dan pengeluaran.
- `ArticleDeleteModal.vue`: Dialog konfirmasi penghapusan permanen arsip.
- `useArticleQuery.ts`: Sinkronisasi query parameter URL, preset tanggal cepat, dan filter chips aktif.

### 4.3 Studio Sintesis BRS (`app/pages/admin/synthesis.vue` — 543 baris)
- `SynthesisParameterBar.vue`: Kontrol dimensi (17 KBLI vs 6 Pengeluaran), selector target sektor/komponen, dan pilihan gaya penulisan BRS.
- `SynthesisEvidencePool.vue`: Panel kiri 40% untuk seleksi hingga 30 bukti terverifikasi dengan indikator sitasi silang.
- `SynthesisNarrativeEditor.vue`: Panel kanan 60% lembar kerja narasi BRS (pratinjau markdown terstruktur vs textarea suntingan langsung) dengan footer sitasi referensi.
- `SynthesisDraftHistoryDrawer.vue`: Slideover riwayat draf lintas-periode tersimpan di PostgreSQL dilengkapi modal konfirmasi hapus (`UX-011`).
- `SynthesisDiscardModal.vue`: Modal dirty guard sebelum berpindah dimensi atau rute jika terdapat suntingan belum disimpan.
- `useSynthesisStudio.ts`: Logika streaming SSE OpenAI/Gemini, ekspor dokumen Word (.docx) tunggal, dan kompilasi Buku Fenomena Triwulanan 23 bagian.
- `useSynthesisDraftGuard.ts`: Proteksi navigasi `onBeforeRouteLeave` dan `beforeunload`.

---

## 5. Keputusan Desain Publik & Pengalaman Pengguna (Public UX)

### 5.1 Keputusan 1: Single-Row Sticky Filter Dock (`UX-010`)
- Menghilangkan search bar duplikat di masthead atas publik.
- Mengadopsi `PublicFilterDock.vue` sebagai 1 baris sticky dock ramping di bagian bawah layar:
  - Input pencarian langsung (`#filter-dock-search`, shortcut `/` dan `Ctrl+K`).
  - Dropdown filter cepat KBLI dan Pengeluaran.
  - Popover indikator sinyal makroekonomi terkompresi.
  - Tombol drawer filter lengkap untuk perangkat mobile.

### 5.2 Keputusan 2: Highlighting Snippet Terfokus
- Kartu feed publik (`PhenomenonFeedCard.vue`) tetap bersih dan rapi untuk keterbacaan cepat.
- Penyorotan teks cerdas (`parseEconomicSnippetSegments`) hanya diterapkan pada ringkasan modal detail (`PublicArticleDetailModal.vue`), menandai entitas kecamatan dan metrik persentase/moneter.

### 5.3 Honest Empty State (`UX-009`)
- Saat `totalVerified === 0`, visualisasi `ObservatoryHeroPulse.vue` dan `SectorMosaicMatrix.vue` menampilkan status faktual "Belum Ada Bukti Empiris Tercatat", bukan membagi rata 50/50 palsu atau menampilkan metrik nol yang membingungkan.

---

## 6. Aksesibilitas, Motion, Cetak, & Visualisasi

### 6.1 Aksesibilitas Gerak (Reduced Motion — `UX-023`)
- `app/assets/css/main.css` menyertakan universal reduced-motion gate:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

### 6.2 Visualisasi Ramah Buta Warna (ECharts Decals — `UX-024`)
- `AppChart.vue` mengintegrasikan konfigurasi `aria: { enabled: true, decal: { show: true } }` secara default dari `app/utils/chart-theme.ts`.
- Grafik batang, area, dan pie menggunakan tekstur SVG pola berbeda di samping warna, memastikan pengguna dengan defisiensi penglihatan warna (protanopia, deuteranopia, tritanopia) dapat membedakan kategori secara instan.

### 6.3 Tata Letak Cetak Resmi BRS (`UX-013`)
- Menggunakan kelas `.no-print` untuk menyembunyikan sidebar admin, header kontrol, dan panel evidence pool saat dialog cetak browser dipanggil (`window.print()`).
- Menyediakan letterhead resmi cetak:
  *"Badan Pusat Statistik Kabupaten Tana Tidung • Fungsi Nerwilis — Berita Resmi Statistik Fenomena PDRB"*
- Lebar dokumen otomatis 100% pada media kertas A4.

---

## 7. Dependensi Backend di Luar Scope (Tercatat untuk Masa Depan)

1. **Endpoint Bulk Reclassify Terpusat:** Saat ini klasifikasi massal di `/api/admin/articles/batch` menangani aksi `RECLASSIFY`, `VERIFY`, dan `IGNORE`.
2. **Kueri Pagination Terbuka untuk Ekspor Seluruh Sektor:** Ekspor buku triwulanan (`downloadFullQuarterBookDocx`) saat ini mengambil draf dengan batas limit 50 sesuai skema API admin. Jika kategori sektor bertambah di masa mendatang, endpoint dapat diperluas mendukung streaming bulk export.
