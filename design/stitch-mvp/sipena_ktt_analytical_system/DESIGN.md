---
name: SIPENA-KTT Analytical System
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#bec8d2'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#88929b'
  outline-variant: '#3e4850'
  surface-tint: '#89ceff'
  primary: '#89ceff'
  on-primary: '#00344d'
  primary-container: '#0ea5e9'
  on-primary-container: '#003751'
  inverse-primary: '#006591'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#d88a00'
  on-tertiary-container: '#4a2c00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c9e6ff'
  primary-fixed-dim: '#89ceff'
  on-primary-fixed: '#001e2f'
  on-primary-fixed-variant: '#004c6e'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Geist
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
  tabular-numeric-lg:
    fontFamily: JetBrains Mono
    fontSize: 1.125rem
    fontWeight: '500'
    lineHeight: 1.5rem
    letterSpacing: -0.02em
  tabular-numeric-md:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.025em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style
This design system serves municipal statisticians, regional development officers (BAPPEDA), and national account analysts managing regional GDP (PDRB) data curation in Tana Tidung Regency. The operational posture is authoritative, precise, and forensic. 

The aesthetic is a high-density, technical data workspace rooted in structured minimalism and functional clarity. It eliminates ambient visual noise, organic illustrations, and decorative card structures in favor of data-first panels, high-contrast monospace metrics, crisp divider grids, and strict categorical labeling. Every visual token communicates operational state, auditability, and data provenance.

## Colors
The palette is built around deep technical slate surfaces that reduce eye strain during extended analytical sessions while keeping contrast ratios rigorously WCAG AAA compliant.

- **Foundational Surfaces**:
  - `canvas-base`: `#030712` (Zinc 950 deep canvas background)
  - `surface-panel`: `#0b0f19` (Slate 900 structural workspace panels)
  - `surface-elevated`: `#111827` (Card and modal containers)
  - `surface-subtle`: `#1e293b` (Hover states and active selection fills)
- **Borders & Dividers**:
  - `border-subtle`: `#1e293b` (Table cell and internal item dividers)
  - `border-strong`: `#334155` (Panel perimeters, active inputs, split-pane dividers)
- **Functional Accents**:
  - **Primary (`#0ea5e9`)**: Sky blue for active analytical selection, focal primary actions, and primary time-series indicators.
  - **Positive Impact / Active (`#10b981`)**: Emerald for positive economic growth contributions, verified PDRB adjustments, and reconciled ledger entries.
  - **Secondary Impact (`#6366f1`)**: Indigo for external macroeconomic benchmarks and cross-regional comparisons.
  - **Warning / Pending (`#f59e0b`)**: Amber for pending supervisory reviews, anomalous statistical fluctuations, and draft curation stages.
  - **Critical / Negative (`#ef4444`)**: Rose-red for negative growth shocks, failed data imports, and unvalidated discrepancies.
- **Typography & Content**:
  - `text-primary`: `#f8fafc`
  - `text-secondary`: `#94a3b8`
  - `text-tertiary`: `#64748b`

## Typography
The system enforces a dual-type operational model: `Geist` and `Inter` provide maximum legibility across editorial descriptions, navigation, and executive summaries, while `JetBrains Mono` handles all numerical, temporal, and classification tokens (KBLI sector keys, transaction IDs, basis points, confidence intervals).

- All data grid values, statistical matrices, and percentage deltas must leverage `tabular-numeric-md` or `tabular-numeric-lg` with tabular figures enabled (`tnum` font feature) to eliminate column jitter during real-time data syncs.
- Monospace tags are restricted to uppercase for system codes (e.g., `KBLI A.01.11`, `BPS-64.04`, `Q3-2024-ADHB`).
- Form field labels utilize `label-sm` in all-caps or title-case to maintain clean visual separation from input values.

## Layout & Spacing
The layout implements a high-density, fixed-sidebar with fluid multi-pane work surfaces designed specifically for wide desktop monitors (1440px and above), with responsive collapse states for field review tablets.

