"use client";

import React from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Cpu,
  Sparkles,
  TrendingUp,
  Compass,
} from "lucide-react";

export function MethodologyView() {
  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-bold">
                Standar BPS 65.04
              </span>
              <span className="text-xs text-[#8c8c8c] font-medium">Buku Panduan Nerwilis</span>
            </div>
            <h3 className="text-base font-extrabold text-[#141414] tracking-tight">
              Metodologi & Prinsip Satu Data ODON (One Day One News)
            </h3>
            <p className="text-xs text-[#595959] max-w-3xl leading-relaxed">
              Panduan resmi mekanisme pencatatan fenomena ekonomi harian Kabupaten Tana Tidung untuk memperkuat validitas, objektivitas, dan kecepatan rilis Produk Domestik Regional Bruto (PDRB).
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 text-white flex items-center justify-center font-bold shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3 Core Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Principle 1 */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] border border-[#f0f0f0] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-[#141414]">1. Prinsip Single Source of Truth</h4>
          <p className="text-xs text-[#595959] leading-relaxed">
            Format ODON diadopsi langsung dari standar <b>Google Sheet 6503 BPS Tana Tidung</b>. Setiap berita harian memiliki 1 baris ledger resmi yang mencakup tanggal entri (H), tanggal terbit berita (H-1), URL sumber, narasi fenomena, serta kodifikasi ganda.
          </p>
        </div>

        {/* Principle 2 */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] border border-[#f0f0f0] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-[#141414]">2. Dual-Pillar Balance Transmission</h4>
          <p className="text-xs text-[#595959] leading-relaxed">
            Setiap berita wajib diklasifikasikan secara berpasangan: <b>Sisi Lapangan Usaha (KBLI)</b> dan <b>Sisi Pengeluaran (7 Komponen PDRB)</b>. Hal ini menjamin fenomena ekonomi dapat dianalisis dari dua perspektif agregasi statistik secara simultan.
          </p>
        </div>

        {/* Principle 3 */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] border border-[#f0f0f0] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-[#141414]">3. Human-in-the-Loop Verification</h4>
          <p className="text-xs text-[#595959] leading-relaxed">
            Meskipun pencarian berita dilakukan secara otomatis oleh crawler dan dianalisis oleh AI (Gemini), penetapan 1 berita utama harian <b>mutlak melalui verifikasi tim analis BPS</b> untuk mencegah halusinasi data dan menjamin netralitas statistik.
          </p>
        </div>

      </div>

      {/* Dual-Pillar Framework Visualization */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] border border-[#f0f0f0] space-y-5">
        <div className="flex items-center gap-2 border-b border-[#f0f0f0] pb-3">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-bold text-[#141414]">
            Struktur Pembobotan Sektoral Kabupaten Tana Tidung (2025/2026)
          </h4>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Pillar 1: Lapangan Usaha */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#141414] uppercase tracking-wide">
                Pilar 1: Lapangan Usaha (Supply-Side)
              </span>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                Top 4 = 88.14% PDRB
              </span>
            </div>
            <p className="text-xs text-[#595959]">
              AI memprioritaskan berita yang berdampak langsung pada 4 sektor primer penopang utama ekonomi Tana Tidung:
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-[#141414]">Sektor B: Pertambangan Batubara & Lignit</span>
                <span className="font-mono font-bold text-blue-600">37.80%</span>
              </div>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-[#141414]">Sektor A: Perkebunan Buah Kelapa Sawit & Tani</span>
                <span className="font-mono font-bold text-blue-600">23.41%</span>
              </div>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-[#141414]">Sektor F: Konstruksi Fisik & Infrastruktur</span>
                <span className="font-mono font-bold text-blue-600">18.50%</span>
              </div>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-[#141414]">Sektor A02: Kehutanan & Pemanenan Kayu</span>
                <span className="font-mono font-bold text-blue-600">8.44%</span>
              </div>
            </div>
          </div>

          {/* Pillar 2: Pengeluaran */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#141414] uppercase tracking-wide">
                Pilar 2: Komponen Pengeluaran (Demand-Side)
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Top 2 = 81.36% PDRB
              </span>
            </div>
            <p className="text-xs text-[#595959]">
              Setiap fenomena produksi diterjemahkan ke pos pengeluaran moneter terkait:
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-[#141414]">Pos 6: Net Ekspor Antardaerah (Pengapalan CPO & Batubara)</span>
                <span className="font-mono font-bold text-emerald-600">49.98%</span>
              </div>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-[#141414]">Pos 4: PMTB (Investasi Modal Fisik, Mesin, & Konstruksi)</span>
                <span className="font-mono font-bold text-emerald-600">31.38%</span>
              </div>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-[#141414]">Pos 2: Konsumsi Pemerintah (PK-P / APBD KTT)</span>
                <span className="font-mono font-bold text-slate-600">9.80%</span>
              </div>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-[#141414]">Pos 1: Konsumsi Rumah Tangga (PK-RT Pangan & Jasa)</span>
                <span className="font-mono font-bold text-slate-600">7.06%</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Daily Operating Lifecycle */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] border border-[#f0f0f0] space-y-4">
        <h4 className="text-sm font-bold text-[#141414] flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>Siklus Operasional Harian ODON (WITA / UTC+8)</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          
          <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 space-y-1.5">
            <span className="text-[11px] font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 inline-block">
              05:00 WITA
            </span>
            <h5 className="text-xs font-bold text-[#141414]">1. Multi-Portal Crawler</h5>
            <p className="text-[11px] text-[#595959] leading-relaxed">
              Bot menyisir 5 portal berita (Radar Tarakan, Benuanta, Fokus Borneo, Tribun Kaltara, Antara Kaltara) untuk berita terbit H-1.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/50 space-y-1.5">
            <span className="text-[11px] font-mono font-bold text-sky-700 bg-white px-2 py-0.5 rounded border border-sky-200 inline-block">
              06:30 WITA
            </span>
            <h5 className="text-xs font-bold text-[#141414]">2. Ekstraksi AI & KBLI</h5>
            <p className="text-[11px] text-[#595959] leading-relaxed">
              Gemini AI mengekstrak ringkasan fenomena, menghitung skor relevansi, dan memetakan kode KBLI 2020 ↔ 2025.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50 space-y-1.5">
            <span className="text-[11px] font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-200 inline-block">
              07:30 WITA
            </span>
            <h5 className="text-xs font-bold text-[#141414]">3. Kurasi Tim Nerwilis</h5>
            <p className="text-[11px] text-[#595959] leading-relaxed">
              Analis BPS 6504 meninjau antrean kurasi, memvalidasi akurasi data, dan menetapkan 1 Berita ODON Utama hari itu.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-1.5">
            <span className="text-[11px] font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 inline-block">
              08:00 WITA
            </span>
            <h5 className="text-xs font-bold text-[#141414]">4. Sinkronisasi Sheet 6503</h5>
            <p className="text-[11px] text-[#595959] leading-relaxed">
              ODON hari itu resmi dipublikasikan ke portal publik, tercatat di Buku Kerja Sheet 6503, dan siap diunduh dalam format .xlsx.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}

