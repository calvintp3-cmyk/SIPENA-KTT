# SIPENA KTT — Modern Economic Observatory Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform both the Public View (`/`, `/linimasa`, `/login`) and Admin Workstation (`/admin/*`) of SIPENA KTT from a stiff, boxed, generic template into an unmistakable, fluid, modern, premium & elegant **Economic Phenomena Observatory** ("Kaltara Daylight Atelier") without losing any BPS PDRB analytical depth, accessibility, or SSR stability.

**Architecture:** We split visual expression cleanly by surface mode: Public surfaces (`/` and `/linimasa`) adopt an open-canvas, asymmetric, editorial-analytical architecture (eliminating nested cards-in-cards, heavy top borders, and cramped inner scrollboxes in favor of natural page flow, a Deep Borneo Pine focal telemetry anchor, an interactive 17-sector mosaic, a sticky horizontal filter dock, and a spacious slideover reading sheet). Admin surfaces (`/admin/*`) adopt high-precision Operate-mode ergonomics with an architectural limestone rail, unified hairline KPI ribbons, Deep Pine sequential heatmaps, and zero leftover blue/slate token drift across all 11 admin routes and 8 admin modals/components.

**Tech Stack:** Nuxt 3.21 (`compatibilityVersion: 4`), Vue 3.5, `@nuxt/ui` v3 (Reka UI), Tailwind CSS v4 (`@theme`), `@nuxt/fonts` (`Bricolage Grotesque`, `Manrope`, `JetBrains Mono`), `vue-echarts` v8 + `echarts` v6, `motion-v` v2, Vitest.

## Global Constraints

- Single light daylight theme (`ui.colorMode: false` in `nuxt.config.ts`) — do NOT add `dark:*` classes or theme toggles.
- Zero invented commercial/statistical claims — every metric, ratio, gauge, and bar must be computed strictly from real `/api/public/overview`, `/api/public/articles`, and `/api/admin/*` payloads.
- Keep hero and above-the-fold copy visible at SSR byte 0 (never initialize above-the-fold elements at `opacity: 0`).
- Preserve WCAG 2.1 AA contrast (`>= 4.5:1` text, `>= 3:1` UI/chart strokes), keyboard `:focus-visible` outlines, deterministic IDs for Reka UI primitives (`USelectMenu`, `UModal`, `USlideover`), and `prefers-reduced-motion: reduce` support.
- Preserve all existing Vitest unit tests (`npm test`), especially `tests/pdrb-colors.test.ts` and `tests/public-ui-helpers.test.ts`.
- Data visualization series colors (`shared/utils/pdrb-colors.ts`) retain distinct semantic chroma for multi-sector readability, while **all UI chrome** (buttons, surfaces, borders, tabs, nav, inputs, heatmaps, active states) uses the unified Observatory token set (zero leftover `blue-*`, `indigo-*`, `slate-*`, `#0B57D0`, `#EFF6FF`).

---

## Visual World Specification ("Kaltara Daylight Atelier")

| Token / Role | Value | Usage |
|---|---|---|
| `--font-display` | `"Bricolage Grotesque", system-ui, sans-serif` | Editorial headlines, hero titles, section headings, phenomenon titles |
| `--font-sans` | `"Manrope", system-ui, sans-serif` | Body copy, UI labels, tables, buttons, filter controls |
| `--font-mono` | `"JetBrains Mono", ui-monospace, monospace` | Strictly tabular numeric KPIs, KBLI codes, timestamps, keyboard shortcuts |
| `--color-canvas` | `#F6F5F1` | Warm alabaster stone ground across Public & Admin |
| `--color-surface` | `#FFFFFF` | Clean focal cards, brief items, reading sheets, modals |
| `--color-surface-recessed` | `#ECEAE2` | Segmented control tracks, subtle table headers, sidebar rail tint |
| `--color-hairline` | `rgba(20, 25, 23, 0.08)` | Architectural dividers, open-canvas grid rules, subtle card edges |
| `--color-ink-primary` | `#141917` | Forest-tinted obsidian primary typography |
| `--color-ink-secondary` | `#4A524E` | Mineral charcoal secondary prose |
| `--color-ink-muted` | `#737B76` | Subtle captions, timestamps, metadata |
| `--color-brand-primary` | `#0B3D2E` | Deep Borneo Pine — committed field surfaces, primary CTAs, active indicators |
| `--color-brand-hover` | `#072B20` | Tactile hover depth for Deep Pine |
| `--color-brand-tint` | `#E3F0EA` | Soft botanical mist for active pills & positive real output tags |
| `--color-accent-copper` | `#C8553D` | Burnished Copper — editorial kickers, gap-0 alerts, contraction signals |
| `--color-accent-copper-tint` | `#FBECE8` | Soft terracotta mist for pressure/gap chips |
| `--color-accent-ochre` | `#B45309` | Warm Ochre — inflation/price-up signals & thin coverage (1–2 bukti) |

---

## File Structure Map

### Phase 1 — Design System & Tokens
- Modify: `nuxt.config.ts` (font families + `theme-color`)
- Modify: `app/assets/css/main.css` (Observatory `@theme` tokens, architectural hairline & button classes, fluid type helpers, clean print styles)
- Modify: `app/app.config.ts` (Nuxt UI v3 slot defaults for `card`, `button`, `modal`, `slideover`, `input`, `select`, `badge`)
- Modify: `app/utils/chart-theme.ts` (ECharts tokens & tooltip styling aligned with `Manrope` + Observatory palette)

