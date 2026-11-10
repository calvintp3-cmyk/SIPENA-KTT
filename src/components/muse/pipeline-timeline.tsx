"use client";

import React from "react";
import { Check, Cpu, UserCheck, FileSpreadsheet } from "lucide-react";

export function PipelineTimeline() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0]">
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#141414]">
          Jejak Alur Kerja ODON
        </h4>
        <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
          Siklus Harian
        </span>
      </div>

      <div className="mt-4 space-y-3.5 text-xs">
        {/* Step 1 */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div className="w-0.5 h-7 bg-slate-200" />
          </div>
          <div className="pb-1">
            <p className="font-bold text-[#141414]">05:00 WITA — Scraper H-1 Selesai</p>
            <p className="text-[11px] text-[#8c8c8c]">
              Menjaring 54 artikel dari Radar Tarakan, Benuanta, Fokus Borneo & Tribun.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="w-0.5 h-7 bg-slate-200" />
          </div>
          <div className="pb-1">
            <p className="font-bold text-[#141414]">05:30 WITA — Ekstraksi AI Gemini</p>
            <p className="text-[11px] text-[#8c8c8c]">
              Mencocokkan bobot sektor KTT & membuang noise non-ekonomi.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="w-0.5 h-7 bg-slate-200" />
          </div>
          <div className="pb-1">
            <p className="font-bold text-[#141414]">07:15 WITA — Validasi Nerwilis</p>
            <p className="text-[11px] text-[#8c8c8c]">
              1 berita terpilih dan diklasifikasikan ke KBLI & Pengeluaran.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="pb-1">
            <p className="font-bold text-[#141414]">Sinkronisasi Sheet 6503</p>
            <p className="text-[11px] text-[#8c8c8c]">
              Data terverifikasi siap diekspor ke naskah publikasi PDRB Triwulanan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

