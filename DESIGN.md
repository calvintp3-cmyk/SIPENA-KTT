---
name: SIPENA-KTT
description: Civic statistical precision workspace for BPS Kabupaten Tana Tidung (65.04) quarterly PDRB curation.
colors:
  primary: "#0369a1"
  primary-hover: "#075985"
  maritime-navy: "#0a2540"
  canvas-light: "#f4f6fa"
  surface-light: "#ffffff"
  subtle-light: "#f8fafc"
  ink-primary: "#0f172a"
  ink-secondary: "#334155"
  ink-muted: "#526075"
  border-light: "#dce3ec"
  border-strong-light: "#94a3b8"
  canvas-dark: "#080d16"
  surface-dark: "#101827"
  accent-sky-dark: "#38bdf8"
  danger-ring: "#e11d48"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0em"
  micro:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
  badge-code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  card-surface:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input-field:
    backgroundColor: "{colors.subtle-light}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: SIPENA-KTT

## Overview

**Creative North Star: "Civic Statistical Ledger"**

SIPENA-KTT serves Tim Neraca Wilayah dan Analisis Statistik (Nerwilis) at BPS Kabupaten Tana Tidung (`65.04`). The visual system mirrors an authoritative regional accounts dossier: crisp daylight surfaces led by cool paper neutrals, anchored along the left edge by a sovereign BPS Maritime Navy navigation spine, and engineered to shift cleanly into calibrated obsidian slate when toggled to Dark Mode for evening reconciliation sessions.

Information hierarchy centers on editorial evidence next to analytical judgment. Uniform card grids, neon purple-blue gradients, pill-shaped form chrome, and generic glass overlays are explicitly rejected in favor of structured asymmetry, scannable tabular rows, and restrained interaction depth.

**Key Characteristics:**
- Daylight-first `#f4f6fa` canvas and pure `#ffffff` analytical paper paired with persistent `#0a2540` navigation rail (`#080d16` and `#101827` in Dark Mode).
- Two-font statistical discipline: Plus Jakarta Sans for Indonesian journalism prose and decisions, strictly paired with JetBrains Mono (`tabular-nums`) for KBLI indices, timestamps, counts, and numerical metrics.
- Top-layer `<dialog>` review architecture placing raw media citations opposite human-in-the-loop taxonomy controls with keyboard triage (`J/K`, `Enter`, `[A]`, `[R]`, `Esc`).
- Complete WCAG 2.1 AA contrast compliance (`>= 4.5:1` body text, `>= 3:1` structural control outlines) across Light and Dark modes, plus non-color iconography in status badges.

## Colors

The palette rests on high-contrast neutral ink and cool archival paper, using deep maritime navy for institutional navigation and one calibrated cobalt accent for primary actions.

### Primary
- **BPS Cobalt Accent** (`#0369a1`, hover `#075985`; `#38bdf8` text in Dark Mode): Primary verification actions, Excel export triggers, active filters, and focus rings (`5.95:1` white-on-cobalt contrast in both modes).
- **Sovereign Maritime Navy** (`#0a2540`; `#0b1220` in Dark Mode): Dedicated left workspace navigation rail and split authentication context column.

### Neutral
- **Daylight Canvas** (`#f4f6fa`; Dark `#080d16`): Base application viewport behind analytical modules.
- **Analytical Paper Surface** (`#ffffff`; Dark `#101827`): Elevated tables, overview bands, review drawer, and export workbench cards.
- **Recessed Control Well** (`#f8fafc`; Dark `#0c1320`): Table sticky headers, form inputs, and source article reader pane.
- **Ink Primary / Secondary / Muted** (`#0f172a` / `#334155` / `#526075`; Dark `#f8fafc` / `#cbd5e1` / `#94a3b8`): Strict tonal steps maintaining comfortable long-session legibility above WCAG AA floors.
- **Hairline / Strong Borders** (`#dce3ec` / `#94a3b8`; Dark `#1e293b` / `#475569`): Thin 1px boundaries defining containers and interactive fields cleanly without heavy shadows.

### Named Rules
**The Cobalt Restraint Rule.** Primary cobalt ink and fills mark interactive triggers, active focus outlines, and drill-down destinations only. Categorical badges keep neutral surfaces paired with compact color index tiles so tabular scanning stays calm.
**The Dual-Theme Parity Rule.** Every semantic surface, input, scrollbar, dialog backdrop, and badge defines verified Light and Dark contrast tokens. Switching `sipena-theme` never leaves dark-on-dark or pale-on-white artifacts.

## Typography

**Display Font:** Plus Jakarta Sans (with system-ui, sans-serif fallback)
**Body Font:** Plus Jakarta Sans (with system-ui, sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, monospace fallback)

**Character:** Plus Jakarta Sans brings balanced geometric legibility to dense Indonesian economic summaries and headlines, while JetBrains Mono aligns multi-row tables, dates, scores, and sector indices vertically.

### Hierarchy
- **Display** (`700`, `1.875rem` to `2.25rem`, `1.2` line-height, `-0.025em` tracking): Focal quarterly backlog counters and authentication banner heading.
- **Headline** (`700`, `1.125rem`, `1.3` line-height, `-0.02em` tracking): Sticky workspace view header (`h1`) and drawer article title.
- **Title** (`700`, `0.875rem`, `1.4` line-height): Panel headings such as KBLI distribution questions and priority queue headers.
- **Body** (`400`/`500`, `0.8125rem` to `0.875rem`, `1.6`–`1.65` line-height, `65ch` max measure in review prose): News narrative summaries and article body reading columns.
- **Mono Telemetry** (`600`, `0.6875rem` to `0.75rem`, `tabular-nums`): KBLI codes, expenditure labels, dates, row counts, and keyboard hint keycaps.

