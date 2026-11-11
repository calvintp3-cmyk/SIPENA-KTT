"use client";

import React from "react";
import {
  ShieldCheck,
  Cpu,
  Layers,
  Scale,
  ExternalLink,
  Edit3,
  Newspaper,
} from "lucide-react";
import type { OdonSpotlightDto } from "@/types/odon";

interface OdonHeroSpotlightProps {
  data: OdonSpotlightDto | null;
  isAdmin: boolean;
  onEditClassification?: () => void;
}

const IMPACT_LABELS: Record<OdonSpotlightDto["impactType"], string> = {
  positif: "Positif / Ekspansif",
  negatif: "Negatif / Terkontraksi",
  netral: "Netral / Stabil",
};

export function OdonHeroSpotlight({
  data,
  isAdmin,
  onEditClassification,
}: OdonHeroSpotlightProps) {
  if (!data) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 text-white shadow-xl shadow-slate-900/10 ring-1 ring-white/10 h-full flex flex-col items-center justify-center text-center gap-3 min-h-[320px]">
        <Newspaper className="w-10 h-10 text-sky-300 opacity-80" aria-hidden="true" />
        <h3 className="text-lg font-bold text-white">Belum Ada Edisi ODON Terverifikasi</h3>
        <p className="text-sm text-slate-300 max-w-md leading-relaxed">
          Pilih dan tetapkan 1 berita kandidat di tab Meja Kurasi AI untuk menampilkannya sebagai sorotan resmi harian Sheet 6503.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-slate-900/10 ring-1 ring-white/10 h-full flex flex-col justify-between gap-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-16 w-96 h-96 rounded-full bg-blue-600/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-20 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl"
      />

      <div className="relative">
        {/* Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-inset ring-white/20 text-white num text-[11px] font-bold">
              ODON EDISI TERBARU
            </span>
            <span className="text-xs text-slate-300 font-medium">{data.entryDate}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/30 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Terverifikasi Nerwilis BPS
          </span>
        </div>

        {/* Headline */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-sky-200 font-semibold mb-2">
            <span>{data.source}</span>
            <span aria-hidden="true">•</span>
            <span>
              Rilis: <span className="num">{data.releaseDate}</span>
            </span>
            <span aria-hidden="true">•</span>
            <span>
              Periode:{" "}
              <span className="num">
                {data.quarter} {data.year}
              </span>
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl lg:text-[1.75rem] font-bold text-white leading-tight tracking-tight">
            {data.title}
          </h3>

          {/* Synthesis */}
          <div className="mt-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-[13px] sm:text-sm text-slate-100 leading-relaxed">
            <div className="flex items-center gap-1.5 text-sky-300 font-semibold text-xs mb-1.5">
              <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ringkasan Fenomena Ekonomi (Nerwilis BPS 6504):</span>
            </div>
            {data.economicPhenomenonSummary}
          </div>
        </div>

        {/* Dual pillars */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs text-sky-300 font-semibold inline-flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" aria-hidden="true" /> Sisi Lapangan Usaha (KBLI {data.kbliCategory})
              </span>
              <span className="text-emerald-300 font-bold num text-xs">
                {data.kbliWeightPercent.toFixed(2)}% PDRB KTT
              </span>
            </div>
            <p className="font-bold text-white text-sm leading-snug">
              KBLI <span className="num">{data.kbliCode2020}</span> • {data.kbliTitle2020}
            </p>
            <div className="mt-3 text-[11px] text-sky-200 num bg-white/10 px-2.5 py-1 rounded-lg w-fit max-w-full break-words">
              Mapping KBLI 2025: {data.kbliCode2025} ({data.kbliTitle2025})
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs text-emerald-300 font-semibold inline-flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" aria-hidden="true" /> Sisi Pengeluaran PDRB
              </span>
              <span className="text-emerald-300 font-bold num text-xs">
                Bobot {data.aggregateShare}
              </span>
            </div>
            <p className="font-bold text-white text-sm leading-snug">{data.expenditureCode}</p>
            <div className="mt-3 text-[11px] text-emerald-200 num bg-white/10 px-2.5 py-1 rounded-lg w-fit max-w-full break-words">
              Arah Dampak: {IMPACT_LABELS[data.impactType]}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-2 text-slate-300">
          <span className="text-slate-400">Verifikator:</span>
          <span className="font-semibold text-white">{data.verifierName}</span>
          <span className="text-slate-400 num">• {data.verifiedTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ui-btn bg-white/10 hover:bg-white/20 text-white ring-1 ring-inset ring-white/15"
          >
            <span>Buka Sumber Berita</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
          {isAdmin && onEditClassification && (
            <button
              type="button"
              onClick={onEditClassification}
              className="ui-btn bg-white text-slate-900 hover:bg-slate-100 shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Koreksi Klasifikasi</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
