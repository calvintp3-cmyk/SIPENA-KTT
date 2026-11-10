# Master Prompt Google Stitch: SIPENA-KTT (One Day One News)

Gunakan prompt terstruktur di bawah ini ke dalam **Google Stitch**. Prompt ini dirancang dengan aturan ketat dari `.agents/skills` (*antislop-ui*, *taste-skill*, dan *ui-ux-pro-max*) untuk mencegah Google Stitch menghasilkan desain generic "AI-sleek" (tanpa gradasi neon ungu, tanpa glassmorphism berlebihan, tanpa dark mode murahan).

---

## 📋 PROMPT UTAMA GOOGLE STITCH (Salin & Tempel ke Stitch)

```text
Project Name: SIPENA-KTT (Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung)
Target Institution: BPS (Badan Pusat Statistik) Kabupaten Tana Tidung (Kode Wilayah: 65.04), Kalimantan Utara.
Role/Domain: Regional Economic Intelligence, Macroeconomic Accounting (PDRB Lapangan Usaha KBLI 2020-2025 & PDRB Pengeluaran), and "One Day One News" (ODON) Daily Curation Workstation.

---
[CRITICAL DESIGN PHILOSOPHY: ANTI-AI-SLEEK & INSTITUTIONAL CRAFT]
DO NOT make this look like a generic AI-SaaS startup or crypto landing page.
- ABSOLUTELY NO: Dark mode by default, neon purple/cyan/magenta glowing gradients, glassmorphism (frosted glass) on every card, floating 3D spheres, stock background dot-grids, or pill-shaped containers on everything.
- DESIGN DIRECTION: Light-First Institutional Data Journalism & Professional Statistical Workstation (inspired by Financial Times, Bloomberg Terminal data hierarchy, and Official BPS Statistical Publications).
- TONE & COPING: Formal, authoritative, editorial, purposeful, and grounded in real Indonesian regional economic reality. Zero marketing buzzwords (never use "Smart AI Synergy", "Next-Gen Analytics"). Use exact BPS domain terms: "Nerwilis", "KBLI 2020/2025", "Fenomena Ekonomi", "Keseimbangan Dua Sisi PDRB", "Komponen Pengeluaran (PK-RT, PMTB, Net Ekspor)", "Dossier Rekonsiliasi Triwulanan".

---
[COLOR SYSTEM & TOKENS]
- Base Canvas: Pure Daylight Paper (#F8FAFC and #FFFFFF). Warm, crisp, high legibility.
- Primary Ink: Deep Obsidian Navy (#0F172A) for headers and critical data. Contrast ratio > 7:1 (WCAG AAA).
- Institutional Accent: BPS Heritage Blue (#002B49 and #0284C7).
- Semantic Economic Indicators (Quiet, purposeful, matte, no neon glow):
  * Coal / Mining (Kat B - 37.8% PDRB): Warm Bronze / Amber (#B45309 on #FEF3C7)
  * Agriculture / Palm Oil / Fisheries (Kat A - 23.4% PDRB): Forest Emerald (#059669 on #ECFDF5)
  * Infrastructure / PMTB Construction (Kat F - 18.5% PDRB): Steel Indigo (#4338CA on #EEF2FF)
  * Consumer Price / Retail Food (Kat G / PK-RT - 5.1% PDRB): Soft Rose (#BE123C on #FFE4E6)
  * Government / APBD Fiscal (Kat O / PK-P - 8.5% PDRB): Slate Steel (#334155 on #F1F5F9)
- Borders & Dividers: Thin 1px hairlines (#E2E8F0), crisp subtle shadows (no giant diffuse blurry drop-shadows).

---
[TYPOGRAPHY]
- Headlines & Narrative Story: Refined Editorial Serif (Newsreader / Lora / Merriweather), conveying weight and journalistic gravitas.
- UI Labels, Tables, Inputs: Neutral Modern Sans (Plus Jakarta Sans / Inter).
- Quantitative Values, Prices, & Codes: Tabular Monospace (JetBrains Mono), ensuring numbers line up strictly.

---
[REQUIRED SCREENS TO GENERATE IN STITCH]

SCREEN 1: Public Dispatch & 365-Day Economic Radar (Landing Page)
- Purpose: Accessed without login by public, local government (OPD Pemkab Tana Tidung), and BPS leaders.
- Components:
  1. Institutional Header: BPS 65.04 logo mark, "SIPENA ODON", active live clock (WITA timezone), Search trigger (Cmd+K), and "Kirim Berita" action button.
  2. "Today's Economic Pulse" (Edisi Hari Ini - H-1 Editorial Hero):
     - Bold editorial serif headline (e.g. "Harga Bawang Merah Naik di Pasar Imbayud Taka Capai Rp70.000/Kg").
     - 3-sentence objective economic summary citing real local geography (Tideng Pale, Sungai Sesayap, supply from Samarinda).
     - Balanced Dual-Pillar PDRB Transmission Card:
       * Left Pillar: Lapangan Usaha (Kategori G - Perdagangan, Pangsa PDRB: 5.06%, Dampak: ▲ Meningkatkan Harga Margin, Auto-KBLI 2020: 4721 -> 2025: G).
       * Right Pillar: Pengeluaran (PK-RT - Rumah Tangga, Pangsa PDRB: 7.06%, Dampak: ▲ Tekanan Inflasi Sembako).
     - Source attribution badge (Tribun Kaltara, 10 Nov 2026), direct source link.
  3. "365-Day Annual Phenomenon Heatmap" (Kalender Cakupan Triwulan):
     - GitHub-style contribution matrix, split neatly into TW I (64 days), TW II (63 days), TW III (65 days), and TW IV (active).
     - Square tiles colored by daily dominant sector (Bronze for Coal, Green for Palm Oil, Indigo for Construction, Rose for Food, Slate for Fiscal).
     - Interactive tooltip showing date, sector, and headline.
     - Sektor quick-filter chips to light up specific industries.
  4. Dual-View Mode Switcher:
     - Toggle between "Story Cards" (rich narrative cards with price tags and quotes) and "Analyst Ledger" (compact data table).

SCREEN 2: Admin Fast-Curation Workstation (Meja Kerja H-1)
- Purpose: Used daily by BPS Nerwilis Admin at 08:00 WITA. Must allow verifying and publishing today's news in under 1 minute.
- Components:
  1. Automated Pipeline Status Bar: "Status Hari Ini: ⚠️ Belum Terbit • Radar 05.00 WITA memindai 4 media Kaltara (Radar Tarakan, Benuanta, Fokus Borneo, Tribun Kaltara) + 2 kanal nasional (Antara, CNBC). 25 artikel ditemukan."
  2. Top 3 AI Candidate Cards:
     - Card 1 (Recommended, 96% Match): High PDRB impact item (e.g. Coal/Sawit/Sembako).
     - Card 2 & 3: Secondary regional items (e.g. Sebawang Civic Center Construction, Seaweed/Aquaculture).
  3. Master-Detail Review Workbench:
     - Left pane: Original article text with AI-highlighted key sentences and extracted numerical metrics.
     - Right pane: Structured curation form:
       * Editable headline and 3-sentence BPS summary.
       * Side-by-side dropdown: Sisi Lapangan Usaha (KBLI 2020 with live conversion preview to KBLI 2025) & Sisi Pengeluaran (7 Komponen PDRB: PK-RT, PK-P, PMTB, Ekspor, Impor, PI, LNPRT).
       * Impact direction dropdown ("Meningkatkan Harga", "Meningkatkan NTB", "Meningkatkan Volume", etc.).
       * Primary CTA: Elegant Obsidian Navy button: "[🚀 TERBITKAN SEBAGAI EDISI HARI INI]".

SCREEN 3: Dual-Ledger Reconciliation Sheet (Lembar Kerja Neraca Sheet 6503)
- Purpose: For quarterly PDRB reconciliation meetings with BPS Provinsi Kaltara. Mirroring the exact structure of the BPS Google Sheet "6503 ODON".
- Components:
  1. Sub-tab navigation: "Sheet 1: Lapangan Usaha (KBLI)" vs "Sheet 2: Pengeluaran PDRB".
  2. Filter bar: Quarter dropdown (TW I, TW II, TW III, TW IV, Full Year), Sector filter, Impact filter, Search box.
  3. Action: Emerald button "[📥 Unduh Excel (.xlsx Resmi BPS)]".
  4. High-density data table with exact columns:
     - Col 1: No
     - Col 2: Waktu Input (dd/mm/yy)
     - Col 3: Judul Berita (bold sans)
     - Col 4: Kategori KBLI (e.g. "G" or "A") / Komponen Pengeluaran (e.g. "PMTB", "PK-RT")
     - Col 5: Ringkasan Berita (formal statistical prose, text-wrap comfortable)
     - Col 6: Dampak (soft semantic badges, e.g. "Meningkatkan NTB", "Meningkatkan Harga")
     - Col 7: Sumber Berita (link domain)
     - Col 8: Periode Berita (e.g. "TW III-2025")

SCREEN 4: Contributor Fast-Submit Sheet (Kirim Tautan)
- Purpose: Mobile-first dialog for non-admin BPS staff or OPD liaisons to submit articles.
- Components:
  - Clean URL paste field.
  - "Analisis Otomatis" button.
  - Instant scraping preview showing detected title, publication date, and AI draft summary.
  - Submission button to send directly to Admin verification queue.
```

