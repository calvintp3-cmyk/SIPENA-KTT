/* ==========================================================================
   SIPENA KTT — 02-STRIPE-CLARITY SHARED UI HELPERS & INTERACTIVE ENGINE
   ========================================================================== */

(function () {
  const S = window.SIPENA || {};

  /* Extended dataset for 12+ rows in Bank Data (table.html) while keeping window.SIPENA.articles as primary 6 */
  const extraArticles = [
    {
      id: 7, date: '29 Sep 2026', iso: '2026-09-29', scope: 'KTT_LOCAL', portal: 'Koran Kaltara',
      title: 'Distribusi Pupuk Subsidi di Kecamatan Betayau Tuntas 95 Persen Sebelum Musim Tanam',
      summary: 'Dinas Pertanian dan Pangan Kabupaten Tana Tidung memastikan penyaluran pupuk bersubsidi ke kelompok tani di Kecamatan Betayau dan Muruk Rian berjalan tepat jadwal.',
      kbli: 'A', kbliName: 'Pertanian, Kehutanan, dan Perikanan', impactKbli: 'INCREASE_NTB',
      exp: 'PK_P', expLabel: 'Konsumsi Pemerintah', impactExp: 'INCREASE_REAL', quarter: 4, confidence: 0.92, model: 'gemini-3.8-flash'
    },
    {
      id: 8, date: '27 Sep 2026', iso: '2026-09-27', scope: 'KTT_LOCAL', portal: 'Benuanta',
      title: 'Peningkatan Jalan Poros Seputuk–Rian Sepanjang 4,2 Km Memasuki Tahap Pengaspalan',
      summary: 'Pekerjaan pengaspalan jalan penghubung antardesa di Kecamatan Muruk Rian dipercepat guna memperlancar distribusi hasil kebun masyarakat.',
      kbli: 'F', kbliName: 'Konstruksi', impactKbli: 'INCREASE_NTB',
      exp: 'PMTB', expLabel: 'Pembentukan Modal Tetap Bruto', impactExp: 'INCREASE_REAL', quarter: 4, confidence: 0.95, model: 'gemini-3.8-flash'
    },
    {
      id: 9, date: '24 Sep 2026', iso: '2026-09-24', scope: 'KTT_LOCAL', portal: 'Radar Tarakan',
      title: 'Pasar Imbayud Tideng Pale Catat Kenaikan Omzet Pedagang Saat Hari Jadi Kabupaten',
      summary: 'Rangkaian perayaan dan pasar rakyat di pusat kota Tideng Pale mendongkrak perputaran uang pedagang eceran makanan, minuman, dan tekstil.',
      kbli: 'G', kbliName: 'Perdagangan Besar dan Eceran', impactKbli: 'INCREASE_NTB',
      exp: 'PK_RT', expLabel: 'Konsumsi Rumah Tangga', impactExp: 'INCREASE_REAL', quarter: 4, confidence: 0.88, model: 'groq:llama-3.3-70b'
    },
    {
      id: 10, date: '21 Sep 2026', iso: '2026-09-21', scope: 'KALTARA_PROVINCIAL', portal: 'Tribun Kaltara',
      title: 'Tarif Speedboat Reguler Rute Tarakan–Tideng Pale Stabil Pasca Penyesuaian Kuota BBM',
      summary: 'Dinas Perhubungan memastikan tarif angkutan sungai dan penyeberangan speedboat reguler tetap stabil setelah pasokan BBM bersubsidi kembali normal.',
      kbli: 'H', kbliName: 'Transportasi dan Penyimpanan', impactKbli: 'DECREASE_PRICE',
      exp: 'PK_RT', expLabel: 'Konsumsi Rumah Tangga', impactExp: 'INCREASE_REAL', quarter: 4, confidence: 0.84, model: 'gemini-3.5-flash-lite'
    },
    {
      id: 11, date: '18 Sep 2026', iso: '2026-09-18', scope: 'KTT_LOCAL', portal: 'Koran Kaltara',
      title: 'RSUD Akhmad Berahim Tambah Unit Layanan Hemodialisa dan Dokter Spesialis Kunjungan',
      summary: 'Peningkatan fasilitas kesehatan rujukan di Tideng Pale mengurangi kebutuhan rujukan pasien rawat jalan ke Kota Tarakan.',
      kbli: 'R', kbliName: 'Aktivitas Kesehatan Manusia dan Aktivitas Sosial', impactKbli: 'INCREASE_NTB',
      exp: 'PK_P', expLabel: 'Konsumsi Pemerintah', impactExp: 'INCREASE_REAL', quarter: 4, confidence: 0.90, model: 'gemini-3.8-flash'
    },
    {
      id: 12, date: '15 Sep 2026', iso: '2026-09-15', scope: 'KTT_LOCAL', portal: 'Benuanta',
      title: 'Kunjungan Tamu Dinas ke Tideng Pale Dorong Tingkat Hunian Penginapan Lokal',
      summary: 'Pelaksanaan rapat koordinasi tingkat provinsi di Kabupaten Tana Tidung meningkatkan okupansi penginapan dan usaha katering lokal hingga 80 persen.',
      kbli: 'I', kbliName: 'Penyediaan Akomodasi dan Makan Minum', impactKbli: 'INCREASE_NTB',
      exp: 'PK_RT', expLabel: 'Konsumsi Rumah Tangga', impactExp: 'INCREASE_REAL', quarter: 4, confidence: 0.87, model: 'groq:llama-3.3-70b'
    },
    {
      id: 13, date: '11 Sep 2026', iso: '2026-09-11', scope: 'KTT_LOCAL', portal: 'Radar Tarakan',
      title: 'PLN ULP Tideng Pale Perluas Jaringan Listrik Desa ke Wilayah Tana Lia',
      summary: 'Penambahan gardu distribusi dan jam nyala listrik di Pulau Bunyu dan Kecamatan Tana Lia mendukung aktivitas usaha mikro pengolahan hasil laut.',
      kbli: 'D', kbliName: 'Penyediaan Listrik, Gas, Uap/Air Panas, dan Udara Dingin', impactKbli: 'INCREASE_NTB',
      exp: 'PMTB', expLabel: 'Pembentukan Modal Tetap Bruto', impactExp: 'INCREASE_REAL', quarter: 4, confidence: 0.91, model: 'gemini-3.8-flash'
    },
    {
      id: 14, date: '08 Sep 2026', iso: '2026-09-08', scope: 'KTT_LOCAL', portal: 'Koran Kaltara',
      title: 'Penyaluran Kredit Usaha Rakyat (KUR) Sektor Perkebunan dan Perdagangan di KTT Tumbuh 14%',
      summary: 'Perbankan daerah mencatat peningkatan penyaluran modal kerja bagi pelaku UMKM perkebunan sawit mandiri dan pedagang pasar di Tideng Pale.',
      kbli: 'L', kbliName: 'Aktivitas Keuangan dan Asuransi', impactKbli: 'INCREASE_NTB',
      exp: 'PMTB', expLabel: 'Pembentukan Modal Tetap Bruto', impactExp: 'INCREASE_REAL', quarter: 4, confidence: 0.86, model: 'gemini-3.8-flash'
    }
  ];

  const allArticles = (S.articles || []).concat(extraArticles);

  /* Impact badge renderer: Volume (NTB / Riil) uses solid circle-arrow icon; Price (Deflator) uses diamond-tag icon */
  function renderImpactBadge(code) {
    const map = {
      INCREASE_NTB: {
        cls: 'impact-vol-up',
        label: 'Volume ↑ (NTB Riil)',
        short: 'Volume ↑',
        icon: `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="currentColor" fill-opacity="0.16"/><path d="M8 11.5V4.5M8 4.5L5 7.5M8 4.5L11 7.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      },
      INCREASE_REAL: {
        cls: 'impact-vol-up',
        label: 'Volume ↑ (Riil)',
        short: 'Riil ↑',
        icon: `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="currentColor" fill-opacity="0.16"/><path d="M8 11.5V4.5M8 4.5L5 7.5M8 4.5L11 7.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      },
      DECREASE_NTB: {
        cls: 'impact-vol-down',
        label: 'Volume ↓ (NTB Riil)',
        short: 'Volume ↓',
        icon: `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="currentColor" fill-opacity="0.16"/><path d="M8 4.5V11.5M8 11.5L5 8.5M8 11.5L11 8.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      },
      DECREASE_REAL: {
        cls: 'impact-vol-down',
        label: 'Volume ↓ (Riil)',
        short: 'Riil ↓',
        icon: `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="currentColor" fill-opacity="0.16"/><path d="M8 4.5V11.5M8 11.5L5 8.5M8 11.5L11 8.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      },
      INCREASE_PRICE: {
        cls: 'impact-price-up',
        label: 'Harga ↑ (Deflator)',
        short: 'Harga ↑',
        icon: `<svg viewBox="0 0 16 16" fill="none"><path d="M8 1.8L14.2 8L8 14.2L1.8 8L8 1.8Z" stroke="currentColor" stroke-width="1.4"/><path d="M8 10.5V5.5M8 5.5L6 7.5M8 5.5L10 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      },
      INCREASE_DEFLATOR: {
        cls: 'impact-price-up',
        label: 'Deflator ↑ (Harga)',
        short: 'Deflator ↑',
        icon: `<svg viewBox="0 0 16 16" fill="none"><path d="M8 1.8L14.2 8L8 14.2L1.8 8L8 1.8Z" stroke="currentColor" stroke-width="1.4"/><path d="M8 10.5V5.5M8 5.5L6 7.5M8 5.5L10 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      },
      DECREASE_PRICE: {
        cls: 'impact-price-down',
        label: 'Harga ↓ (Deflator)',
        short: 'Harga ↓',
        icon: `<svg viewBox="0 0 16 16" fill="none"><path d="M8 1.8L14.2 8L8 14.2L1.8 8L8 1.8Z" stroke="currentColor" stroke-width="1.4"/><path d="M8 5.5V10.5M8 10.5L6 8.5M8 10.5L10 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      }
    };
    const item = map[code] || map.INCREASE_NTB;
    return `<span class="impact-pill ${item.cls}">${item.icon}<span>${item.label}</span></span>`;
  }

  function renderScopeBadge(scope) {
    const labels = {
      KTT_LOCAL: { text: 'Lokal KTT', cls: 'local' },
      KALTARA_PROVINCIAL: { text: 'Provinsi Kaltara', cls: '' },
      NATIONAL_MACRO_IMPACT: { text: 'Makro Nasional', cls: '' }
    };
    const s = labels[scope] || { text: scope, cls: '' };
    return `<span class="scope-pill ${s.cls}">${s.text}</span>`;
  }

  function renderProtoBar(activePage) {
    const pages = [
      { href: 'index.html', label: '00 · Design System' },
      { href: 'landing.html', label: '01 · Landing Publik' },
      { href: 'dashboard.html', label: '02 · Dashboard Admin' },
      { href: 'table.html', label: '03 · Bank Data' },
      { href: 'linimasa.html', label: '04 · Linimasa Publik' },
      { href: 'charts.html', label: '05 · Visualisasi SVG' },
      { href: 'detail.html', label: '06 · Workbench & AI' }
    ];
    return `
      <div class="proto-bar">
        <div class="proto-bar-left">
          <span class="proto-dot"></span>
          <span><strong>Alternatif 02 · Stripe Clarity</strong> — Luminous Porcelain &amp; Dimensional Clarity</span>
        </div>
        <nav class="proto-nav" aria-label="Navigasi Prototipe">
          ${pages.map(p => `<a href="${p.href}" class="${p.href === activePage ? 'active' : ''}">${p.label}</a>`).join('')}
        </nav>
      </div>
    `;
  }

  function renderAdminSidebar(activeItem) {
    const navGroups = [
      {
        group: 'Analitik & Rangkuman',
        items: [
          { name: 'Dashboard & Gap Sektoral', href: 'dashboard.html' },
          { name: 'Tren & Komparasi', href: 'charts.html' },
          { name: 'Sintesis Fenomena', href: 'linimasa.html' }
        ]
      },
      {
        group: 'Kurasi & Repositori',
        items: [
          { name: 'Review Harian', href: 'detail.html', badge: '23', badgeCls: 'cobalt' },
          { name: 'Bank Data & Ekspor', href: 'table.html', badge: '48', badgeCls: '' }
        ]
      },
      {
        group: 'Sumber & Taksonomi',
        items: [
          { name: 'Direktori Portal', href: 'detail.html#portal' },
          { name: 'Master Keyword', href: 'detail.html#keyword' },
          { name: 'Kamus Taksonomi', href: 'index.html' },
          { name: 'Konkordansi KBLI', href: 'charts.html#matrix' }
        ]
      },
      {
        group: 'Sistem',
        items: [
          { name: 'Monitor Scraper & AI', href: 'detail.html#scrapers', badge: '3', badgeCls: 'warn' },
          { name: 'Kelola Akses & Tim', href: 'index.html' }
        ]
      }
    ];

    return `
      <aside class="floating-sidebar" aria-label="Menu Admin SIPENA">
        <div class="brand-lockup">
          <a href="landing.html" class="brand-mark">
            <div class="brand-emblem">S</div>
            <div>
              <div class="brand-text-title">SIPENA KTT</div>
              <div class="brand-text-sub">Kab. Tana Tidung</div>
            </div>
          </a>
          <span class="kbd">⌘K</span>
        </div>
        ${navGroups.map(g => `
          <div class="nav-group">
            <div class="nav-group-label">${g.group}</div>
            ${g.items.map(it => `
              <a href="${it.href}" class="nav-item ${it.name === activeItem ? 'active' : ''}">
                <span>${it.name}</span>
                ${it.badge ? `<span class="nav-badge ${it.badgeCls}">${it.badge}</span>` : ''}
              </a>
            `).join('')}
          </div>
        `).join('')}
        <div class="well-subtle" style="margin-top:auto; font-size:0.75rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-weight:600; color:var(--ink-primary);">Sinkronisasi Otomatis</span>
            <span style="color:var(--vol-up-text); font-weight:600;">● Aktif</span>
          </div>
          <div class="text-muted">14 Nov 2026 · 06:42 WITA</div>
        </div>
      </aside>
    `;
  }

  /* Slide-over Inspector Drawer Logic */
  function openArticleDrawer(articleId) {
    const art = allArticles.find(a => a.id === Number(articleId)) || allArticles[0];
    if (!art) return;
    const backdrop = document.getElementById('inspector-backdrop');
    const drawer = document.getElementById('inspector-drawer');
    const body = document.getElementById('inspector-body');
    if (!drawer || !body) return;

    const confPct = Math.round((art.confidence || 0.9) * 100);
    body.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px;">
          ${renderScopeBadge(art.scope)}
          <span class="font-mono text-muted" style="font-size:0.76rem;">#${String(art.id).padStart(4, '0')} · ${art.date}</span>
        </div>
        <span class="kbli-badge"><span class="kbli-code">${art.portal}</span><span>Terverifikasi</span></span>
      </div>

      <div>
        <h3 class="font-display" style="font-size:1.35rem; font-weight:500; line-height:1.3; margin-bottom:10px; color:var(--ink-primary);">
          ${art.title}
        </h3>
        <div class="well-subtle" style="font-size:0.88rem; color:var(--ink-secondary); line-height:1.6;">
          “${art.summary}”
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr; gap:12px;">
        <div class="card" style="padding:14px 16px; box-shadow:none; background:var(--bg-subtle);">
          <div class="section-label" style="margin-bottom:8px;">Sisi 1 · PDRB Menurut Lapangan Usaha (KBLI 2025)</div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <span class="kbli-badge">
              <span class="kbli-code">Kategori ${art.kbli}</span>
              <span>${art.kbliName}</span>
            </span>
            ${renderImpactBadge(art.impactKbli)}
          </div>
        </div>

        <div class="card" style="padding:14px 16px; box-shadow:none; background:var(--bg-subtle);">
          <div class="section-label" style="margin-bottom:8px;">Sisi 2 · PDRB Menurut Komponen Pengeluaran</div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <span class="exp-badge">${art.exp} · ${art.expLabel}</span>
            ${renderImpactBadge(art.impactExp)}
          </div>
        </div>
      </div>

      <div class="well" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; font-size:0.78rem;">
        <div>
          <div class="text-muted">Periode</div>
          <div class="font-mono" style="font-weight:600; margin-top:2px;">TW IV 2026</div>
        </div>
        <div>
          <div class="text-muted">Skor Keyakinan AI</div>
          <div class="font-mono" style="font-weight:600; margin-top:2px; color:var(--cobalt-600);">${confPct}%</div>
        </div>
        <div>
          <div class="text-muted">Model Ekstraksi</div>
          <div class="font-mono" style="font-weight:600; margin-top:2px;">${art.model}</div>
        </div>
      </div>

      <div style="font-size:0.78rem; color:var(--ink-muted); line-height:1.5;">
        <strong>Catatan Metodologi:</strong> Klasifikasi dua dimensi memisahkan pergerakan <em>Volume Riil (NTB)</em> dari perubahan <em>Harga / Indeks Implisit (Deflator)</em> untuk membantu penyusunan narasi kualitatif PDRB Kabupaten Tana Tidung.
      </div>
    `;

    backdrop.classList.add('open');
    drawer.classList.add('open');
  }

  function closeArticleDrawer() {
    const backdrop = document.getElementById('inspector-backdrop');
    const drawer = document.getElementById('inspector-drawer');
    if (backdrop) backdrop.classList.remove('open');
    if (drawer) drawer.classList.remove('open');
  }

  window.SIPENA_UI = {
    allArticles,
    renderImpactBadge,
    renderScopeBadge,
    renderProtoBar,
    renderAdminSidebar,
    openArticleDrawer,
    closeArticleDrawer
  };
})();
