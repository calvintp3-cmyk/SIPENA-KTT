# SIPENA-KTT Design System & UI Architecture (`v3.0.0`)

**Product**: Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung (SIPENA-KTT)  
**Target Institution**: Fungsi Neraca Wilayah dan Analisis Statistik (Nerwilis), BPS Kabupaten Tana Tidung (`6504`)  
**Aesthetic Direction**: **Sapick & SyncMaster Modern Light-First SaaS** (with TellDesk Split-View Curation Ergonomics)  
**Corner Geometry**: **Rounded Modern** (`8px` chips, `12px` controls/buttons/inputs, `16px-20px` cards & panels)

---

## 1. Design Philosophy & Reference Synthesis

SIPENA-KTT `v3.0.0` replaces the legacy dark-sidebar government portal aesthetic with a **Light-First Modern SaaS Workstation** inspired by five reference architectures:

| Reference Theme | Extracted Architectural & Visual Pattern in SIPENA-KTT |
| :--- | :--- |
| **Sapick Astro** | Pure white (`#FFFFFF`) elevated cards with soft diffused shadows (`--shadow-card`), **Obsidian Ink (`#0F172A`)** primary CTA buttons, and **Forest Emerald (`#059669` / `#047857`)** brand & verified badges. |
| **SyncMaster Astro** | Ultra-clean phenomenon data rows separated by `1px` `#EEF0F4` hairlines (zero thick boxy table borders) and soft pastel status chips (`Disetujui`, `Pending`, `Perlu Revisi`, `Ditolak`). |
| **TellDesk Astro** | **Split-View Curation Workbench** (`Meja Kurasi`): phenomenon feed on the left (`1fr`) paired with a sticky inline **Split Inspection & Verification Pane** on the right (`460px-520px`) with underline tabs. |
| **BlazeX Astro** | Airy soft-neutral metric strip and calm horizontal sector proportion bars without gridline clutter. |
| **AutomatePro Astro** | Generous `rounded-2xl` container geometry and subtle warm/mint header accent washes on the `/login` gateway. |

### Core Design Rules
1. **Light-First by Default**: `defaultTheme="light"` is enforced across `/login` and `/`. The interface never boots into dark mode unless explicitly toggled by the user.
2. **Top Navbar Only (No Left Sidebar)**: A single `64px` sticky horizontal top navigation bar gives 100% of the horizontal viewport to the curation split-view and analytics grids.
3. **Direct-to-Curation Default**: Logging in lands directly on **`Meja Kurasi`** (`activeTab = "feed"`) with a 4-stat Interactive Metric Strip above the Master-Detail Split-View Workbench.
4. **Geometric Numeric Clarity**: All KPI metrics, percentages, and counts use `Plus Jakarta Sans` (`700`) with `font-variant-numeric: tabular-nums`. `JetBrains Mono` is strictly limited to `<kbd>` shortcut hints (`J`, `K`, `A`, `R`, `Ctrl+K`) and short technical codes (`KBLI A`, `6504`).

---

## 2. Three-Layer Token Architecture (`Primitive -> Semantic -> Component`)

### Layer 1: Primitive Tokens
| Token | Value | Purpose |
| :--- | :--- | :--- |
| `--primitive-white` | `#FFFFFF` | Pure white card & navbar surface |
| `--primitive-alabaster-50` | `#F7F8FA` | Primary app canvas background |
| `--primitive-slate-100` | `#F1F5F9` | Secondary fill, inactive pill, table header tint |
| `--primitive-slate-150` | `#EEF0F4` | Hairline row and card border |
| `--primitive-slate-200` | `#E2E8F0` | Standard subtle card/button border |
| `--primitive-slate-300` | `#CBD5E1` | Resting form input border |
| `--primitive-slate-500` | `#64748B` | Muted metadata & caption text |
| `--primitive-slate-600` | `#475569` | Secondary body & label text |
| `--primitive-slate-800` | `#1E293B` | Obsidian hover state |
| `--primitive-slate-900` | `#0F172A` | Obsidian Ink primary text & primary CTA fill |
| `--primitive-emerald-50` | `#ECFDF5` | Mint-emerald active/verified surface tint |
| `--primitive-emerald-200` | `#A7F3D0` | Mint-emerald badge & active row border |
| `--primitive-emerald-600` | `#059669` | Primary brand accent & focus ring |
| `--primitive-emerald-700` | `#047857` | Deep emerald badge text & hover accent |
| `--primitive-amber-50` | `#FFFBEB` | Pending status pastel tint |
| `--primitive-amber-200` | `#FDE68A` | Pending status pastel border |
| `--primitive-amber-700` | `#B45309` | Pending status text (`6.0:1` contrast) |
| `--primitive-indigo-50` | `#EFF6FF` | Needs-revision status pastel tint |
| `--primitive-indigo-200` | `#BFDBFE` | Needs-revision status pastel border |
| `--primitive-indigo-700` | `#1D4ED8` | Needs-revision status text (`6.7:1` contrast) |
| `--primitive-rose-50` | `#FFF1F2` | Rejected/error pastel tint |
| `--primitive-rose-200` | `#FECDD3` | Rejected/error pastel border |
| `--primitive-rose-700` | `#BE123C` | Rejected/error text (`6.4:1` contrast) |