### Phase 2 — Public Shell & Observatory Landing Page (`/`)
- Modify: `app/layouts/default.vue` (Full-width sticky architectural masthead + asymmetric 2-band footer)
- Create: `app/components/public/ObservatoryHeroPulse.vue` (Dark Deep Pine live quarterly momentum telemetry panel)
- Create: `app/components/public/SectorMosaicMatrix.vue` (Interactive 17-sector KBLI mosaic + 6-component expenditure proportion strip)
- Modify: `app/pages/index.vue` (Asymmetric editorial hero, Sector Mosaic, Lead+List phenomenon showcase, open-canvas 4-column methodology strip)

### Phase 3 — Public Fluid Signal Explorer (`/linimasa`) & Reading Sheet
- Create: `app/components/public/PublicFilterDock.vue` (Sticky horizontal command & filter dock with inline search, scope/impact pills, KBLI/Expenditure/Date popovers & deep-filter slideover trigger)
- Modify: `app/components/public/PublicFilterBar.vue` (Refined strictly for inside the deep-filter `USlideover` drawer)
- Modify: `app/components/public/PhenomenonFeedCard.vue` (Un-stiff Intelligence Signal Brief — removes `border-t-2` and gray footer box)
- Modify: `app/components/public/PublicArticleDetailModal.vue` (Upgraded to spacious right-side `USlideover` Executive Reading Sheet)
- Modify: `app/components/public/KpiSnapshotGrid.vue` (Hairline-divided open-canvas Executive KPI Ribbon)
- Modify: `app/components/public/SectorDistributionCharts.vue` (Refined Observatory ECharts cards)
- Modify: `app/pages/linimasa.vue` (Eliminates `lg:h-[calc(100vh-108px)]` inner scrollbox; full-page fluid flow with sticky `PublicFilterDock` and sticky left date gutter)

### Phase 4 — Auth & Admin Workstation Shell + Core Analytical Views
- Modify: `app/pages/login.vue` (Split architectural Observatory login screen)
- Modify: `app/layouts/admin.vue` (Architectural limestone rail + clean top command bar)
- Modify: `app/components/admin/CommandPaletteModal.vue` (Observatory tokens)
- Modify: `app/pages/admin/index.vue` (Hairline KPI ribbon, 17-sector Gap Detector mosaic, Deep Pine sequential heatmap)
- Modify: `app/pages/admin/trends.vue` (Observatory chart & comparative period header)
- Modify: `app/pages/admin/review.vue` & `app/components/admin/ReviewSlideover.vue` (High-velocity triage queue & editorial curation drawer)
- Modify: `app/pages/admin/synthesis.vue` & `app/components/admin/SynthesisSpans.vue` (Publication-grade BRS Narrative Studio)

### Phase 5 — Admin Data Bank, Governance Views & Verification Gate
- Modify: `app/pages/admin/articles.vue`
- Modify: `app/pages/admin/portals.vue`, `app/pages/admin/keywords.vue`, `app/pages/admin/taxonomy.vue`, `app/pages/admin/kbli.vue`, `app/pages/admin/scrapers.vue`, `app/pages/admin/users.vue`
- Modify: `app/components/admin/ManualArticleModal.vue`, `KeywordFormModal.vue`, `UserFormModal.vue`, `UserPasswordModal.vue`, `ScraperLogTable.vue`

---

## Detailed Task Breakdown

### Task 1: Observatory Design System Foundation (Fonts, Tokens, Nuxt UI Slots & ECharts Theme)

**Files:**
- Modify: `nuxt.config.ts:17-24`, `nuxt.config.ts:98-102`
- Modify: `app/assets/css/main.css`
- Modify: `app/app.config.ts`
- Modify: `app/utils/chart-theme.ts`

**Interfaces:**
- Produces: CSS custom properties (`--font-display`, `--font-sans`, `--font-mono`, `--color-canvas`, `--color-surface`, `--color-surface-recessed`, `--color-hairline`, `--color-ink-primary`, `--color-ink-secondary`, `--color-ink-muted`, `--color-brand-primary`, `--color-brand-hover`, `--color-brand-tint`, `--color-accent-copper`, `--color-accent-copper-tint`, `--color-accent-ochre`), `.obs-panel`, `.obs-panel-dark`, `.obs-hairline-grid`, `.obs-btn-primary`, `.obs-btn-ghost`, and updated `SIPENA_CHART_TOKENS`.

- [ ] **Step 1: Update font families and theme-color in `nuxt.config.ts`**

Replace `Plus Jakarta Sans` + `Inter` with `Bricolage Grotesque` + `Manrope` + `JetBrains Mono` in `nuxt.config.ts`:

```ts
  fonts: {
    families: [
      { name: 'Bricolage Grotesque', provider: 'google', weights: [500, 600, 700, 800] },
      { name: 'Manrope', provider: 'google', weights: [400, 500, 600, 700, 800] },
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 600] },
    ],
  },
```

And update `<meta name="theme-color">` from `#1d4ed8` to `#0B3D2E`.

- [ ] **Step 2: Author Observatory `@theme` tokens and utility classes in `app/assets/css/main.css`**