### Named Rules
**The Earned Monospace Rule.** Monospace lettering appears strictly on identifiers, quantitative counters, timestamps, and keyboard shortcuts. Narrative headings and prose always render in Plus Jakarta Sans.

## Layout

Desktop (`lg+`) divides cleanly into a collapsible Sovereign Navy navigation rail (`256px` expanded / `74px` collapsed) beside a fluid workspace column capped at `1440px` (`16px` mobile / `24px` desktop gutters). Mobile (`< 1024px`) promotes full-width work surfaces and opens navigation inside a native top-layer `<dialog>` drawer (`288px`).

Analytical modules use purposeful 12-column asymmetry (`7/5` splits across KPI action strip, KBLI vs. Expenditure breakdown, and Export configuration vs. Workbook specification) rather than symmetrical four-box templates. Vertical section spacing stays grounded at `24px` (`gap-4` / `space-y-6`).

## Elevation & Depth

Surfaces sit primarily flat within structural `1px` hairline borders (`--border-subtle`). Soft offset elevation (`--shadow-card` and `--shadow-elevated`) applies selectively to floating authentication cards, bulk-action bars, skip links, and the slide-over `<dialog>` review drawer. Background blur glassmorphism and colored outer glows are excluded.

### Shadow Vocabulary
- **Card Seam** (`box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04)`): Barely perceptible grounding under analytical white panels in Light Mode.
- **Elevated Surface** (`box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.1), 0 2px 6px rgba(15, 23, 42, 0.05)`): Reserved strictly for modal drawers, skip links, and sign-in containers.

### Named Rules
**The Flat-By-Default Rule.** Content tables and distribution panels separate via clean surface contrast and `1px` seams. Only top-layer overlays and primary entry cards cast directional shadows.

## Shapes

Corner geometry steps intentionally by component weight:
- **Compact Tags & Badges** (`6px` radius / `rounded-md`): KBLI index tiles, status chips, source badges, and compact action triggers.
- **Interactive Controls & Inputs** (`8px` radius / `rounded-lg`): Primary buttons, period selectors, segmented status filters, text inputs, and sidebar items.
- **Structural Panels** (`12px` radius / `rounded-xl`): Dashboard workspace cards, data table frames, and authentication form containers.
- **Progress Meters Only**: Full pill rounding (`rounded-full`) is limited solely to horizontal progress bars and proportion tracks.

## Components

### Buttons
- **Shape:** Deliberately rectangular with soft corners (`8px` radius).
- **Primary:** Solid `#0369a1` cobalt fill (`#ffffff` label, `8px 16px` padding, `min-height: 40px` mobile / `36px` desktop), shifting to `#075985` on hover (`#0284c7` hover in Dark Mode).
- **Secondary / Ghost:** Surface `#ffffff` (`#101827` dark) with `1px` `--border-strong` border, shifting to `--bg-hover` on hover.

### Chips & Status Badges
- **Style:** `1px` tinted semantic borders with soft paper/tinted fill (`6px` radius) pairing an explicit geometric icon glyph (`Check`, `Clock`, `X`, `RotateCcw`) alongside Bahasa Indonesia status text.
- **KBLI Identification:** Neutral chip holding a high-contrast colored letter square (`A`, `B`, `F`) next to the sector title.

### Cards / Containers
- **Corner Style:** `12px` radius (`rounded-xl`).
- **Background:** Crisp `#ffffff` (`--bg-surface`) over `#f4f6fa` canvas (`--bg-canvas`), internal padding `20px`.
- **Border:** `1px solid var(--border-subtle)`.

### Inputs / Fields
- **Style:** `8px` radius (`rounded-lg`), `--bg-subtle` fill shifting to `--bg-surface` on focus, `1px solid var(--border-strong)`.
- **Focus & Validation:** High-contrast `2px` `--focus-ring` outline (`outline-offset: 2px`) on `:focus-visible`; deferred error feedback via `:user-invalid` and explicit validation text beneath fields after interaction/submit.

### Navigation
- **Style:** Persistent collapsible Sovereign BPS Navy (`#0a2540`) left rail on desktop with `aria-current="page"` state and mobile `<dialog>` slide-out drawer.

## Do's and Don'ts

### Do:
- **Do** validate Contrast (`>= 4.5:1` normal text, `>= 3:1` borders and UI indicators) and full interactive layout across both Light (`sipena-theme=light`) and Dark (`sipena-theme=dark`) modes.
- **Do** keep narrative copy strictly authentic to BPS Kab. Tana Tidung (`65.04`) operations with zero em dash characters (`U+2014`) and real Postgres-backed counts.
- **Do** maintain visible labels and helpful empty, loading skeleton, error retry, and read-only `viewer` states on every module.

### Don't:
- **Don't** apply pill rounding (`rounded-full`) to buttons, badges, inputs, or cards, or scatter colored `border-left` accent bars onto cards.
- **Don't** introduce external font CDN links, unapproved images, AI buzzword copy, or infinite `animate-pulse` / glowing status dots.
- **Don't** suppress focus rings or build non-semantic clickable `<div>` elements instead of native `<button>` and `<a href>` controls.