### Layer 2: Semantic Tokens
| Semantic Token | Light Mode Mapping | Usage |
| :--- | :--- | :--- |
| `--bg-canvas` | `var(--primitive-alabaster-50)` (`#F7F8FA`) | Page body background |
| `--bg-surface` | `var(--primitive-white)` (`#FFFFFF`) | Cards, top navbar, split panes, modals |
| `--bg-subtle` | `var(--primitive-slate-100)` (`#F1F5F9`) | Hover rows, filter pills, secondary fills |
| `--bg-selected` | `var(--primitive-emerald-50)` (`#ECFDF5`) | Selected phenomenon row & active tab pill |
| `--text-primary` | `var(--primitive-slate-900)` (`#0F172A`) | Headings, article titles, primary values |
| `--text-secondary` | `var(--primitive-slate-600)` (`#475569`) | Summaries, descriptions, form labels |
| `--text-muted` | `var(--primitive-slate-500)` (`#64748B`) | Timestamps, helper text, inactive tabs |
| `--brand-primary` | `var(--primitive-emerald-600)` (`#059669`) | Brand mark, active indicator, focus ring |
| `--brand-primary-hover` | `var(--primitive-emerald-700)` (`#047857`) | Brand hover & verified action fill |
| `--cta-primary-bg` | `var(--primitive-slate-900)` (`#0F172A`) | Primary CTA fill (`Masuk`, `+ Tarik Berita`, `Unduh`) |
| `--cta-primary-hover` | `var(--primitive-slate-800)` (`#1E293B`) | Primary CTA hover fill |
| `--border-hairline` | `var(--primitive-slate-150)` (`#EEF0F4`) | Card borders & table row dividers |
| `--border-subtle` | `var(--primitive-slate-200)` (`#E2E8F0`) | Secondary button & container borders |
| `--border-input` | `var(--primitive-slate-300)` (`#CBD5E1`) | Form input, select, and textarea borders |

### Layer 3: Component Tokens & Geometry
| Token | Value | Applied Components |
| :--- | :--- | :--- |
| `--radius-sm` | `0.5rem` (`8px` / `rounded-lg`) | Pastel status badges, KBLI taxonomy pills, `<kbd>` hints |
| `--radius-md` | `0.75rem` (`12px` / `rounded-xl`) | Buttons, text inputs, selects, search bar, top nav tabs |
| `--radius-lg` | `1rem` (`16px` / `rounded-2xl`) | Metric cards, phenomenon list card, split detail pane |
| `--radius-xl` | `1.25rem` (`20px`) | Login gateway card, mobile slide-over sheet |
| `--shadow-xs` | `0 1px 2px 0 rgba(15, 23, 42, 0.04)` | Inputs, secondary buttons |
| `--shadow-card` | `0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)` | Elevated white cards & split inspection pane |
| `--shadow-floating` | `0 20px 45px -15px rgba(15, 23, 42, 0.10), 0 4px 12px -2px rgba(15, 23, 42, 0.04)` | Login card, dropdown menus, dialogs |

---

## 3. Component State Matrix

Every interactive element implements all five states:

| Component | Default | Hover | Active / Pressed | Focus-Visible | Disabled / Loading |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Button (Obsidian)** | `#0F172A` bg, `#FFFFFF` text, `rounded-xl` | `#1E293B` bg, `-1px` translate | `#0F172A` bg, `scale(0.99)` | `2px` `#059669` ring + `2px` offset | `opacity: 0.55`, `cursor: not-allowed`, spinner |
| **Approve Button (Emerald)** | `#059669` bg, `#FFFFFF` text, `rounded-xl` | `#047857` bg | `#065F46` bg | `2px` `#059669` ring + `2px` offset | `opacity: 0.55`, `cursor: not-allowed` |
| **Secondary Button (White)** | `#FFFFFF` bg, `#0F172A` text, `1px` `#E2E8F0` border, `rounded-xl` | `#F8FAFC` bg, `#CBD5E1` border | `#F1F5F9` bg | `2px` `#059669` ring + `2px` offset | `opacity: 0.5`, `cursor: not-allowed` |
| **Form Input / Select** | `#FFFFFF` bg, `1px` `#CBD5E1` border, `rounded-xl` | `#94A3B8` border | `#059669` border | `1px` `#059669` border + `3px` `rgba(5,150,105,0.16)` ring | `#F8FAFC` bg, `#94A3B8` text |
| **Phenomenon Row** | `#FFFFFF` bg, `1px` `#EEF0F4` bottom hairline | `#F8FAFC` bg | `#ECFDF5` bg (`#059669` `3px` left bar) | `2px` inset `#059669` outline | `opacity: 0.6` |
| **Top Nav Tab** | Transparent bg, `#475569` text, `rounded-xl` | `#F1F5F9` bg, `#0F172A` text | `#ECFDF5` pill bg, `#047857` text (`600`), `2px` `#059669` bottom indicator | `2px` `#059669` ring | `opacity: 0.4` |

