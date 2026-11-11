"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  CheckCircle,
  ExternalLink,
  Sparkles,
  SlidersHorizontal,
  Edit3,
  X,
  Filter,
  Layers,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

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
  onEditCandidate?: (candidate: CurationCandidate) => void;
  onRefreshScraper: () => void;
}

const SOURCES = [
  "Semua Portal",
  "Radar Tarakan",
  "Benuanta",
  "Fokus Borneo",
  "Tribun Kaltara",
  "Antara Kaltara",
];

export function CurationGrid({
  candidates,
  onApprove,
  onEditCandidate,
  onRefreshScraper,
}: CurationGridProps) {
  const [selectedSource, setSelectedSource] = useState("Semua Portal");
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      onRefreshScraper();
    }, 600);
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  const activeCandidates = candidates
    .filter((c) => !dismissedIds.includes(c.id))
    .filter((c) =>
      selectedSource === "Semua Portal" ? true : c.source.includes(selectedSource)
    );

  return (
    <div className="space-y-6">
      
      {/* Curation Control Header */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="text-sm font-bold text-[#141414]">
              Meja Kurasi AI — Hasil Scraper H-1 (05:00 WITA)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-bold">
              {activeCandidates.length} Berita Menunggu
            </span>
          </div>
          <p className="text-xs text-[#8c8c8c] mt-0.5">
            AI telah memfilter berita ekonomi dari 5 portal lokal. Tinjau dan tetapkan <b>1 Berita ODON Utama</b> hari ini.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-[#141414] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Menarik Berita..." : "Tarik Ulang Scraper"}</span>
        </button>
      </div>

      {/* Source Portal Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-[#8c8c8c] font-semibold flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter Portal:</span>
        </span>
        {SOURCES.map((src) => (
          <button
            key={src}
            onClick={() => setSelectedSource(src)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedSource === src
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-[#595959] hover:bg-slate-50 border border-slate-200/80"
            }`}
          >
            {src}
          </button>
        ))}
      </div>

      {/* Candidates Grid */}
      {activeCandidates.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#f0f0f0] space-y-2">
          <Sparkles className="w-8 h-8 text-[#8c8c8c] mx-auto" />
          <p className="text-xs font-semibold text-[#141414]">Antrean kurasi kosong atau telah disaring</p>
          <p className="text-[11px] text-[#8c8c8c]">Klik tombol "Tarik Ulang Scraper" untuk memeriksa berita terbaru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeCandidates.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border flex flex-col justify-between transition-all ${
                c.isRecommended
                  ? "border-blue-400 ring-2 ring-blue-500/20 shadow-[0_4px_14px_0_rgba(24,144,255,0.15)]"
                  : "border-[#f0f0f0] hover:border-slate-300"
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    {c.source}
                  </span>
                  {c.isRecommended ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Rekomendasi Utama AI
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDismiss(c.id)}
                      className="text-[#8c8c8c] hover:text-rose-600 p-1 rounded-md transition-colors"
                      title="Abaikan artikel ini"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Title & Summary */}
                <h4 className="font-bold text-[#141414] text-xs sm:text-sm mt-3 leading-snug">
                  {c.title}
                </h4>
                <p className="text-xs text-[#595959] mt-2 leading-relaxed">
                  {c.summary}
                </p>

                {/* Classification Mapping Box */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#8c8c8c]">Sisi Lapangan Usaha:</span>
                    <span className="font-bold text-[#141414] bg-white px-2 py-0.5 rounded border border-slate-200">
                      {c.kbliCategory} ({c.kbliCode})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#8c8c8c]">Sisi Pengeluaran:</span>
                    <span className="font-bold text-[#141414] truncate max-w-[150px]">
                      {c.expenditureCode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span className="text-[#8c8c8c]">Skor Relevansi:</span>
                    <span className="font-bold text-emerald-700 font-mono text-[11px]">
                      {c.score}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-[#f0f0f0] flex items-center justify-between gap-2">
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#8c8c8c] hover:text-[#141414] font-medium inline-flex items-center gap-1"
                >
                  <span>Cek Berita</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="flex items-center gap-2">
                  {onEditCandidate && (
                    <button
                      onClick={() => onEditCandidate(c)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[#595959] transition-all cursor-pointer"
                      title="Sesuaikan Klasifikasi KBLI/Pengeluaran"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => onApprove(c.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-[0_4px_14px_0_rgba(24,144,255,0.35)] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Tetapkan ODON</span>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
