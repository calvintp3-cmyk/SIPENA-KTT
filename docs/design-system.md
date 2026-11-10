# UI/UX Design System Specification & Ergonomic Guidelines
## SIPENA-KTT (Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung)
**Document Version:** 2.0.0  
**Creative North Star:** Civic Statistical Ledger  
**Design Standard:** Anti-Slop SaaS Workstation, Dual-Theme Daylight/Obsidian, BPS Official Identity  
**Primary Persona:** Statistician & National Account Analyst (BPS Kabupaten Tana Tidung `65.04` / Nerwilis)  

> Normative tokens and machine-readable specifications live in [`DESIGN.md`](../DESIGN.md) and [`.impeccable/design.json`](../.impeccable/design.json).

---

## 1. Design Philosophy: Civic Statistical Ledger

AI-generated dashboards frequently collapse into distracting tropes:
- Blue-to-purple gradients and blurred aurora orbs.
- Excessive glassmorphism hiding contrast behind frosted cards.
- Uniform pill-shaped chrome (`rounded-full`) on inputs, badges, and buttons.
- Equal-weight 4-box metric rows with invented statistics or trending percentages.
- Forced pitch-black themes for bright daytime government workstations.

### SIPENA-KTT Guiding Principles:
1. **Daylight-First Authority, Overtime Comfort**: Institutional statistical work predominantly runs during daytime office hours (`08:00-17:00 WITA`), while quarterly reconciliation sprints extend into the evening. The workspace defaults to crisp Daylight surfaces (`#f4f6fa` canvas, `#ffffff` analytical paper) anchored by a Sovereign BPS Maritime Navy navigation rail (`#0a2540`), with a persistent, synchronized Dark Mode toggle (`sipena-theme=dark` over obsidian `#080d16` / `#101827`).
2. **Sovereign Structural Asymmetry**: Modules use purposeful `7/5` grids built around actual analytical decisions rather than uniform 4-card rows: Quarterly Backlog Focus alongside Archive Coverage (`Overview`), 17-sector KBLI Ranking alongside Expenditure Transmission (`Sector Distribution`), and Export Workbench alongside 3-sheet Workbook Spec (`Export Center`).
3. **Tabular Precision & Scannability**: Compact `44px`-oriented rows, strict `tabular-nums` alignment (`JetBrains Mono`), and calm neutral KBLI badges with index swatch tiles keep dense regional economic reviews calm and fast.
4. **Evidence Next to Judgment**: Every review opens in a top-layer native `<dialog>` slide-over drawer (`max-w-5xl`) placing extracted Indonesian regional journalism beside editable BPS KBLI 2025 classification controls and forensic audit history.
5. **Authentic Regional Context**: Reflects real Kabupaten Tana Tidung (`65.04`) drivers: palm oil (CPO/TBS), coal mining, coastal aquaculture, Sebawang governance infrastructure, municipal APBD disbursement, and Sesayap river logistics. Zero invented numbers or placeholder personas.

---

## 2. Color Palette & Semantic Tokens (`src/app/globals.css`)

### 2.1 Surface & Ink Hierarchy (Dual Theme, WCAG 2.1 AA Verified)
| Token | Light Mode (`:root`) | Dark Mode (`:root.dark`) | Application |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#f4f6fa` | `#080d16` | Root application viewport canvas |
| `--bg-rail` | `#0a2540` | `#0b1220` | Persistent left sidebar navigation & auth banner |
| `--bg-surface` | `#ffffff` | `#101827` | Cards, curation data table, modals, review drawer |
| `--bg-subtle` | `#f8fafc` | `#0c1320` | Sticky table headers, form inputs, article reading pane |
| `--bg-hover` | `#eff4f9` | `#172236` | Interactive row hover, ghost button hover |
| `--text-primary` | `#0f172a` | `#f8fafc` | Primary numbers, article titles, active labels |
| `--text-secondary` | `#334155` | `#cbd5e1` | Summaries, body prose, input values |
| `--text-muted` | `#526075` | `#94a3b8` | Metadata timestamps, subtitles, taxonomy hints |
| `--border-subtle` | `#dce3ec` | `#1e293b` | `1px` structural panel seams and row dividers |
| `--border-strong` | `#94a3b8` | `#475569` | Input outlines, control borders, active seams |

