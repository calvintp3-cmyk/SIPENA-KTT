"use client";

import React from "react";
import { RefreshCw, CheckCircle, ExternalLink, Sparkles } from "lucide-react";

export interface CurationCandidate {
  id: string;
  source: string;
  sourceUrl: string;
  title: string;
  summary: string;
  kbliCategory: string;
  kbliCode: string;
  kbliDesc: string;
  expenditureCode: string;
  score: string;
  isRecommended: boolean;
}

interface CurationGridProps {
  candidates: CurationCandidate[];
  onApprove: (id: string) => void;
  onRefreshScraper: () => void;
}

export function CurationGrid({
  candidates,
  onApprove,
  onRefreshScraper,
}: CurationGridProps) {
  return (
    <div className="space-y-6">
      
      {/* Curation Header Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#141414]">
              Meja Kurasi Berita H-1 (Hasil Scraper Pagi 05:00 WITA)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-bold">
              {candidates.length} Berita Menunggu
            </span>
          </div>
          <p className="text-xs text-[#8c8c8c] mt-0.5">
            AI telah mengekstrak kandidat berita ekonomi. Pilih <b>1 berita utama</b> untuk ditetapkan sebagai ODON hari ini.
          </p>
        </div>

        <button
          onClick={onRefreshScraper}
          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-[#141414] flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
          <span>Tarik Ulang Scraper</span>
        </button>
      </div>

      {/* Grid of Candidate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidates.map((c) => (
          <div
            key={c.id}
            className={`bg-white rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border flex flex-col justify-between transition-all ${
              c.isRecommended
                ? "border-blue-400 ring-2 ring-blue-500/20 shadow-[0_4px_14px_0_rgba(24,144,255,0.15)]"
                : "border-[#f0f0f0]"
            }`}
          >
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#f0f0f0]">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700">
                  {c.source}
                </span>
                {c.isRecommended && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Rekomendasi Utama
                  </span>
                )}
              </div>

              {/* Title & Summary */}
              <h4 className="font-bold text-[#141414] text-xs sm:text-sm mt-3 leading-snug">
                {c.title}
              </h4>
              <p className="text-xs text-[#8c8c8c] mt-2 leading-relaxed">
                {c.summary}
              </p>

              {/* Classification Meta */}
              <div className="mt-4 pt-3 border-t border-[#f0f0f0] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8c8c8c]">Mapping KBLI:</span>
                  <span className="font-bold text-[#141414]">
                    {c.kbliCategory} ({c.kbliCode})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c8c8c]">Pengeluaran:</span>
                  <span className="font-bold text-[#141414]">{c.expenditureCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c8c8c]">Relevansi PDRB:</span>
                  <span className="font-bold text-emerald-600 font-mono">{c.score}</span>
                </div>
              </div>
            </div>

            {/* Card Action Footer */}
            <div className="mt-5 pt-3 border-t border-[#f0f0f0] flex items-center justify-between">
              <a
                href={c.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#8c8c8c] hover:text-[#141414] font-medium inline-flex items-center gap-1"
              >
                <span>Buka Berita</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={() => onApprove(c.id)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-[0_4px_14px_0_rgba(24,144,255,0.35)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Tetapkan ODON</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