- **Grid Architecture**: 24-column granular subgrid allows complex multi-variable data layouts (e.g., KBLI breakdown tables alongside quarterly trend charts and curation logs).
- **Density Tiering**: Baseline vertical rhythm operates on an aggressive 4px/8px modular base. Cell padding is locked to `0.375rem` vertical and `0.75rem` horizontal in standard density view to maximize information on a single fold.
- **Breakpoints & Behavior**:
  - `Desktop (>= 1280px)`: Fixed three-tier structure: Navigation Sidebar (240px static), Curation Stream / Main Matrix (flexible), and Inspector / Audit Ledger (340px docked right).
  - `Tablet (768px - 1279px)`: Inspector folds into an overlay slide-out panel; data matrices switch to horizontal scroll with pinned header and primary key columns.
  - `Mobile (< 768px)`: Read-only summary dashboard with aggregated cards; full spreadsheet editing is locked behind an explicit screen threshold warning.

## Elevation & Depth
Elevation in this system eschews dramatic blur shadows in favor of **structural containment** and **low-contrast outline tiers**. 

- **Surface Tiers**: Hierarchy is established through step-up tonal luminosity:
  - Base: `#030712` (Background Canvas)
  - Tier 1: `#0b0f19` (Data tables, docked panels, sidebar)
  - Tier 2: `#111827` (Inspector cards, toolbars, modal dialogs)
  - Tier 3: `#1e293b` (Active row selection, tooltip flyouts)
- **Borders & Dividers**: Visual separation relies almost entirely on 1px crisp borders (`#1e293b`). No element floats without a structural outline.
- **Overlays**: Modals and dropdown menus employ a razor-thin top-edge highlight (`border-t border-slate-700/60`) paired with a minimal dark technical drop shadow (`box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.7)`).

## Shapes
To preserve strict analytical density and grid alignment, rounded corners are intentionally restrained.

- Standard buttons, input boxes, filter triggers, and inline badges use tight `0.25rem` (4px) corner radii.
- Modals, large panels, and dropdown menus step up to `0.375rem` (6px) to slightly soften viewport edges while maintaining a strict industrial feel.
- Circular shapes are strictly prohibited except for status indicator pips (6px solid circular dots) indicating server connectivity and validation health.

## Components

### Buttons
- **Primary**: Solid sky blue background (`#0ea5e9`), text `#030712`, font weight 600, height 32px (compact), padding `0 12px`. Hover: `#38bdf8`. Active: `#0284c7`.
- **Secondary**: Surface background `#111827`, 1px border `#334155`, text `#f8fafc`. Hover: `#1e293b` with border `#475569`.
- **Destructive**: Low-profile transparent fill, text `#ef4444`, 1px border `#ef4444/30`. Hover: `#ef4444/10`.
- **Density**: Touch targets maintain standard 32px height in standard analytics mode and 28px in ultra-dense curation tables.

### Monospace Sector Badges & Chips
- **KBLI Tag (Standard)**: Height 20px, font `JetBrains Mono` 11px, background `#1e293b`, text `#94a3b8`, 1px border `#334155`.
- **Status Chips**:
  - *Reconciled / Positive*: Background `rgba(16, 185, 129, 0.1)`, text `#34d399`, border `rgba(16, 185, 129, 0.25)`.
  - *Pending Review*: Background `rgba(245, 158, 11, 0.1)`, text `#fbbf24`, border `rgba(245, 158, 11, 0.25)`.
  - *Negative Delta*: Background `rgba(239, 68, 68, 0.1)`, text `#f87171`, border `rgba(239, 68, 68, 0.25)`.

### Tabular Data Grid
- Header row: Height 32px, background `#0b0f19`, bottom border 1px `#334155`, text uppercase `Inter` 11px font-weight 600, text color `#64748b`.
- Data rows: Height 36px, alternate row tinting prohibited, bottom border 1px `#1e293b`.
- Hover state: Background `#111827`. Active selected row: Left-edge 2px indicator bar `#0ea5e9` with background `#0f172a`.
- Numerical columns right-aligned with `tabular-numeric-md` typography.

### Input Fields & Controls
- **Text Inputs**: Height 32px, background `#0b0f19`, border 1px `#334155`, text `#f8fafc`, placeholder `#475569`. Focus: Border `#0ea5e9`, ring 1px `#0ea5e9/20`.
- **Checkboxes**: 14x14px square, corner radius 2px, background `#0b0f19`, border 1px `#475569`. Checked: Background `#0ea5e9`, border `#0ea5e9`, white checkmark icon.

### Analytical Inspector Cards
- Flat panel architecture without drop shadow: Background `#0b0f19`, border 1px `#1e293b`.
- Header: Height 40px, padding `0 12px`, border-bottom 1px `#1e293b`, displaying sector code and quarterly timeline stamp.
- Content sections separated by horizontal 1px hairline dividers (`#1e293b`).