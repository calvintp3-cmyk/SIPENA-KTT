# UI/UX Design System Specification & Ergonomic Guidelines
## SIPENA-KTT (Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung)
**Document Version:** 1.0.0  
**Design Standard:** Anti-Slop, High-Density Ergonomics, BPS Official Identity  
**Primary Persona:** Statistician & National Account Analyst (BPS Kabupaten Tana Tidung / BAPPEDA KTT)  

---

## 1. Design Philosophy: Anti-Slop & Human-Crafted Analytics

Modern AI-generated dashboards often suffer from generic visual tropes ("AI Sleek"):
- Floating neon cyan-to-purple gradients.
- Heavy backdrop blur (excessive glassmorphism) that destroys contrast and readability.
- Uniform pill-shaped buttons without visual distinction.
- Oversized cards with 80% wasted whitespace ("bento-grid syndrome").
- Low-contrast dark themes where muted text blends into pitch-black backgrounds.

### SIPENA-KTT Guiding Principles:
1. **Government Authority & Forensic Precision**: This is an analytical tool for compiling the Gross Regional Domestic Product (PDRB) of Kabupaten Tana Tidung. It must feel like an institutional workstation: authoritative, rigorous, and completely trustworthy.
2. **High Information Density (BPS Standard)**: Statisticians need to view 20–30 news clippings, classifications, and indicators on a single screen without endless scrolling. Cell padding is tight (`0.375rem` vertical), and tabular numerals (`tnum`) align decimal places and monetary figures.
3. **Zero Eye Strain (Ergonomic Surface Contrast)**: Extended quarterly reconciliation sessions last 8–10 hours. Instead of harsh `#000000` or aggressive neon glows, the palette uses deep slate ink (`#0B0F19`) and subtle elevation steps with razor-thin hairline borders (`#1E293B`).
4. **Authentic Regional Context**: The interface highlights Tana Tidung's real economic drivers: palm oil (CPO), coal mining, river logistics (Sesayap River speedboats & ferries), civil infrastructure (Pusat Pemerintahan di Sebawang), and municipal APBD spending.

---

## 2. Color Palette & Semantic Tokens

### 2.1 Core Neutral Surfaces (Deep Slate Canvas)
| Token | HEX | Tailwind Class | Application |
| :--- | :--- | :--- | :--- |
| `canvas-base` | `#080C14` | `bg-[#080C14]` | Root background canvas |
| `surface-panel` | `#0D131F` | `bg-[#0D131F]` | Sidebar, data tables, main workspaces |
| `surface-card` | `#131B2B` | `bg-[#131B2B]` | Metric cards, modals, review drawers |
| `surface-hover` | `#1A2438` | `bg-[#1A2438]` | Table row hover, button hover |
| `border-subtle` | `#1E293B` | `border-slate-800` | Grid dividers, internal table borders |
| `border-strong` | `#334155` | `border-slate-700` | Panel perimeters, active inputs |

### 2.2 Text Hierarchy & Contrast Ratios (WCAG AAA)
| Token | HEX | Tailwind Class | Application |
| :--- | :--- | :--- | :--- |
| `text-primary` | `#F8FAFC` | `text-slate-50` | Primary numbers, news headlines, active items |
| `text-secondary` | `#CBD5E1` | `text-slate-300` | Body copy, article summaries, labels |
| `text-muted` | `#94A3B8` | `text-slate-400` | Monospace metadata, timestamps, URLs |
| `text-tertiary` | `#64748B` | `text-slate-500` | Inactive icons, subtle table column headers |

### 2.3 Semantic Brand & Economic Indicators
| Indicator | HEX | Background Fill | Border | Meaning in PDRB Context |
| :--- | :--- | :--- | :--- | :--- |
| **BPS Navy** | `#0284C7` | `rgba(2, 132, 199, 0.12)` | `#0284C7` | Primary action, focus state, active tab |
| **Positive Growth** | `#10B981` | `rgba(16, 185, 129, 0.12)` | `#059669` | Production increase, price stability, budget surge |
| **Pending / Audit** | `#F59E0B` | `rgba(245, 158, 11, 0.12)` | `#D97706` | Unverified AI extraction, queue status |
| **Negative Shock** | `#F43F5E` | `rgba(244, 63, 94, 0.12)` | `#E11D48` | Inflation spike, crop failure, flood/logistics halt |
| **Neutral / Admin** | `#8B5CF6` | `rgba(139, 92, 246, 0.12)` | `#7C3AED` | Institutional regulation, survey notes |

---

## 3. Typography Architecture

The application enforces a dual-typeface system configured with strict tabular features:
1. **Primary Interface Font**: `Inter` / `Geist` — Clean, modern, highly legible at small sizes (11px–14px).
2. **Numerical & Code Font**: `JetBrains Mono` — With CSS `font-variant-numeric: tabular-nums` enabled.

```css
/* Global Monospace & Tabular Figures Rule */
.tabular-nums {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
```