---

## 4. Screen-by-Screen Layout Specifications

### 4.1 Authentication Gateway (`/login`)
- **Canvas**: Soft Alabaster (`#F7F8FA`) with a subtle radial mint-emerald wash (`radial-gradient(circle at 50% 0%, rgba(5, 150, 105, 0.08), transparent 55%)`).
- **Gateway Card**: Centered `max-w-[440px]` pure white card (`#FFFFFF`), `rounded-2xl`, `p-8 sm:p-10`, `border: 1px solid #EEF0F4`, `box-shadow: var(--shadow-floating)`.
- **Header**: Emerald-tinted brand mark (`SIPENA-KTT`), concise title (`Masuk ke SIPENA-KTT`), and calm subtitle (`Ruang kerja kurasi berita ekonomi dan rekonsiliasi PDRB BPS Kabupaten Tana Tidung`).
- **Form Ergonomics**: `rounded-xl` inputs (`h-11`), inline password visibility toggle, validation feedback shown only after user interaction (`touched` or submit attempt), and a full-width Obsidian Ink (`#0F172A`) submit CTA.

### 4.2 Top Navigation Bar (`CommandHeader`)
- **Height & Container**: `h-16` (`64px`) sticky header (`bg-white/90 backdrop-blur-md border-b border-[#EEF0F4]`), centered `max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8`.
- **Left**: Brand mark + `SIPENA-KTT` + `6504` pill.
- **Center**: 3 horizontal tabs (`Meja Kurasi` with pending badge, `Ringkasan Analitik`, `Pusat Ekspor Excel`).
- **Right**: Period selector (`rounded-xl`), `+ Tarik Berita` Obsidian CTA (`canEdit`), and Operator profile chip with role badge & logout button.

### 4.3 `Meja Kurasi` Split-View Workbench (`activeTab === "feed"`)
1. **Interactive 4-Stat Metric Strip**: 4 `rounded-2xl` white cards (`Total Fenomena`, `Menunggu Verifikasi`, `Disetujui ke PDRB`, `Cakupan Sektor KBLI`). Clicking a card filters the feed below.
2. **Unified Filter & Search Toolbar**: `rounded-2xl` white bar with `Ctrl+K` search input, status pill tabs (`Semua`, `Pending`, `Disetujui`, `Perlu Revisi`, `Ditolak`), KBLI sector dropdown, and Expenditure dropdown.
3. **Master-Detail Split Grid (`xl:grid-cols-[1fr_480px] 2xl:grid-cols-[1fr_540px] gap-5`)**:
   - **Left Pane (`CurationTable`)**: SyncMaster-style clean rows with checkbox, source/date caption, `15px` semibold headline, 2-line excerpt, calm KBLI & Expenditure chips (`rounded-lg`), and pastel status badge.
   - **Right Pane (`SplitInspectionPane`)**: TellDesk-style sticky inspection & verification panel on desktop (`xl+`) with underline tabs (`Ringkasan & Klasifikasi`, `Teks Berita Asli`, `Riwayat Audit`), inline KBLI/Expenditure/Notes editor, and `[A] Setujui` (Emerald) / `[R] Tolak` / `Perlu Revisi` actions. On `< xl` viewports, opens in a native `<dialog>` slide-over sheet.

### 4.4 `Ringkasan Analitik` (`activeTab === "overview"`)
- Sapick & BlazeX style `rounded-2xl` white cards with generous `p-6` padding:
  - **Distribusi 17 Kategori Lapangan Usaha (KBLI)**: Horizontal emerald/slate bars with `tabular-nums` counts and click-to-filter drill-down into `Meja Kurasi`.
  - **Komponen Pengeluaran & Sebaran Sumber Media**: Clean proportion cards and recent verified phenomena feed.

### 4.5 `Pusat Ekspor Excel` (`activeTab === "export"`)
- `rounded-2xl` white configurator card (Period selector, verified-only toggle, Obsidian Ink `Unduh Kertas Kerja (.xlsx)` CTA), 3-sheet summary cards (`Ringkasan_Eksekutif`, `Matriks_KBLI_PDRB`, `Daftar_Fenomena_Audit`), and a clean live preview table.
