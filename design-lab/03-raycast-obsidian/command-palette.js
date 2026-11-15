/* design-lab/03-raycast-obsidian/command-palette.js
 * Shared interactive Command Palette (⌘K), Navigation Rail renderer,
 * Theme Switcher (Default: Raycast Daylight Light Mode, optional Obsidian Dark),
 * and Domain Signal Badge helpers for 03-raycast-obsidian.
 */

(function initTheme() {
  try {
    const saved = localStorage.getItem('sipena_raycast_theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  } catch (_) {}
})();

window.SIPENA_UI = {
  getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  },

  toggleTheme() {
    const next = this.getTheme() === 'dark' ? 'light' : 'dark';
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem('sipena_raycast_theme', next);
    } catch (_) {}
    const lbl = document.getElementById('raycast-theme-label');
    if (lbl) {
      lbl.textContent = next === 'dark' ? '☾ Obsidian Dark' : '☀ Daylight Mode';
    }
    window.dispatchEvent(new CustomEvent('sipena-theme-change', { detail: { theme: next } }));
  },

  /* Render Prototype Switcher Strip at very top */
  renderProtoStrip(activePage) {
    const pages = [
      { id: 'index', num: '00', label: 'Design System', href: './index.html' },
      { id: 'landing', num: '01', label: 'Landing Publik', href: './landing.html' },
      { id: 'dashboard', num: '02', label: 'Admin Cockpit', href: './dashboard.html' },
      { id: 'table', num: '03', label: 'Bank Data', href: './table.html' },
      { id: 'linimasa', num: '04', label: 'Linimasa Publik', href: './linimasa.html' },
      { id: 'charts', num: '05', label: 'Visualisasi SVG', href: './charts.html' },
      { id: 'detail', num: '06', label: 'Review & AI Slots', href: './detail.html' }
    ];

    const navHtml = pages.map(p => `
      <a href="${p.href}" class="${p.id === activePage ? 'active' : ''}">
        <span class="num">${p.num}</span>${p.label}
      </a>
    `).join('');

    const isDark = this.getTheme() === 'dark';

    return `
      <div class="proto-strip">
        <div class="proto-strip-left">
          <a href="../index.html" style="display:inline-flex;align-items:center;gap:6px;color:var(--ink-muted);font-weight:500;">
            <span>← Lab Index</span>
          </a>
          <span style="color:var(--border-strong)">/</span>
          <span class="proto-dot"></span>
          <span style="font-family:var(--font-mono);font-size:11px;color:var(--ink-primary);font-weight:700;">03-RAYCAST-DAYLIGHT</span>
          <button type="button" class="theme-toggle-pill" onclick="window.SIPENA_UI.toggleTheme()" title="Ganti Mode Terang (Daylight) / Gelap (Obsidian)">
            <span id="raycast-theme-label">${isDark ? '☾ Obsidian Dark' : '☀ Daylight Mode'}</span>
          </button>
        </div>
        <nav class="proto-nav" aria-label="Prototype Views">
          ${navHtml}
        </nav>
      </div>
    `;
  },

  /* Render Compact Icon+Label Navigation Rail (4 Groups, 11 Items) */
  renderAdminRail(activeItemLabel) {
    const groups = [
      {
        group: 'Analitik & Rangkuman',
        items: [
          { label: 'Dashboard & Gap Sektoral', href: './dashboard.html', icon: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>', key: 'G D' },
          { label: 'Tren & Komparasi', href: './charts.html', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>', key: 'G T' },
          { label: 'Sintesis Fenomena', href: './linimasa.html', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>', key: 'G S' }
        ]
      },
      {
        group: 'Kurasi & Repositori',
        items: [
          { label: 'Review Harian', href: './detail.html', badge: '23', badgeType: 'jade', icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>', key: 'G R' },
          { label: 'Bank Data & Ekspor', href: './table.html', icon: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>', key: 'G B' }
        ]
      },
      {
        group: 'Sumber & Taksonomi',
        items: [
          { label: 'Direktori Portal', href: './detail.html#scrapers', icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
          { label: 'Master Keyword', href: './table.html', icon: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>' },
          { label: 'Kamus Taksonomi', href: './index.html#taxonomy', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
          { label: 'Konkordansi KBLI', href: './dashboard.html#matrix', icon: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>' }
        ]
      },
      {
        group: 'Sistem',
        items: [
          { label: 'Monitor Scraper & AI', href: './detail.html#scrapers', badge: '3', badgeType: 'rose', icon: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>' },
          { label: 'Kelola Akses & Tim', href: './index.html', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' }
        ]
      }
    ];

    const groupsHtml = groups.map(g => `
      <div class="rail-group">
        <div class="rail-group-label">${g.group}</div>
        <ul class="rail-list">
          ${g.items.map(it => {
            const isActive = it.label === activeItemLabel;
            const badgeHtml = it.badge
              ? `<span class="rail-badge ${it.badgeType || ''}">${it.badge}</span>`
              : (it.key ? `<kbd style="font-size:10px;height:18px;padding:0 4px;">${it.key}</kbd>` : '');
            return `
              <li>
                <a href="${it.href}" class="rail-item ${isActive ? 'active' : ''}">
                  <span class="rail-item-left">
                    <svg class="rail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${it.icon}</svg>
                    <span>${it.label}</span>
                  </span>
                  ${badgeHtml}
                </a>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `).join('');

    return `
      <aside class="nav-rail" id="admin-nav-rail" aria-label="Admin Navigation">
        <div>
          <div class="rail-brand">
            <a href="./landing.html" class="rail-brand-id">
              <div class="brand-mark">S</div>
              <div>
                <div class="brand-title">SIPENA KTT</div>
                <div class="brand-sub">BPS · 6504 WORKBENCH</div>
              </div>
            </a>
            <kbd title="Command Palette" onclick="window.SIPENA_UI.openCommandPalette()" style="cursor:pointer;">⌘K</kbd>
          </div>
          ${groupsHtml}
        </div>
        <div class="rail-footer">
          <div class="rail-status-box">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <span style="display:inline-flex;align-items:center;gap:6px;color:var(--ink-primary);font-weight:600;">
                <span style="width:6px;height:6px;border-radius:50%;background:var(--sig-vol-up);"></span>
                Multi-LLM Active
              </span>
              <span class="font-mono" style="color:var(--accent-jade);font-size:10.5px;font-weight:700;">Slot #1</span>
            </div>
            <div class="font-mono" style="color:var(--ink-muted);font-size:10.5px;">gemini-3.8-flash · 99% OK</div>
          </div>
        </div>
      </aside>
    `;
  },

  /* Render Top Command Bar */
  renderTopCommandBar(crumbSection, crumbCurrent, rightHtml = '') {
    return `
      <header class="top-command-bar">
        <div class="breadcrumb-trail">
          <button type="button" class="btn btn-secondary mobile-menu-btn" onclick="document.getElementById('admin-nav-rail')?.classList.toggle('mobile-open')" aria-label="Menu">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span>${crumbSection}</span>
          <span style="color:var(--border-strong)">/</span>
          <span class="crumb-current">${crumbCurrent}</span>
        </div>

        <button type="button" class="cmd-trigger-btn" onclick="window.SIPENA_UI.openCommandPalette()" aria-label="Buka Command Palette">
          <span class="cmd-trigger-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span>Loncat ke sektor KBLI, fenomena, atau jalankan perintah...</span>
          </span>
          <span class="kbd-group">
            <kbd>⌘</kbd><kbd>K</kbd>
          </span>
        </button>

        <div class="top-actions">
          ${rightHtml || `
            <span class="filter-pill" style="background:var(--bg-canvas);">
              <span style="width:6px;height:6px;border-radius:50%;background:var(--accent-jade);"></span>
              <span class="font-mono" style="font-size:11.5px;color:var(--ink-primary);font-weight:600;">TW IV 2026</span>
            </span>
            <a href="./detail.html" class="btn btn-primary">
              <span>Review Antrean (23)</span>
              <kbd>R</kbd>
            </a>
          `}
        </div>
      </header>
    `;
  },

  /* Render Signal Badge (Volume vs Harga with dual icon+text) */
  renderSignalBadge(code) {
    const map = {
      INCREASE_NTB: {
        cls: 'vol-up',
        label: 'Volume ↑ (NTB)',
        svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>'
      },
      INCREASE_REAL: {
        cls: 'vol-up',
        label: 'Volume ↑ (Riil)',
        svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>'
      },
      DECREASE_NTB: {
        cls: 'vol-down',
        label: 'Volume ↓ (NTB)',
        svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="6" x2="12" y2="18"/></svg>'
      },
      DECREASE_REAL: {
        cls: 'vol-down',
        label: 'Volume ↓ (Riil)',
        svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="6" x2="12" y2="18"/></svg>'
      },
      INCREASE_PRICE: {
        cls: 'price-up',
        label: 'Harga ↑ (Deflator)',
        svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polygon points="12 2 22 12 12 22 2 12 12 2"/></svg>'
      },
      INCREASE_DEFLATOR: {
        cls: 'price-up',
        label: 'Deflator ↑ (Harga)',
        svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polygon points="12 2 22 12 12 22 2 12 12 2"/></svg>'
      },
      DECREASE_PRICE: {
        cls: 'price-down',
        label: 'Harga ↓ (Deflator)',
        svg: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polygon points="12 2 22 12 12 22 2 12 12 2"/></svg>'
      }
    };
    const item = map[code] || map.INCREASE_NTB;
    return `<span class="signal-badge ${item.cls}">${item.svg}<span>${item.label}</span></span>`;
  },

  /* Inject Raycast Command Palette Modal into DOM */
  initCommandPalette() {
    if (document.getElementById('raycast-cmd-backdrop')) return;
    const commands = [
      { section: 'Navigasi Cepat', title: 'Buka Dashboard & Gap Sektoral (17 Sektor PDRB)', shortcut: 'G D', href: './dashboard.html', badge: 'Cockpit' },
      { section: 'Navigasi Cepat', title: 'Buka Workbench Review Harian (23 Antrean Pending)', shortcut: 'G R', href: './detail.html', badge: '23 Pending' },
      { section: 'Navigasi Cepat', title: 'Buka Bank Data & Ekspor CSV/XLSX', shortcut: 'G B', href: './table.html', badge: '48 Berita' },
      { section: 'Navigasi Cepat', title: 'Buka Visualisasi SVG & Matriks Silang 17×6', shortcut: 'G T', href: './charts.html', badge: 'Analytics' },
      { section: 'Navigasi Cepat', title: 'Buka Portal Linimasa Fenomena Publik', shortcut: 'G L', href: './linimasa.html', badge: 'Publik' },
      { section: 'Tindakan Cepat & AI', title: 'Ganti Tema: Raycast Daylight (Terang) ⇄ Obsidian (Gelap)', shortcut: '⌘ J', action: 'TOGGLE_THEME', badge: 'Theme' },
      { section: 'Tindakan Cepat & AI', title: 'Filter Sektor Data Gap: J,K (Infokom), M (Real Estat), Q (Pendidikan)', shortcut: '⇧ G', href: './dashboard.html#gap-focus', badge: '3 Gap' },
      { section: 'Tindakan Cepat & AI', title: 'Inspeksi Status 5 Slot Multi-LLM & Kuota Token', shortcut: '⌘ M', href: './detail.html#scrapers', badge: '3 Limit' },
      { section: 'Tindakan Cepat & AI', title: 'Ekspor Matriks Silang 17×6 TW IV 2026 (.CSV)', shortcut: '⌘ E', href: './table.html#export', badge: 'CSV' }
    ];

    const modalHtml = `
      <div class="cmd-backdrop" id="raycast-cmd-backdrop" onclick="if(event.target===this) window.SIPENA_UI.closeCommandPalette()">
        <div class="cmd-dialog" role="dialog" aria-modal="true" aria-label="Command Palette">
          <div class="cmd-input-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-jade)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="raycast-cmd-input" class="cmd-input" placeholder="Ketik perintah, kode KBLI (A–V), atau nama halaman..." autocomplete="off" />
            <kbd onclick="window.SIPENA_UI.closeCommandPalette()" style="cursor:pointer;">ESC</kbd>
          </div>
          <div class="cmd-list" id="raycast-cmd-list"></div>
          <div class="cmd-footer">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="width:6px;height:6px;border-radius:50%;background:var(--accent-jade);"></span>
              <span>SIPENA Command Launcher · Raycast Daylight</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <span><kbd>↑</kbd> <kbd>↓</kbd> Navigasi</span>
              <span><kbd>↵</kbd> Buka</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const listEl = document.getElementById('raycast-cmd-list');
    const inputEl = document.getElementById('raycast-cmd-input');

    function renderItems(q = '') {
      const query = q.trim().toLowerCase();
      const filtered = commands.filter(c => c.title.toLowerCase().includes(query) || c.section.toLowerCase().includes(query));
      let currentSection = '';
      let html = '';
      filtered.forEach((c, idx) => {
        if (c.section !== currentSection) {
          currentSection = c.section;
          html += `<div class="cmd-section-title">${currentSection}</div>`;
        }
        if (c.action === 'TOGGLE_THEME') {
          html += `
            <div onclick="window.SIPENA_UI.toggleTheme(); window.SIPENA_UI.closeCommandPalette();" class="cmd-item ${idx === 0 ? 'selected' : ''}">
              <div class="cmd-item-left">
                <span style="color:var(--accent-jade);font-family:var(--font-mono);font-size:11px;font-weight:700;">›</span>
                <span>${c.title}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-family:var(--font-mono);font-size:11px;color:var(--ink-muted);">${c.badge}</span>
                <kbd>${c.shortcut}</kbd>
              </div>
            </div>
          `;
        } else {
          html += `
            <a href="${c.href}" class="cmd-item ${idx === 0 ? 'selected' : ''}">
              <div class="cmd-item-left">
                <span style="color:var(--accent-jade);font-family:var(--font-mono);font-size:11px;font-weight:700;">›</span>
                <span>${c.title}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-family:var(--font-mono);font-size:11px;color:var(--ink-muted);">${c.badge}</span>
                <kbd>${c.shortcut}</kbd>
              </div>
            </a>
          `;
        }
      });
      listEl.innerHTML = html || `<div style="padding:24px;text-align:center;color:var(--ink-muted);">Tidak ada perintah yang cocok dengan "${q}"</div>`;
    }

    renderItems('');
    inputEl.addEventListener('input', e => renderItems(e.target.value));

    window.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.SIPENA_UI.toggleCommandPalette();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        window.SIPENA_UI.toggleTheme();
      } else if (e.key === 'Escape') {
        window.SIPENA_UI.closeCommandPalette();
      }
    });
  },

  openCommandPalette() {
    this.initCommandPalette();
    const bd = document.getElementById('raycast-cmd-backdrop');
    if (bd) {
      bd.classList.add('open');
      setTimeout(() => document.getElementById('raycast-cmd-input')?.focus(), 20);
    }
  },

  closeCommandPalette() {
    const bd = document.getElementById('raycast-cmd-backdrop');
    if (bd) bd.classList.remove('open');
  },

  toggleCommandPalette() {
    this.initCommandPalette();
    const bd = document.getElementById('raycast-cmd-backdrop');
    if (bd?.classList.contains('open')) {
      this.closeCommandPalette();
    } else {
      this.openCommandPalette();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.SIPENA_UI.initCommandPalette();
});