Define the architectural daylight tokens, fluid typographic tracking, `.obs-panel`, `.obs-panel-dark`, `.obs-btn-primary`, `.obs-btn-ghost`, preserve backward-compatible `.saas-card` and `.btn-primary-gradient` aliases (remapped to the refined Observatory tokens so nothing breaks mid-migration), and replace the legacy blue `.timeline-spine::before` gradient with `#0B3D2E` / `#D8D4C9`.

```css
@theme {
  --font-display: "Bricolage Grotesque", system-ui, sans-serif;
  --font-sans: "Manrope", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

  --color-canvas: #F6F5F1;
  --color-surface: #FFFFFF;
  --color-surface-elevated: #FFFFFF;
  --color-surface-subtle: #ECEAE2;
  --color-surface-recessed: #F0EFE9;
  --color-border-hairline: rgba(20, 25, 23, 0.09);
  --color-ink-obsidian: #141917;
  --color-ink-primary: #141917;
  --color-ink-secondary: #4A524E;
  --color-ink-muted: #737B76;
  --color-brand-primary: #0B3D2E;
  --color-brand-hover: #072B20;
  --color-brand-tint: #E3F0EA;
  --color-brand-border: #BBD8CB;
  --color-brand-emerald: #0B3D2E;
  --color-brand-teal: #0F766E;
  --color-brand-terracotta: #C8553D;
  --color-terracotta-tint: #FBECE8;
  --color-accent-ochre: #B45309;
}
```

- [ ] **Step 3: Configure Nuxt UI v3 global slot styling in `app/app.config.ts`**

Ensure `UModal`, `USlideover`, `UCard`, `UInput`, `USelect`, and `UPagination` inherit `#F6F5F1` / `#FFFFFF` / `rgba(20,25,23,0.09)` / `#0B3D2E` consistently so stock components never clash with the Observatory world.

- [ ] **Step 4: Align `app/utils/chart-theme.ts`**

Update `SIPENA_CHART_TOKENS` hex values (`inkObsidian: '#141917'`, `cobalt: '#0B3D2E'`, `rose: '#C8553D'`, `surfaceMuted: '#F6F5F1'`, `borderHairline: '#E2DFD7'`) and set `SIPENA_CHART_TOOLTIP_STYLE.textStyle.fontFamily` to `'Manrope, system-ui, sans-serif'`.

- [ ] **Step 5: Verify compilation & tests**

Run: `npm run typecheck` and `npm test`
Expected: Zero TypeScript errors, all existing Vitest suites PASS.

- [ ] **Step 6: Commit**

```bash
git add nuxt.config.ts app/assets/css/main.css app/app.config.ts app/utils/chart-theme.ts
git commit -m "feat(design-system): establish Kaltara Daylight Atelier typography and observatory tokens"
```

---

### Task 2: Public Architectural Shell (`app/layouts/default.vue`)

**Files:**
- Modify: `app/layouts/default.vue`

**Interfaces:**
- Consumes: `useAdminSession()`, `usePublicPortalState()`, `usePlatformShortcut()`.
- Produces: Full-width sticky architectural masthead (`h-16 bg-[#F6F5F1]/85 backdrop-blur-xl border-b border-[#141917]/[0.08]`) and asymmetric 2-band institutional footer.

- [ ] **Step 1: Replace floating boxed header with Full-Width Architectural Masthead**

Remove the outer `px-3 pt-3` rounded card wrapper around `<header>`. Render a crisp edge-to-edge sticky masthead with:
- Left: Minimalist typographic brand lockup (`SIPENA KTT` in `Bricolage Grotesque` bold + subtle `BPS Kab. Tana Tidung` hairline divider label, removing chunky rounded square icon box cliché).
- Center: Clean text-only navigation (`Ikhtisar`, `Eksplorasi Fenomena`, `Metodologi`) with crisp bottom hairline or subtle pine dot indicator for active route.
- Right: Active period monospace pill (`TW IV 2026`), compact quick-search trigger button on `/linimasa` (`⌘K` / `/`), and refined Deep Pine `Workstation →` button.
- Mobile drawer (`USlideover`): Styled cleanly with `#F6F5F1` ground and `#0B3D2E` active links.

- [ ] **Step 2: Upgrade footer to Asymmetric 2-Band Observatory Footer**

Left column: Editorial colophon describing SIPENA KTT as an open economic phenomena observatory by Fungsi Nerwilis BPS Kabupaten Tana Tidung (WITA UTC+8). Right column: Structured navigation links + Workstation entry.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/layouts/default.vue
git commit -m "feat(ui): redesign public masthead and architectural footer"
```

---

### Task 3: Public Landing Page (`/`) — Economic Phenomena Observatory

**Files:**
- Create: `app/components/public/ObservatoryHeroPulse.vue`
- Create: `app/components/public/SectorMosaicMatrix.vue`
- Modify: `app/pages/index.vue`

**Interfaces:**
- `ObservatoryHeroPulse.vue` props: `overview: PublicOverviewResponse | null`, `periodLabel: string`, `coveredSectorsCount: number`, `snapshotYear: number`, `snapshotQuarter: number`.
- `SectorMosaicMatrix.vue` props: `overview: PublicOverviewResponse | null`, `snapshotYear: number`, `snapshotQuarter: number`, `periodLabel: string`.
- Consumes: `usePdrbLabels()`, `formatDateId`, `toRomanQuarter`.

- [ ] **Step 1: Create `app/components/public/ObservatoryHeroPulse.vue`**

Build the signature **Dark Deep Borneo Pine (`#0B3D2E`) Live Telemetry Anchor Panel** that sits on the right side of the asymmetric hero:
- Header strip: `DENYUT EKONOMI TRIWULAN` + `{{ periodLabel }}` live pill.
- Hero figure: Total curated phenomena (`tabular-nums font-display text-4xl text-white`) + semantic delta badge vs previous quarter.
- **Real Momentum Balance Bar** (computed strictly from `overview.kpi.expansionStats` and `overview.kpi.impactBreakdown.kbli`): visual horizontal split showing `% Ekspansi Riil` (botanical emerald `#34D399`) vs `% Tekanan Harga & Kontraksi` (burnished copper `#F08A73`), with exact counts underneath.
- Two hairline-divided typographic rows inside the dark panel:
  - `Sektor Penggerak Utama`: Dominant KBLI code + name + share percentage.
  - `Pendorong Permintaan`: Dominant Expenditure component + share percentage.
