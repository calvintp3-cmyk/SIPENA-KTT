"use client";

import React from "react";
import { PDRB_KTT_WEIGHTS } from "@/lib/constants/taxonomy";

const BARS = [
  { key: "B", label: "1. Tambang Batubara (B)", gradient: "from-slate-700 to-slate-900" },
  { key: "A", label: "2. Sawit & Pertanian (A)", gradient: "from-emerald-400 to-emerald-600" },
  { key: "F", label: "3. Konstruksi Fisik (F)", gradient: "from-sky-400 to-blue-600" },
  { key: "O", label: "4. Administrasi Pemda (O)", gradient: "from-amber-300 to-amber-500" },
] as const;

export function PdrbWeightsCard() {
  const { lapanganUsaha, top4LapanganUsahaShare, top2PengeluaranShare } = PDRB_KTT_WEIGHTS;

  return (
    <div className="ui-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200/80">
        <div>
          <h4 className="ui-h2">Peta Bobot PDRB KTT 2025</h4>
          <p className="text-xs text-slate-500">Single Source of Truth Neraca</p>
        </div>
        <span className="ui-badge ui-badge-info num">Top 4 = {top4LapanganUsahaShare}%</span>
      </div>

      <div className="mt-5 space-y-4">
        {BARS.map((b) => {
          const weight = lapanganUsaha[b.key].weight;
          return (
            <div key={b.key}>
              <div className="flex justify-between items-baseline gap-3 mb-1.5 text-xs">
                <span className="font-semibold text-slate-800">{b.label}</span>
                <span className="num font-bold text-slate-900">{weight}%</span>
              </div>
              <div
                className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"
                role="progressbar"
                aria-valuenow={weight}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={b.label}
              >
                <div
                  className={`ui-bar-fill h-2 rounded-full bg-gradient-to-r ${b.gradient}`}
                  style={{ width: `${weight}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-slate-500">Net Ekspor + PMTB (Pengeluaran)</span>
        <span className="font-bold text-emerald-700 num">{top2PengeluaranShare}% Total</span>
      </div>
    </div>
  );
}
