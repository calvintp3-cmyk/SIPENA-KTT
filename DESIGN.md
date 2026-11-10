---
name: SIPENA-KTT
description: Sapick & SyncMaster inspired Light-First SaaS economic curation workstation for BPS Kabupaten Tana Tidung (65.04).
colors:
  obsidian-ink: "#0f172a"
  obsidian-hover: "#1e293b"
  emerald-brand: "#059669"
  emerald-deep: "#047857"
  emerald-soft: "#ecfdf5"
  emerald-border: "#a7f3d0"
  canvas-light: "#f7f8fa"
  surface-white: "#ffffff"
  surface-subtle: "#f1f5f9"
  surface-hover: "#f3f4f6"
  text-primary: "#0f172a"
  text-secondary: "#475569"
  text-muted: "#64748b"
  border-hairline: "#eef0f4"
  border-subtle: "#e2e8f0"
  border-strong: "#cbd5e1"
  danger-ring: "#e11d48"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0em"
  metric:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  caption:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
  kbd-code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.obsidian-ink}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.obsidian-hover}"
  button-accent:
    backgroundColor: "{colors.emerald-brand}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-secondary:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card-surface:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input-field:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: SIPENA-KTT

## Overview

**Creative North Star: "Editorial Emerald & Obsidian SaaS" (Sapick & SyncMaster Direction)**

SIPENA-KTT is a modern, high-craft SaaS curation workstation built for Tim Neraca Wilayah dan Analisis Statistik (Nerwilis) at BPS Kabupaten Tana Tidung (`65.04`). Synthesizing the visual DNA of **Sapick Astro** and **SyncMaster Astro** (supported by split-inbox ergonomics from **TellDesk Astro**), the system replaces heavy government sidebars, rigid dark boxes, and terminal monospace clutter with an airy Light-First workspace.

**Key Characteristics:**
- **Pure White & Alabaster Tonal Layering**: Crisp `#ffffff` work surfaces floating cleanly over a calm `#f7f8fa` canvas with `1px` `#eef0f4` hairlines and soft diffused elevation (`0 10px 30px -10px rgba(15, 23, 42, 0.05)`).
- **Obsidian Ink + Fresh Emerald Accent**: High-authority Obsidian Ink (`#0f172a`) for primary action buttons paired with Sapick Forest Emerald (`#059669` / `#047857`) for brand identity, active workspace states, and verified data signals.
- **Top Navbar + Direct-to-Curation Split Workspace**: Zero left sidebar. A sleek `64px` top navigation bar gives 100% horizontal room to the `Meja Kurasi` split-view (clean SyncMaster list on the left, live article reader & KBLI verification editor on the right).
- **Friendly Geometric Typography (`Plus Jakarta Sans`)**: Headlines, article summaries, and `tabular-nums` KPI counters all use Plus Jakarta Sans for a cohesive modern SaaS feel, reserving `JetBrains Mono` strictly for keyboard shortcut keycaps (`Ctrl+K`, `J`, `K`, `A`, `R`).
- **Rounded Modern Geometry**: `12px` (`rounded-xl`) on buttons, inputs, and segmented controls; `16px` to `20px` (`rounded-2xl`) on cards and split panes; `8px` (`rounded-lg`) on soft pastel status chips.

## Colors

### Three-Layer Token Architecture (`Primitive -> Semantic -> Component`)

#### 1. Primitive Tokens
- **Slate / Obsidian**: `slate-900` (`#0f172a`), `slate-800` (`#1e293b`), `slate-600` (`#475569`), `slate-500` (`#64748b`), `slate-200` (`#e2e8f0`), `slate-100` (`#f1f5f9`), `alabaster-50` (`#f7f8fa`), `white` (`#ffffff`).
- **Emerald (Brand & Verified)**: `emerald-700` (`#047857`), `emerald-600` (`#059669`), `emerald-500` (`#10b981`), `emerald-200` (`#a7f3d0`), `emerald-50` (`#ecfdf5`).
- **Amber (Pending Queue)**: `amber-800` (`#92400e`), `amber-200` (`#fde68a`), `amber-50` (`#fffbeb`).
- **Blue (Needs Revision)**: `blue-800` (`#1e40af`), `blue-200` (`#bfdbfe`), `blue-50` (`#eff6ff`).
- **Rose (Rejected / Negative Shock)**: `rose-800` (`#9f1239`), `rose-600` (`#e11d48`), `rose-200` (`#fecdd3`), `rose-50` (`#fff1f2`).

#### 2. Semantic Tokens
- `--bg-canvas`: `#f7f8fa` (Main page background)
- `--bg-surface`: `#ffffff` (Primary cards, top navbar, split panes)
- `--bg-subtle`: `#f1f5f9` (Recessed inputs, filter wells, secondary pills)
- `--bg-hover`: `#f3f4f6` (Row hover and ghost button hover)
- `--bg-active`: `#ecfdf5` (Selected curation row & active filter tint)
- `--text-primary`: `#0f172a` (`17.4:1` on white)
- `--text-secondary`: `#475569` (`7.5:1` on white)
- `--text-muted`: `#64748b` (`4.75:1` on white, WCAG AA verified)
- `--border-hairline`: `#eef0f4` (Row dividers & card seams)
- `--border-subtle`: `#e2e8f0` (Card & input default boundaries)
- `--border-strong`: `#cbd5e1` (Interactive button & active input borders)
- `--cta-primary`: `#0f172a` (Obsidian primary CTA fill)
- `--cta-primary-hover`: `#1e293b` (Obsidian hover fill)
- `--accent-primary`: `#059669` (Sapick Emerald brand accent)
- `--accent-primary-hover`: `#047857` (Deep Emerald hover/text accent, `5.48:1` on white)
- `--focus-ring`: `#059669` (`2px` keyboard focus ring)