### Font Size & Hierarchy Scale:
- **Display Metric**: `28px` (Semibold, `JetBrains Mono`, `-0.02em` tracking) — Used in top KPI summary cards.
- **Section Heading**: `18px` (Semibold, `Geist`, `-0.015em` tracking) — Used in module titles.
- **Card Heading / Sub-title**: `14px` (Medium, `Inter`) — Used in card titles and table section headers.
- **Table Body & Summaries**: `13px` (`Inter`, `line-height: 1.45`) — News narrative summaries and review text.
- **Table Metadata & Badges**: `11px` (Semibold, `JetBrains Mono`, uppercase) — KBLI sector codes, quarters, sources.

---

## 4. Key Module Ergonomics

### 4.1 Module 1: Analytics & KPI Dashboard
- **Layout**: Top command bar showing target territory (`Kabupaten Tana Tidung - 65.04`), active quarter (`Triwulan I 2025`), crawler operational heartbeat, and quick export trigger.
- **4 Metrics Grid**:
  1. *Total Berita Terindeks (Hari Ini)*: Number + change delta from previous day + source breakdown pills.
  2. *Fenomena Ekonomi Terdeteksi*: Number + hit-rate percentage + dominant sectors pill (`A, B, F`).
  3. *Antrean Verifikasi (Pending)*: Amber alert badge + count needing human confirmation before reconciliation.
  4. *Mesin Scraper & AI Service*: Real-time health pulse (HTTP 200, latency ms, last run timestamp).
- **Dual Analytical Views**:
  - Left panel: KBLI 2025 Sector Distribution bar/line matrix (17 sectors).
  - Right panel: PDRB Expenditure impact split (`PK-RT`, `PK-P`, `PMTB`, `Net Ekspor`).

### 4.2 Module 2: Curation Data Table (The Core Workspace)
- **Compact Table Density**:
  - Table row height: `44px` in compact mode.
  - Sticky header with 1px border divider.
  - Alternating subtle row backgrounds (`#0D131F` / `#0A0F1A`) with immediate `#1A2438` hover highlight.
- **Columns**:
  1. `Check`: Multi-select checkbox for bulk approval.
  2. `Waktu & Sumber`: Date published + media badge (Koran Kaltara, Radar Tarakan, Tribun, Benuanta, Antara).
  3. `Judul & Ringkasan Narasi`: Clean headline + 2-line condensed economic summary with affected commodity highlighted in bold.
  4. `Sektor KBLI`: Monospace badge (e.g., `A Pertanian`, `B Tambang`, `F Konstruksi`).
  5. `Komponen Pengeluaran`: Monospace badge (`PMTB`, `PK-P`, `PK-RT`, `Ekspor`).
  6. `Dampak & Transmisi`: Direction icon (▲ Positif, ▼ Negatif) + channel (`Volume`, `Harga`).
  7. `Status`: Distinct status chip (`Pending`, `Approved`, `Rejected`).
  8. `Aksi`: Quick action buttons: **Review (Drawer)**, **Quick Approve (Checkmark)**, **Reject (Cross)**.

### 4.3 Module 3: Side-by-Side Review Drawer (Human-in-the-Loop)
To eliminate context switching, clicking any phenomenon opens a **side-by-side sliding inspection drawer** (`720px` width on desktop):
- **Left Column (Evidence)**:
  - Original article title, published date, author, and direct link to source portal.
  - Full extracted text with auto-scrolling and search highlight.
- **Right Column (AI Extraction & Human Correction)**:
  - Editable summary textarea (Bahasa Indonesia formal BPS style).
  - Dropdown selector for 17 KBLI categories with instant subsector auto-suggest.
  - Dropdown selector for PDRB Expenditure components.
  - Impact direction toggles (Positif / Negatif / Netral).
  - Price/Volume effect toggles (Volume / Harga / Keduanya).
  - Key numerical data tags (e.g. `Anggaran: Rp 45 Miliar`, `Volume: 1.200 Ton`).
  - Verifier notes input field.
  - Sticky bottom action bar with keyboard shortcuts:
    - `[A]` **Approve & Mark Verified**
    - `[R]` **Reject (Non-Economic)**
    - `[Esc]` **Close Drawer**

### 4.4 Module 4: Excel Export Center
- **Layout**: Clean parameter selector for Year and Quarter.
- **Options**:
  - Include Lapangan Usaha (Sheet 1).
  - Include Pengeluaran (Sheet 2).
  - Filter by verification status (`Hanya yang Telah Diverifikasi / Approved` or `Semua Data`).
- **Live Preview Table**: Shows exactly the first 10 rows that will appear in the generated `.xlsx` document before downloading.
- **Instant Download**: One-click streaming of production `.xlsx` formatted with official BPS headers and auto-column widths.

---

## 5. Keyboard Navigation & Accessibility (a11y)
- **`⌘K` / `Ctrl+K`**: Global omni-search for news headlines, commodities, or KBLI codes.
- **`J` / `K`**: Navigate down/up through table rows.
- **`Enter` / `Space`**: Open review drawer for focused row.
- **`A`**: Approve currently focused phenomenon in drawer.
- **`R`**: Reject currently focused phenomenon in drawer.
- All interactive controls have visible focus rings (`focus-visible:ring-2 focus-visible:ring-sky-500`).