### 2.2 Brand Accent & Economic Indicator Semantics
| Token / Role | Light Mode | Dark Mode | Purpose |
| :--- | :--- | :--- | :--- |
| `--accent-primary` | `#0369a1` (`5.95:1` vs white) | `#0369a1` / text `#38bdf8` | Primary actions, active navigation focus, export CTA |
| `--accent-hover` | `#075985` | `#0284c7` | Button hover elevation |
| **Approved / Positif** | `#047857` / `#ecfdf5` | `#34d399` / `emerald-500/15` | Verified phenomena, positive growth indicator (`+` / Check glyph) |
| **Pending / Audit** | `#b45309` / `#fffbeb` | `#fbbf24` / `amber-500/15` | AI extraction queue awaiting analyst review (Clock glyph) |
| **Rejected / Negatif** | `#be123c` / `#fff1f2` | `#fb7185` / `rose-500/15` | Non-economic noise or negative economic shock (Cross glyph) |
| **Needs Revision** | `#1d4ed8` / `#eff6ff` | `#60a5fa` / `blue-500/15` | Returned for taxonomy clarification (`RotateCcw` glyph) |

---

## 3. Typography & Radius Discipline

- **Primary Interface & Editorial Sans (`Plus Jakarta Sans`)**: Loaded cleanly via `next/font/google` (`--font-jakarta`), optimized for formal Indonesian administrative copy and multi-sentence news summaries (`13px` to `14px`, `line-height: 1.6`, `65ch` max measure in review prose).
- **Numerical & Identifiers (`JetBrains Mono`)**: Loaded via `next/font/google` (`--font-mono`) paired with `.tabular-nums` (`font-variant-numeric: tabular-nums`), strictly applied to KBLI codes, years, quarters, article counts, confidence ratios, timestamps, and keyboard hints (`⌘K`, `J/K`, `A`, `R`).
- **Corner Hierarchy**: `6px` (`rounded-md`) for badges/chips, `8px` (`rounded-lg`) for buttons/inputs/tabs, `12px` (`rounded-xl`) for structural cards/panels. Pill rounding (`rounded-full`) is confined solely to horizontal meter progress bars.

---

## 4. Key Workstation Modules

1. **Authenticated Gateway (`/login`)**: Split institutional dossier column (`BPS 65.04` context) opposite daylight/obsidian credential card with visible format hints (`email@bps6504.go.id`), client/server validation summary on submit/blur (`noValidate` + `role="alert"` + `aria-invalid`), and password visibility `aria-pressed` toggle.
2. **Collapsible App Shell (`WorkspaceSidebar` + `CommandHeader` + `MobileNavDrawer`)**: Persistent `256px` / `74px` BPS Navy sidebar on `lg+`, native `<dialog>` slide-out navigation on mobile (`< lg`), active period selectors (`Q1-Q4`, year), cron freshness label, live Theme Toggle, manual pipeline trigger (`Ambil Berita`), and instant `.xlsx` download (`admin`/`editor` & `viewer` compliant).
3. **Executive Overview (`metrics-cards.tsx`, `sector-distribution.tsx`, `overview-panel.tsx`)**: Asymmetric `7/5` quarterly triage focus & composition ratio beside Archive & Pipeline telemetry; interactive KBLI `17`-sector ranking matrix (clicking a sector filters directly into Curation) beside Expenditure impact split; Priority Pending queue for immediate slide-over inspection.
4. **Curation Data Table (`curation-table.tsx`)**: Semantic `<search>` toolbar (`Ctrl+K` omni-search with clear trigger, segmented status filter tabs, KBLI/Expenditure `<select>`, reset filter action), keyboard row focus (`J`/`K`/`Enter` on `tabIndex={0}` rows), contextual bulk selection bar, structured loading skeletons (`aria-busy`), retryable error recovery, and viewer read-only lock notice.
5. **Side-by-Side Review Drawer (`review-modal.tsx`)**: Top-layer native `<dialog>` slide-over (`light-dismiss` safe via dirty-state/backdrop checks, `Esc` closable) combining source article reading column (`65ch`), extracted currency/volume entities, audit timeline, and editable classification form (`[A]` Approve, `[R]` Reject).
6. **Excel Export Studio (`export-center.tsx`)**: Asymmetric `7/5` period & sheet configurator alongside workbook structure specification and live 10-row formatted preview table with loading & error recovery states.

---

## 5. Accessibility, Theme Persistence & Browser Semantics

- **Zero-FOUC Theme Initialization**: Inline bootstrap script in `src/app/layout.tsx` synchronizes `sipena-theme` (`light` / `dark`), `document.documentElement.classList`, and `<meta name="color-scheme">` prior to first paint; cross-tab changes sync via `storage` event.
- **Native Controls & Keyboard Flows**: Native `<button>`, `<a href>`, `<dialog>`, `<table>`, `cursor: pointer` / `cursor: not-allowed` rules in `@layer base`, `:focus-visible` `2px` high-contrast outlines (`--focus-ring`), non-color status icons, minimum `40px-44px` interactive height targets on mobile viewports, and `prefers-reduced-motion: reduce` support.