#### 3. Component Tokens
- `--btn-primary-bg`: `var(--cta-primary)`
- `--btn-primary-text`: `#ffffff`
- `--btn-accent-bg`: `var(--accent-primary)`
- `--card-bg`: `var(--bg-surface)`
- `--card-border`: `var(--border-hairline)`
- `--card-shadow`: `0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)`
- `--input-bg`: `var(--bg-subtle)`
- `--input-focus-bg`: `var(--bg-surface)`

### Named Rules
**The Obsidian & Emerald Harmony Rule.** Primary structural CTAs (`Masuk ke Workstation`, `Tarik Berita`, `Unduh Kertas Kerja .xlsx`) use Obsidian Ink (`#0f172a`) for crisp executive authority, while verification approvals (`Setujui Fenomena`) and active workspace indicators use Forest Emerald (`#059669` / `#047857`).
**The Calm Taxonomy Rule.** KBLI 17-sector tags never use loud rainbow blocks. In list views, they appear as refined neutral chips (`#f1f5f9` background, `#0f172a` bold code + `#475569` sector name) with subtle semantic dots so the page stays serene.

## Typography

**Primary UI, Display & Metric Font:** Plus Jakarta Sans (`400`, `500`, `600`, `700`)
**Keyboard Hint Font:** JetBrains Mono (`500`, `600`)

### Hierarchy
- **Display / Auth Hero** (`700`, `1.875rem` to `2.25rem`, `1.15` line-height, `-0.03em` tracking): Login hero heading and primary analytical callouts.
- **Metric Counter** (`700`, `1.5rem` to `1.875rem`, `tabular-nums`, `-0.025em` tracking): Interactive KPI strip counters (`Total`, `Menunggu Telaah`, `Disetujui`, `Ditolak`).
- **Headline (`H1` / `H2`)** (`600`, `1.125rem` to `1.25rem`, `1.3` line-height, `-0.02em` tracking): Section titles and selected article title inside the Split Inspection Pane.
- **List Item Title** (`600`, `0.9375rem` / `15px`, `1.4` line-height): Phenomenon headline inside the `Meja Kurasi` list.
- **Body Prose** (`400`, `0.875rem` / `14px`, `1.65` line-height, `65ch` max measure): Economic summaries and full source news text.
- **Caption & Metadata** (`500`, `0.75rem` / `12px`, `1.4` line-height): Media outlet names, publication dates (`tabular-nums`), and subsector labels (never cramped `10px` all-caps).

## Layout

1. **Top Navigation Bar (`64px` height, sticky)**:
   - Left: Refined emerald-and-obsidian `BrandMark` + `SIPENA-KTT` title + compact `BPS 65.04` badge.
   - Center: Segmented/pill navigation (`Meja Kurasi`, `Ringkasan Analitik`, `Ekspor Excel`) with smooth active state.
   - Right: Inline Period Selector (`Triwulan I-IV` + `Tahun`), `+ Tarik Berita` primary button, and Operator Profile chip with logout action.
2. **Direct-to-Curation Workspace (`Meja Kurasi`, Default Landing Tab)**:
   - **Top Metric Strip**: 4 interactive metric cards (`Semua Fenomena`, `Menunggu Telaah`, `Disetujui`, `Perlu Revisi / Ditolak`) that filter the feed in one click.
   - **Search & Filter Bar**: Clean `rounded-xl` search input (`Ctrl+K`) + compact KBLI, Expenditure, and Media Source selectors.
   - **Master-Detail Split View (`12-column` grid on `xl+`)**:
     - **Left Pane (`7 columns` or `55%` width)**: SyncMaster-inspired clean list where each item shows the news headline (`15px` semi-bold), 2-line summary, subtle KBLI & Expenditure chips, source/date metadata, and pastel status pill.
     - **Right Pane (`5 columns` or `45%` width, sticky)**: TellDesk-inspired live Inspection & Verification Workbench with underline tabs (`Ringkasan & Klasifikasi`, `Teks Berita Asli`, `Riwayat Audit`), inline KBLI/Expenditure editors, and sticky action bar (`Setujui [A]`, `Perlu Revisi`, `Tolak [R]`). On screens `< 1280px`, clicking a row opens the same inspector in a smooth native `<dialog>` slide-over sheet.

## Elevation & Shapes

- **Cards & Split Containers**: `16px` (`rounded-2xl`), `#ffffff` background, `1px solid #eef0f4`, and `--card-shadow` (`0 10px 30px -10px rgba(15, 23, 42, 0.05)`).
- **Buttons, Inputs & Selects**: `12px` (`rounded-xl`), `min-height: 40px` desktop / `44px` mobile.
- **Status & Taxonomy Chips**: `8px` (`rounded-lg`), soft pastel fills with `1px` tinted borders.

## Do's and Don'ts

### Do:
- **Do** keep the interface Light-First (`#f7f8fa` canvas, `#ffffff` cards) with generous padding (`20px` to `28px`) and soft hairline dividers (`#eef0f4`).
- **Do** land authenticated users directly on `Meja Kurasi` with the first item pre-selected in the desktop Split Inspection Pane so the screen feels alive and immediately actionable.
- **Do** maintain WCAG 2.1 AA contrast (`>= 4.5:1`), keyboard navigation (`J`/`K`, `A`/`R`, `Ctrl+K`), and `44px` mobile tap targets.

### Don't:
- **Don't** use dark navy sidebars, thick `#94a3b8` box borders on cards, or multi-colored saturated KBLI square blocks.
- **Don't** use monospace fonts for KPI numbers or prose labels, or use `10px` uppercase tracked labels across forms.
- **Don't** introduce em dashes (`U+2014`), AI buzzwords, or unverified metrics.
