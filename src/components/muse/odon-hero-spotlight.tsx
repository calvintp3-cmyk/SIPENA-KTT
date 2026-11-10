"use client";

import React from "react";
import {
  ShieldCheck,
  Cpu,
  Layers,
  Scale,
  ExternalLink,
  Edit3,
} from "lucide-react";

export interface OdonSpotlightData {
  id: string;
  entryDate: string; // "10 November 2026"
  releaseDate: string; // "09 Nov 2026"
  source: string; // "Radar Tarakan"
  sourceUrl: string;
  title: string;
  economicPhenomenonSummary: string;
  kbliCode2020: string; // "05100"
  kbliTitle2020: string; // "Pertambangan Batubara (37.8%)"
  kbliCode2025: string; // "05101"
  kbliTitle2025: string; // "Penambangan Batubara"
  kbliSecondary?: string; // "KBLI A (01262) - Sawit 23.4%"
  expenditureCode: string; // "Pos 6 • Net Ekspor Antar Daerah (49.98%)"
  expenditureSecondary?: string; // "Pos 4 • PMTB Modal Tetap (31.38%)"
  aggregateShare: string; // "81.36%"
  verifierName: string; // "Calvin (Tim Nerwilis KTT)"
  verifiedTime: string; // "10 Nov 07:15 WITA"
  relevanceScore: number; // 96
}

interface OdonHeroSpotlightProps {
  data: OdonSpotlightData;
  isAdmin: boolean;
  onEditClassification?: () => void;
}

export function OdonHeroSpotlight({
  data,
  isAdmin,
  onEditClassification,
}: OdonHeroSpotlightProps) {
  return (
    <div className="bg-[linear-gradient(135deg,#061126_0%,#0c214d_45%,#1852a8_85%,#1890ff_100%)] rounded-2xl p-6 sm:p-7 text-white shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] flex flex-col justify-between relative overflow-hidden">
      
      {/* Subtle lighting backdrop */}
      <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Banner Top Header */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono text-[11px] font-bold">
              ODON EDISI RESMI H-1
            </span>
            <span className="text-xs text-white/80 font-medium">{data.entryDate}</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Terverifikasi Nerwilis BPS
          </span>
        </div>

        {/* Headline & Meta */}
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs text-cyan-200 font-semibold mb-1">
            <span>{data.source}</span>
            <span>•</span>
            <span>Rilis: {data.releaseDate}</span>
            <span>•</span>
            <span>Relevansi PDRB: {data.relevanceScore}%</span>
          </div>
          
          <h3 className="text-lg sm:text-2xl font-bold text-white leading-snug">
            {data.title}
          </h3>
          
          {/* AI Synthesis Box */}
          <div className="mt-3.5 p-3.5 rounded-xl bg-black/25 border border-white/10 text-xs sm:text-[13px] text-white/90 leading-relaxed">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px] uppercase tracking-wider mb-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>Sintesis Fenomena Ekonomi (AI Nerwilis):</span>
            </div>
            {data.economicPhenomenonSummary}
          </div>
        </div>

        {/* Dual-Pillar Balancing Badges (Lapangan Usaha & Pengeluaran) */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs">
          
          {/* Pilar 1: Lapangan Usaha KBLI */}
          <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs border border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] uppercase tracking-wider text-cyan-200 font-bold flex items-center gap-1">
                <Layers className="w-3 h-3" /> Sisi Lapangan Usaha (KBLI)
              </span>
              <span className="text-emerald-300 font-bold font-mono">+12.4% Output</span>
            </div>
            <p className="font-bold text-white text-xs sm:text-sm">
              KBLI {data.kbliCode2020} • {data.kbliTitle2020}
            </p>
            {data.kbliSecondary && (
              <p className="text-[11px] text-white/70 mt-1">
                Tambahan: {data.kbliSecondary}
              </p>
            )}
            <div className="mt-2 text-[10px] text-cyan-200 font-mono bg-white/10 px-2 py-0.5 rounded w-fit">
              Mapping 2025: {data.kbliCode2025} ({data.kbliTitle2025})
            </div>
          </div>

          {/* Pilar 2: Pengeluaran PDRB */}
          <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-xs border border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold flex items-center gap-1">
                <Scale className="w-3 h-3" /> Sisi Pengeluaran PDRB
              </span>
              <span className="text-emerald-300 font-bold font-mono">
                Agregat {data.aggregateShare}
              </span>
            </div>
            <p className="font-bold text-white text-xs sm:text-sm">
              {data.expenditureCode}
            </p>
            {data.expenditureSecondary && (
              <p className="text-[11px] text-white/70 mt-1">
                Komponen: {data.expenditureSecondary}
              </p>
            )}
            <div className="mt-2 text-[10px] text-emerald-300 font-mono bg-white/10 px-2 py-0.5 rounded w-fit">
              Konfirmasi: Transshipment pelabuhan & kargo
            </div>
          </div>

        </div>
      </div>

      {/* Hero Action Footer */}
      <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-white/80">
          <span className="text-white/60">Verifikator:</span>
          <span className="font-bold text-white">{data.verifierName}</span>
          <span className="text-white/60">• {data.verifiedTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold transition-all inline-flex items-center gap-1.5"
          >
            <span>Buka Sumber Berita</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          {isAdmin && (
            <button
              onClick={onEditClassification}
              className="px-3.5 py-1.5 rounded-lg bg-white text-[#141414] font-bold hover:bg-slate-100 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Koreksi Klasifikasi</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

