"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  CheckCircle,
  ExternalLink,
  Sparkles,
  Edit3,
  X,
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
      {/* Control header */}
      <div className="ui-card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ui-dot-live" style={{ ["--dot" as string]: "rgba(37,99,235,0.45)" }} aria-hidden="true" />
            <h3 className="ui-h1">Meja Kurasi AI — Hasil Scraper H-1 (05:00 WITA)</h3>
            <span className="ui-badge ui-badge-info num">
              {activeCandidates.length} Berita Menunggu
            </span>
          </div>
          <p className="ui-muted mt-1 max-w-3xl">
            AI telah memfilter berita ekonomi dari 5 portal lokal. Tinjau dan tetapkan <b className="font-semibold text-slate-900">1 Berita ODON Utama</b> hari ini.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="ui-btn ui-btn-secondary"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isRefreshing ? "Menarik Berita..." : "Tarik Ulang Scraper"}</span>
        </button>
      </div>

      {/* Source filter: segmented control */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-500 font-semibold shrink-0">Filter Portal:</span>
        <div className="ui-seg" role="group" aria-label="Filter portal berita">
          {SOURCES.map((src) => (
            <button
              key={src}
              type="button"
              aria-pressed={selectedSource === src}
              onClick={() => setSelectedSource(src)}
              className="ui-seg-item"
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Candidates */}
      {activeCandidates.length === 0 ? (
        <div className="ui-card p-12 text-center space-y-2">
          <Sparkles className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-900">Antrean kurasi kosong atau telah disaring</p>
          <p className="ui-muted">Klik tombol "Tarik Ulang Scraper" untuk memeriksa berita terbaru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
          {activeCandidates.map((c) => (
            <article
              key={c.id}
              className={`ui-card ui-card-interactive p-5 flex flex-col justify-between ${
                c.isRecommended ? "ring-2 ring-blue-500/80 shadow-lg shadow-blue-500/5 !border-blue-300" : ""
              }`}
            >
              <div>
                {/* Card header */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                  <span className="ui-badge ui-badge-info">{c.source}</span>
                  {c.isRecommended ? (
                    <span className="ui-badge ui-badge-success">
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      Rekomendasi Utama AI
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDismiss(c.id)}
                      className="w-8 h-8 inline-flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Abaikan artikel ini"
                      aria-label={`Abaikan artikel: ${c.title}`}
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <h4 className="font-semibold text-slate-900 text-[15px] mt-4 leading-snug tracking-tight">
                  {c.title}
                </h4>
                <p className="text-[13px] text-slate-600 mt-2 leading-relaxed font-normal">
                  {c.summary}
                </p>

                {/* Classification */}
                <dl className="mt-4 p-3.5 rounded-xl bg-slate-50/90 ring-1 ring-inset ring-slate-200/80 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center gap-3">
                    <dt className="text-slate-500">Sisi Lapangan Usaha:</dt>
                    <dd className="inline-flex items-center gap-2 font-semibold text-slate-900">
                      <span className="ui-kbli !w-6 !h-6 !text-[11px]" aria-hidden="true">{c.kbliCategory}</span>
                      <span className="num">{c.kbliCode}</span>
                    </dd>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <dt className="text-slate-500 shrink-0">Sisi Pengeluaran:</dt>
                    <dd className="font-semibold text-slate-900 text-right num">{c.expenditureCode}</dd>
                  </div>
                  <div className="flex justify-between items-center gap-3 pt-2.5 border-t border-slate-200">
                    <dt className="text-slate-500">Skor Relevansi:</dt>
                    <dd className="font-bold text-emerald-700 num">{c.score}</dd>
                  </div>
                </dl>
              </div>

              {/* Action bar: pinned to the card bottom so all cards align */}
              <div className="mt-5 pt-4 border-t border-slate-200/80 flex items-center justify-between gap-2">
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  <span>Cek Berita</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>

                <div className="flex items-center gap-2">
                  {onEditCandidate && (
                    <button
                      type="button"
                      onClick={() => onEditCandidate(c)}
                      className="ui-icon-btn"
                      title="Sesuaikan Klasifikasi KBLI/Pengeluaran"
                      aria-label="Edit klasifikasi"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onApprove(c.id)}
                    className="ui-btn ui-btn-primary"
                  >
                    <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Tetapkan ODON</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