- Footer link: `Telusuri sektor dominan di Eksplorasi →` linking to `/linimasa?year=...&quarter=...&pdrbGroup=...`.

- [ ] **Step 2: Create `app/components/public/SectorMosaicMatrix.vue`**

Build the open-canvas **17-Sector KBLI Interactive Mosaic** paired with the **6-Component Expenditure & Source Transmission Strip**:
- Top controls: Title (`Peta Denyut 17 Lapangan Usaha`) + interactive filter pills (`Semua (17)`, `Terpantau (X)`, `Senyap / Gap 0 (Y)`).
- Left (8 cols): Responsive CSS Grid (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5`) of architectural sector tiles:
  - Strong coverage (`>= 5` or dominant): soft pine tint `#E3F0EA` with `#0B3D2E` bold code & count.
  - Moderate (`3–4`): crisp `#FFFFFF` tile with subtle hairline border and `#141917` typography.
  - Thin (`1–2`): subtle ochre tint `#FEF7E6` border `#F3D89C`.
  - Gap (`0`): subtle recessed `#F6F5F1` dashed copper border `border-dashed border-[#C8553D]/45` with `0` muted copper count.
  - Every tile is a `<NuxtLink>` directly to `/linimasa?year=...&quarter=...&pdrbGroup=<groupCode>`.
- Right (4 cols): Open-canvas **Sisi Pengeluaran PDRB** horizontal proportional bars (all 6 components sorted by count) + **Transmisi Sumber** bar (`Portal Lokal Kaltara` vs `Kebijakan Nasional`), separated by hairline rules (no nested white cards!).

- [ ] **Step 3: Rebuild `app/pages/index.vue` with Asymmetric Editorial Architecture**

Compose the landing page in 5 fluid architectural bands:
1. **Asymmetric Split Hero (`lg:grid-cols-12 gap-10 items-center`)**: Left-aligned `Bricolage Grotesque` headline (`clamp(2.25rem, 4.4vw, 3.6rem)`), copper uppercase kicker (`OBSERVATORIUM FENOMENA EKONOMI • KAB. TANA TIDUNG`), clear thesis paragraph, Deep Pine primary button (`Eksplorasi Fenomena`) + ghost link (`Cara Kerja`), paired with `<PublicObservatoryHeroPulse />` on the right 5 columns.
2. **Interactive Sector Mosaic Band**: `<PublicSectorMosaicMatrix />` separated by a clean full-bleed hairline divider.
3. **Asymmetric Curated Highlights ("Sorotan Fenomena Terkini")**:
   - First article renders as a **Lead Editorial Feature Brief (`lg:col-span-7`)** with generous padding, prominent headline, complete summary excerpt, kecamatan locus, and dual-axis PDRB impact badges.
   - Articles 2 & 3 render as **Stacked Typographic Brief Rows (`lg:col-span-5`)** separated by crisp hairlines — clicking any brief opens `<PublicArticleDetailModal />` (upgraded to Reading Sheet in Task 5).
4. **Open-Canvas Methodology Strip (`#cara-kerja`)**: 4 horizontal numbered typographic columns (`01`–`04`) divided by vertical hairlines (NO gray rounded boxes!).
5. **Minimalist Deep Pine Closing Band**: Compact high-contrast invitation to explore `/linimasa`.

- [ ] **Step 4: Verify typecheck & tests**

Run: `npm run typecheck` and `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/public/ObservatoryHeroPulse.vue app/components/public/SectorMosaicMatrix.vue app/pages/index.vue
git commit -m "feat(public): redesign landing page into asymmetric economic observatory"
```

---

### Task 4: Public Sticky Command & Filter Dock (`PublicFilterDock.vue` & `PublicFilterBar.vue`)

**Files:**
- Create: `app/components/public/PublicFilterDock.vue`
- Modify: `app/components/public/PublicFilterBar.vue`

**Interfaces:**
- `PublicFilterDock.vue` props: `overview: PublicOverviewResponse | null`, `sourceType: string`, `pdrbGroups: string[]`, `expenditures: string[]`, `impactMacro: string`, `dateFrom: string`, `dateTo: string`, `activeFilterCount: number`.
- `PublicFilterDock.vue` emits: `update:sourceType`, `update:pdrbGroups`, `update:expenditures`, `update:impactMacro`, `update:dateFrom`, `update:dateTo`, `openDrawer`, `reset`.

- [ ] **Step 1: Create `app/components/public/PublicFilterDock.vue`**

Build a sleek, non-stiff horizontal sticky bar (`sticky top-16 z-30 bg-[#F6F5F1]/92 backdrop-blur-xl border-y border-[#141917]/[0.08] py-3`) replacing the bulky permanent desktop sidebar:
- Row 1 (Primary bar):
  - Wide search input (`flex-1 min-w-[220px]`) bound to `searchInput` from `usePublicPortalState()`, with clear `×` button and `/` shortcut hint.
  - Segmented Cakupan Sumber pill (`Semua` | `Lokal` | `Nasional`).
  - Quick Popover trigger for **Sektor KBLI** (`17 Sektor` + count badge when selected) containing searchable multi-select sector list.
  - Quick Popover trigger for **Pengeluaran** (`6 Komponen` + count badge when selected).
  - Trigger button **Filter Lanjutan** (opens `USlideover` containing `PublicFilterBar` for date range presets & full multi-filter control, especially helpful on mobile/tablet).
- Row 2 (Compact signal direction strip):
  - 4 refined pill toggles for **Arah Sinyal Ekonomi**: `Semua Sinyal`, `↗ Aktivitas Naik`, `↘ Aktivitas Turun`, `↑ Harga Naik`, `↓ Harga Turun` — letting analysts slice macroeconomic pressure in one click!

- [ ] **Step 2: Refine `app/components/public/PublicFilterBar.vue` for Slideover Drawer mode**

Simplify `PublicFilterBar.vue` to focus cleanly on the full-height `USlideover` drawer context with Observatory tokens (`#F6F5F1`, `#0B3D2E`, `#141917`), explicit deterministic `id` attributes for WCAG accessibility, and zero leftover slate/blue classes.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/components/public/PublicFilterDock.vue app/components/public/PublicFilterBar.vue
git commit -m "feat(public): add fluid horizontal command and filter dock for signal explorer"
```

---

### Task 5: Intelligence Signal Brief Card (`PhenomenonFeedCard.vue`) & Executive Reading Sheet (`PublicArticleDetailModal.vue`)

**Files:**
- Modify: `app/components/public/PhenomenonFeedCard.vue`
- Modify: `app/components/public/PublicArticleDetailModal.vue`

**Interfaces:**
- `PhenomenonFeedCard.vue` keeps exact existing props `{ article: PublicArticleItem }` and emits `{ select: [article: PublicArticleItem] }`.
- `PublicArticleDetailModal.vue` keeps exact existing props `{ open: boolean; article: PublicArticleItem | null }` and emits `{ 'update:open': [value: boolean] }` (so all callers in `index.vue` and `linimasa.vue` work seamlessly without breaking contracts!).

- [ ] **Step 1: Redesign `app/components/public/PhenomenonFeedCard.vue`**

Strip away the stiff bureaucratic card clichés:
- **Remove** the thick colored `border-t-2` top bar and heavy gray `-mx-6 bg-[#FAF9F7]` footer box.
- Use a light, elevated editorial brief surface (`bg-white rounded-2xl border border-[#141917]/[0.08] hover:border-[#0B3D2E]/35 hover:shadow-[0_12px_32px_-12px_rgba(11,61,46,0.12)] transition-all duration-200 p-5 sm:p-6`).
- **Top Metadata Line** (restrained, scannable): Source portal link (plain crisp text with subtle external arrow, NOT a bulky bordered pill), subtle geographic scope dot + label, Kecamatan pin badge (if present), WITA timestamp, and quiet copy-citation button (`opacity-70 group-hover:opacity-100`).
- **Editorial Body**: Expressive `Bricolage Grotesque` headline (`text-lg sm:text-[19px] font-bold tracking-tight text-[#141917] group-hover:text-[#0B3D2E]`), followed by clean 2–3 line economic synopsis in `Manrope` (`text-[13.5px] sm:text-sm text-[#4A524E] leading-relaxed`).
- **Bottom Inline Dual-Axis Signal Strip** (separated by thin `border-t border-[#141917]/[0.06] pt-3.5 mt-4`):
  - Flex/grid layout placing **Produksi (KBLI)** and **Pengeluaran PDRB** cleanly side-by-side without enclosing boxes, each showing a crisp colored dot + sector/component label + semantic impact pill (`↗ Aktivitas Naik`, `↑ Harga Naik`, etc.), plus subtle inline `Konversi KBLI` popover button.
  - Secondary linkages render as a compact muted line below only when `secondaryKbliCategory || secondaryExpenditureComponent` is non-null.

- [ ] **Step 2: Upgrade `app/components/public/PublicArticleDetailModal.vue` to Executive Reading Sheet (`USlideover`)**

Replace `<UModal>` with `<USlideover side="right" :ui="{ content: 'sm:max-w-2xl bg-[#F6F5F1]' }">` so clicking any phenomenon glides open a spacious, magazine-grade **Executive Economic Brief Sheet**:
- Clean sticky sheet header with period badge (`TW IV 2026`), source portal, Nerwilis Verified stamp, and close button.
- Expressive `Bricolage Grotesque` headline + publication metadata + Kecamatan locus.
- Highlighted **Intisari Fenomena Ekonomi** editorial callout block (white surface with subtle left pine accent hairline).
- Clean 2-column **Pemetaan Dua Sisi PDRB** breakdown (Produksi vs Pengeluaran) with official descriptions and impact directions.
- Collapsible/clean **Jembatan Konkordansi KBLI 4-Generasi (2009–2025)** timeline table.
- Sticky bottom action footer: `Salin Tautan`, `Buka Berita Asli ↗`, and Deep Pine `Salin Format Sitasi BPS`.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/components/public/PhenomenonFeedCard.vue app/components/public/PublicArticleDetailModal.vue
git commit -m "feat(public): redesign phenomenon brief card and slideover executive reading sheet"
```

---

### Task 6: Public Fluid Signal Explorer (`/linimasa`) + KPI Ribbon + Charts

**Files:**
- Modify: `app/components/public/KpiSnapshotGrid.vue`
- Modify: `app/components/public/SectorDistributionCharts.vue`
- Modify: `app/pages/linimasa.vue`

**Interfaces:**
- Consumes: `PublicFilterDock`, `PublicFilterBar`, `PhenomenonFeedCard`, `PublicArticleDetailModal`, `KpiSnapshotGrid`, `SectorDistributionCharts`.
- Preserves all URL query param sync (`year`, `quarter`, `q`, `pdrbGroup`, `expenditure`, `sourceType`, `impactMacro`, `from`, `to`, `view`, `page`).

- [ ] **Step 1: Redesign `app/components/public/KpiSnapshotGrid.vue` as Hairline-Divided Executive KPI Ribbon**

Replace 4 separate generic rounded boxes with a unified, single architectural white strip (`bg-white rounded-2xl border border-[#141917]/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#141917]/[0.07]`) displaying the 4 real KPIs with crisp `Bricolage Grotesque` figures, subtle micro-labels, and zero decorative icon boxes.

- [ ] **Step 2: Refine `app/components/public/SectorDistributionCharts.vue`**

Flatten header chrome (remove heavy tinted header bars and icon squares), use clean typographic chart titles with generous padding, Observatory active filter chips (`#0B3D2E`), and maintain `<ClientOnly>` + deterministic `h-64` container height for zero CLS.

- [ ] **Step 3: Rebuild `app/pages/linimasa.vue` with Fluid Open-Canvas Architecture**

- **Remove** the entire `lg:grid-cols-[310px_minmax(0,1fr)] lg:h-[calc(100vh-108px)] overflow-hidden` claustrophobic boxed layout!
- **Top Open-Canvas Editorial Header**: Left-aligned `Bricolage Grotesque` title (`Eksplorasi Fenomena Ekonomi`), active period summary, right-aligned **Unified Period Pill** (Year + Q1–Q4), **Statistik** toggle button, and **Mode Switcher (`Linimasa` | `Tabel`)**.
- **Collapsible Analytics Drawer/Section**: Smoothly shows `<PublicKpiSnapshotGrid />` + `<PublicSectorDistributionCharts />` directly below header when toggled.
- **Sticky Horizontal `<PublicFilterDock />`**: Full-width sticky filter bar + dismissible active filter chips directly below.
- **Main Natural-Scroll Signal Stream**:
  - Grouped by date using an elegant **asymmetric 2-column magazine layout on desktop** (`md:grid md:grid-cols-[120px_minmax(0,1fr)] gap-6 items-start`):
    - Left column (`md:sticky md:top-40`): Crisp oversized day numeral (`text-3xl font-display font-bold text-[#141917] tabular-nums`), month/year caption, and phenomenon count (`3 sinyal`) — completely replacing the stiff green box + vertical blue line!
    - Right column: Clean vertical stack (`space-y-4`) of `<PublicPhenomenonFeedCard />`.
- **Mode Tabel Ringkas**: Clean architectural open table (`bg-white rounded-2xl border border-[#141917]/[0.08]`) with `tabular-nums`, hover tint `#F6F5F1`, and click-to-open Reading Sheet.
- **Bottom Pagination & Methodology Colophon**: Centered clean pagination + restrained editorial colophon.

- [ ] **Step 4: Verify typecheck & tests**

Run: `npm run typecheck` and `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/public/KpiSnapshotGrid.vue app/components/public/SectorDistributionCharts.vue app/pages/linimasa.vue
git commit -m "feat(public): overhaul linimasa into fluid open-canvas signal explorer"
```

---

### Task 7: Split Architectural Login (`/login`) & Unified Admin Workstation Shell (`admin.vue`)

**Files:**
- Modify: `app/pages/login.vue`
- Modify: `app/layouts/admin.vue`
- Modify: `app/components/admin/CommandPaletteModal.vue`

**Interfaces:**
- Preserves all OAuth error codes (`OAUTH_ERROR_MAP`), Google OAuth redirect, local email/password login validation (`LoginRequestSchema`), and admin session/period composables.

- [ ] **Step 1: Redesign `app/pages/login.vue` into Split Architectural Observatory Screen**

- Desktop (`lg:grid lg:grid-cols-12 min-h-screen`):
  - Left 5 columns: Committed **Deep Borneo Pine (`#0B3D2E`) Editorial Manifesto Panel** — subtle geometric architectural line grid background, SIPENA KTT lockup, concise statement on human-in-the-loop economic curation for BPS Kab. Tana Tidung, and 3 clean factual capabilities (`17 Sektor KBLI 2025`, `6 Komponen Pengeluaran`, `Sinkronisasi WITA UTC+8`).
  - Right 7 columns: Airy `#F6F5F1` canvas with crisp white auth card, prominent email/password form + Google OAuth whitelist option, clear OAuth alert banners, and `← Kembali ke Observatorium Publik` link.

- [ ] **Step 2: Refine `app/layouts/admin.vue` (Operate-Mode Architectural Rail)**

- Sidebar Rail (`bg-[#F0EFE9]/80 border-r border-[#141917]/[0.08]`): Crisp group headings in `#737B76`, active nav item in Deep Pine `#0B3D2E` with crisp white icon/text, subtle hover tint `bg-white/70`, clean collapse toggle, profile card with zero leftover slate/blue classes.
- Top Command Bar (`bg-[#F6F5F1]/90 backdrop-blur-xl border-b border-[#141917]/[0.08]`): Breadcrumb section + page title in `Bricolage Grotesque`, sleek Global Period Switcher Pill (Year + TW I–IV), `⌘K` Command Palette trigger button, and mobile drawer toggle.
- Audit every line in `admin.vue` to ensure `0` occurrences of `blue-*`, `slate-*`, `indigo-*`.

- [ ] **Step 3: Harmonize `app/components/admin/CommandPaletteModal.vue`**

Replace all 19 `slate-*` / `blue-*` classes with Observatory tokens (`#141917`, `#4A524E`, `#0B3D2E`, `#E3F0EA`, `#F6F5F1`).

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pages/login.vue app/layouts/admin.vue app/components/admin/CommandPaletteModal.vue
git commit -m "feat(admin): redesign login screen and unified observatory admin shell"
```

---

### Task 8: Admin Executive Dashboard (`/admin`) & Multi-Quarter Trends (`/admin/trends`)

**Files:**
- Modify: `app/pages/admin/index.vue`
- Modify: `app/pages/admin/trends.vue`

**Interfaces:**
- Consumes: `/api/admin/analytics/dashboard`, `/api/admin/analytics/trends`, `useAdminPeriod`, `useExcelExport`, `SIPENA_CHART_TOKENS`.

- [ ] **Step 1: Overhaul `app/pages/admin/index.vue`**

- Replace legacy blue heatmap cell helper (`heatmapCellClass`) with calibrated **Deep Borneo Pine sequential scale**:
  - `0`: `bg-[#F6F5F1] text-[#B5B9B4]`
  - `1–2`: `bg-[#E3F0EA] text-[#0B3D2E] border border-[#BBD8CB] hover:bg-[#D2E6DC] font-semibold`
  - `3–5`: `bg-[#6EA892]/35 text-[#072B20] border border-[#6EA892]/60 hover:bg-[#6EA892]/50 font-bold`
  - `>= 6`: `bg-[#0B3D2E] text-white font-bold shadow-2xs hover:bg-[#072B20]`
- Upgrade top KPI cards into a unified **Hairline-Divided Executive Metric Ribbon** (`Total Terverifikasi`, `Cakupan Sektor`, `Antrean Kurasi`, `Rasio Ekspansi Riil`).
- Upgrade **17-Sector Gap Detector Mosaic**: Clear visual differentiation between Strong (Deep Pine tint), Thin 1–2 (Ochre tint), and Gap 0 (Burnished Copper dashed border with tactile `+ Tambah Bukti` CTA that opens `ManualArticleModal` pre-filled with that sector!).
- Update ECharts donut/bar font family to `Manrope` and purge all 36 `slate-*` / `blue-*` remnants.

- [ ] **Step 2: Overhaul `app/pages/admin/trends.vue`**

- Align Net Balance Index & Multi-Quarter comparative charts to Observatory palette (`#0B3D2E` expansion, `#C8553D` contraction/pressure, `#B45309` inflation).
- Flatten nested card wrappers, refine period comparison controls, and purge all 87 `slate-*` / `blue-*` / `indigo-*` classes.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/pages/admin/index.vue app/pages/admin/trends.vue
git commit -m "feat(admin): redesign executive gap dashboard and multi-quarter trends view"
```

---

### Task 9: Admin High-Velocity Curation Queue (`/admin/review`) & BRS Narrative Studio (`/admin/synthesis`)

**Files:**
- Modify: `app/pages/admin/review.vue`
- Modify: `app/components/admin/ReviewSlideover.vue`
- Modify: `app/pages/admin/synthesis.vue`
- Modify: `app/components/admin/SynthesisSpans.vue`

**Interfaces:**
- Preserves all curation API mutations (`PATCH /api/admin/articles/:id`, `POST /api/admin/articles/batch`), keyboard shortcuts, snippet highlighting (`parseEconomicSnippetSegments`), and BRS synthesis generation/DOCX export.

- [ ] **Step 1: Refine `app/pages/admin/review.vue` & `app/components/admin/ReviewSlideover.vue`**

- Clean architectural triage bar: segmented status tabs (`Pending`, `Terverifikasi`, `Diabaikan`) with tabular counters, period toggle, `LLM Gagal` filter chip, inline search, and floating Deep Pine batch action bar when checkboxes are selected.
- Un-clutter article rows: clean typography, crisp highlighted economic snippets (`#E3F0EA` highlight instead of jarring blue), AI provider provenance badges, and smooth click-to-open `ReviewSlideover`.
- Align `ReviewSlideover.vue` form sections, dual-axis PDRB selectors, and sticky save/verify/ignore action bar to Observatory tokens.
- Purge all 78+ remnants in `review.vue` and 18+ in `ReviewSlideover.vue`.

- [ ] **Step 2: Upgrade `app/pages/admin/synthesis.vue` & `app/components/admin/SynthesisSpans.vue`**

- Elevate the BRS synthesis canvas into an authentic **Editorial Publication Studio**:
  - Left/top control rail for generating or switching saved drafts + one-click Export DOCX / Print A4.
  - Main editorial paper sheet (`synthesis-print-sheet bg-white rounded-2xl border border-[#141917]/[0.08] p-8 sm:p-10`) with generous reading measure (`max-w-3xl`), crisp `Bricolage Grotesque` headings, and interactive citation spans (`SynthesisSpans.vue`) highlighted in soft botanical mist `#E3F0EA` instead of raw blue!
- Purge all 85+ remnants in `synthesis.vue` and 5+ in `SynthesisSpans.vue`.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/pages/admin/review.vue app/components/admin/ReviewSlideover.vue app/pages/admin/synthesis.vue app/components/admin/SynthesisSpans.vue
git commit -m "feat(admin): upgrade curation triage workflow and BRS synthesis studio"
```

---

### Task 10: Admin Data Bank, Governance Views & All Remaining Modals

**Files:**
- Modify: `app/pages/admin/articles.vue`
- Modify: `app/pages/admin/portals.vue`
- Modify: `app/pages/admin/keywords.vue`
- Modify: `app/pages/admin/taxonomy.vue`
- Modify: `app/pages/admin/kbli.vue`
- Modify: `app/pages/admin/scrapers.vue`
- Modify: `app/pages/admin/users.vue`
- Modify: `app/components/admin/ManualArticleModal.vue`
- Modify: `app/components/admin/KeywordFormModal.vue`
- Modify: `app/components/admin/UserFormModal.vue`
- Modify: `app/components/admin/UserPasswordModal.vue`
- Modify: `app/components/admin/ScraperLogTable.vue`
- Modify: `app/components/shared/AppChart.vue`

- [ ] **Step 1: Unify Data Bank (`articles.vue`) & Scraper Monitor (`scrapers.vue` + `ScraperLogTable.vue`)**

Apply consistent Observatory table headers (`bg-[#F0EFE9] text-[#4A524E]`), hairline row dividers (`divide-[#141917]/[0.06]`), `tabular-nums`, Deep Pine active filter pills, and refined status indicators across `articles.vue`, `scrapers.vue`, and `ScraperLogTable.vue`.

- [ ] **Step 2: Unify Taxonomy & Source Governance (`portals.vue`, `keywords.vue`, `taxonomy.vue`, `kbli.vue`, `users.vue`)**

Apply unified page header typography (`Bricolage Grotesque`), clean card/table surfaces, consistent primary/secondary button hierarchy, and purge all remaining `slate-*`, `blue-*`, `indigo-*` classes.

- [ ] **Step 3: Unify Admin Modals & Shared Chart Wrapper (`ManualArticleModal`, `KeywordFormModal`, `UserFormModal`, `UserPasswordModal`, `AppChart`)**

Align modal headers, form labels, loading skeletons (`#ECEAE2`), and empty states (`AppChart.vue`) to Observatory tokens.

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pages/admin/ app/components/admin/ app/components/shared/AppChart.vue
git commit -m "feat(admin): unify data bank, governance pages, and modals to observatory design system"
```

---

### Task 11: Full Quality Audit, Verification Gate & Staging Deploy Readiness

**Files:**
- Verify across entire `app/` directory.

- [ ] **Step 1: Run Automated Stale-Palette Drift Audit**

Run:
```powershell
Select-String -Path "app\**\*.vue", "app\**\*.ts" -Pattern "(slate-|blue-|indigo-|#0B57D0|#EFF6FF)" | Group-Object Path | Select-Object Count, Name
```
Expected: `0` matches across UI chrome in `app/` (only deliberate semantic data colors like `sky-` for `Harga Turun` if used).

- [ ] **Step 2: Run TypeScript Check & Full Vitest Suite**

Run:
```powershell
npm run typecheck
npm test
```
Expected: Typecheck exits `0`; all 20 Vitest suites PASS.

- [ ] **Step 3: Run Production Build**

Run:
```powershell
npm run build
```
Expected: `✨ Build complete!` with zero Rollup/Nitro errors.

- [ ] **Step 4: Visual Responsive Verification Checklist**

Verify rendered screens across `375px` (mobile), `768px` (tablet), `1280px` & `1440px` (desktop):
- `/` — Asymmetric Hero + Dark Deep Pine Pulse Panel visible above fold at byte 0; 17-sector mosaic clickable & responsive; asymmetric highlights; open methodology strip.
- `/linimasa` — Zero inner scrollbox; sticky horizontal filter dock functional; sticky date gutter aligned; clicking any brief opens spacious right-side Reading Sheet (`USlideover`).
- `/login` — Split architectural screen clean on desktop and stacks gracefully on mobile.
- `/admin`, `/admin/review`, `/admin/trends`, `/admin/synthesis`, `/admin/articles` — Cohesive Operate-mode rail, Deep Pine heatmap, zero blue/slate remnants.

- [ ] **Step 5: Push & Redeploy to Staging VPS (upon user approval)**

```bash
git push origin staging
ssh admin.biznet@103.58.100.169 "cd /var/www/sipena-ktt-staging && bash deploy/redeploy-staging-vps.sh"
```
