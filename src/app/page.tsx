export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Header */}
      <header className="h-14 bg-[#0D131F] border-b border-[#1E293B] flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#002B49] border border-sky-500/30 flex items-center justify-center font-bold text-sky-400 text-sm">
            SP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">SIPENA-KTT</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-medium">BPS 65.04</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none">Sistem Informasi Fenomena Ekonomi & Neraca Tana Tidung</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/design/redesign-preview.html"
            target="_blank"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-sky-600 rounded transition-colors shadow-sm"
          >
            Buka Interactive Preview &rarr;
          </a>
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col justify-center items-center text-center">
        <div className="p-8 rounded-xl bg-[#0D131F] border border-[#1E293B] shadow-2xl max-w-2xl w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950 border border-sky-800 text-xs font-mono text-sky-300 mb-4">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Single Source of Truth & Prototype Siap</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            SIPENA-KTT Platform
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Otomatisasi pemantauan berita regional Kaltara, ekstraksi terstruktur AI (KBLI 2025 & PDRB Pengeluaran), telaah verifikasi analitis, dan ekspor instan berkas kerja Diseminasi Neraca.
          </p>

          <div className="grid grid-cols-2 gap-3 text-left font-mono text-xs mb-6">
            <div className="p-3 rounded bg-[#131B2B] border border-[#1E293B]">
              <span className="text-slate-400 text-[10px] block">DOKUMENTASI</span>
              <a href="/docs/prd.md" className="text-sky-400 hover:underline">/docs/prd.md</a><br/>
              <a href="/docs/architecture.md" className="text-sky-400 hover:underline">/docs/architecture.md</a><br/>
              <a href="/docs/schema.md" className="text-sky-400 hover:underline">/docs/schema.md</a>
            </div>
            <div className="p-3 rounded bg-[#131B2B] border border-[#1E293B]">
              <span className="text-slate-400 text-[10px] block">DESAIN UI/UX</span>
              <a href="/docs/design-system.md" className="text-emerald-400 hover:underline">/docs/design-system.md</a><br/>
              <a href="/design/redesign-preview.html" className="text-emerald-400 hover:underline">/design/redesign-preview.html</a>
            </div>
          </div>

          <a
            href="/design/redesign-preview.html"
            className="inline-block px-5 py-2.5 rounded-lg bg-[#0284C7] hover:bg-sky-600 text-white font-medium text-xs transition-colors shadow-lg"
          >
            Eksplorasi Antarmuka Lengkap (Dashboard, Feed Table & Review Drawer)
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 border-t border-[#1E293B] bg-[#0D131F] flex items-center justify-between px-6 text-[11px] font-mono text-slate-400">
        <span>BPS Kabupaten Tana Tidung &copy; 2025</span>
        <span>Version 1.0.0-MVP</span>
      </footer>
    </div>
  );
}
