"use client";

import React from "react";
import { PDRB_KTT_WEIGHTS } from "@/lib/constants/taxonomy";

export function PdrbWeightsCard() {
  const { lapanganUsaha, top4LapanganUsahaShare, pengeluaran, top2PengeluaranShare } =
    PDRB_KTT_WEIGHTS;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0]">
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#141414]">
            Peta Bobot PDRB KTT 2025
          </h4>
          <p className="text-[11px] text-[#8c8c8c]">Single Source of Truth Neraca</p>
        </div>
        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
          Top 4 = {top4LapanganUsahaShare}%
        </span>
      </div>

      <div className="mt-4 space-y-3 text-xs">
        <div>
          <div className="flex justify-between font-semibold text-[#141414] mb-1 text-[11px]">
            <span>1. Tambang Batubara (B)</span>
            <span className="font-mono font-bold">{lapanganUsaha.B.weight}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-slate-800 h-2 rounded-full transition-all"
              style={{ width: `${lapanganUsaha.B.weight}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between font-semibold text-[#141414] mb-1 text-[11px]">
            <span>2. Sawit & Pertanian (A)</span>
            <span className="font-mono font-bold">{lapanganUsaha.A.weight}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${lapanganUsaha.A.weight}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between font-semibold text-[#141414] mb-1 text-[11px]">
            <span>3. Konstruksi Fisik (F)</span>
            <span className="font-mono font-bold">{lapanganUsaha.F.weight}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${lapanganUsaha.F.weight}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between font-semibold text-[#141414] mb-1 text-[11px]">
            <span>4. Administrasi Pemda (O)</span>
            <span className="font-mono font-bold">{lapanganUsaha.O.weight}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-amber-600 h-2 rounded-full transition-all"
              style={{ width: `${lapanganUsaha.O.weight}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#f0f0f0] flex items-center justify-between text-[11px]">
        <span className="text-[#8c8c8c]">Net Ekspor + PMTB (Pengeluaran)</span>
        <span className="font-bold text-emerald-700 font-mono">
          {top2PengeluaranShare}% Total
        </span>
      </div>
    </div>
  );
}

