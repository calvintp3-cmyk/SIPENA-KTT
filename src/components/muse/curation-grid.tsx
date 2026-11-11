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
import { PORTAL_SOURCES } from "@/lib/constants/taxonomy";
import type { OdonCandidateDto } from "@/types/odon";

interface CurationGridProps {
  candidates: OdonCandidateDto[];
  onApprove: (candidate: OdonCandidateDto) => Promise<void>;
  onDismiss: (candidate: OdonCandidateDto) => Promise<void>;
  onEditCandidate?: (candidate: OdonCandidateDto) => void;
  onRefreshScraper: () => Promise<void>;
  isRefreshing?: boolean;
  busyCandidateId?: string | null;
}

const PORTAL_FILTERS = ["Semua Portal", ...PORTAL_SOURCES.map((p) => p.label)];

export function CurationGrid({
  candidates,
  onApprove,
  onDismiss,
  onEditCandidate,
  onRefreshScraper,
  isRefreshing = false,
  busyCandidateId = null,
}: CurationGridProps) {
  const [selectedSource, setSelectedSource] = useState("Semua Portal");

  const activeCandidates = candidates.filter((c) =>
    selectedSource === "Semua Portal" ? true : c.source.includes(selectedSource)
  );

  return (
    <div className="space-y-6">
      {/* Control header */}
      <div className="ui-card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full bg-blue-600 ui-dot-live"
              style={{ ["--dot" as string]: "rgba(37,99,235,0.45)" }}
              aria-hidden="true"
            />
            <h3 className="ui-h1">Meja Kurasi AI • Hasil Scraper & Usulan OPD</h3>
            <span className="ui-badge ui-badge-info num">
              {activeCandidates.length} Kandidat Menunggu
            </span>
          </div>
          <p className="ui-muted mt-1 max-w-3xl">
            Antrean live dari PostgreSQL (<code className="text-xs">economic_phenomena</code>{" "}
            & <code className="text-xs">odon_entries</code>). Tinjau dan tetapkan sebagai{" "}
            <b className="font-semibold text-slate-900">Berita ODON Terverifikasi</b> Sheet 6503.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void onRefreshScraper()}
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

      {/* Source filter: segmented control across all 7 portals */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-500 font-semibold shrink-0">Filter Portal:</span>
        <div className="ui-seg" role="group" aria-label="Filter portal berita">
          {PORTAL_FILTERS.map((src) => (
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
          <p className="text-sm font-semibold text-slate-900">
            {candidates.length === 0
              ? "Semua antrean kurasi telah selesai diproses"
              : "Tidak ada kandidat dari portal yang dipilih"}
          </p>
          <p className="ui-muted">
            Klik tombol Tarik Ulang Scraper atau terima usulan dari tab Moderasi Usulan OPD.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
          {activeCandidates.map((c) => {
            const isBusy = busyCandidateId === c.id;
            const scoreText =
              c.confidenceScore != null
                ? `${Math.round(c.confidenceScore * 100)}% Keyakinan AI • Bobot ${c.pdrbWeightPercent.toFixed(2)}%`
                : `Prioritas Sektor • Bobot ${c.pdrbWeightPercent.toFixed(2)}%`;

            return (
              <article
                key={c.id}
                className={`ui-card ui-card-interactive p-5 flex flex-col justify-between ${
                  c.isRecommended
                    ? "ring-2 ring-blue-500/80 shadow-lg shadow-blue-500/5 !border-blue-300"
                    : ""
                }`}
              >
                <div>
                  {/* Card header */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="ui-badge ui-badge-info truncate">{c.source}</span>
                      <span className="text-[11px] text-slate-400 num shrink-0">
                        {c.publishedDateLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.isRecommended && (
                        <span className="ui-badge ui-badge-success">
                          <Sparkles className="w-3 h-3" aria-hidden="true" />
                          Prioritas PDRB
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void onDismiss(c)}
                        className="w-8 h-8 inline-flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Abaikan artikel ini"
                        aria-label={`Abaikan artikel: ${c.title}`}
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
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
                        <span className="ui-kbli !w-6 !h-6 !text-[11px]" aria-hidden="true">
                          {c.kbliCategory}
                        </span>
                        <span className="num">
                          {c.kbliCode2020} → {c.kbliCode2025}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <dt className="text-slate-500 shrink-0">Sisi Pengeluaran:</dt>
                      <dd className="font-semibold text-slate-900 text-right num">
                        {c.expenditureLabel}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center gap-3 pt-2.5 border-t border-slate-200">
                      <dt className="text-slate-500">Skor & Bobot:</dt>
                      <dd className="font-bold text-emerald-700 num text-right">{scoreText}</dd>
                    </div>
                  </dl>
                </div>

                {/* Action bar */}
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
                        disabled={isBusy}
                        onClick={() => onEditCandidate(c)}
                        className="ui-icon-btn"
                        title="Sesuaikan Klasifikasi KBLI/Pengeluaran"
                        aria-label={`Edit klasifikasi: ${c.title}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onApprove(c)}
                      className="ui-btn ui-btn-primary"
                    >
                      <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isBusy ? "Menyimpan..." : "Tetapkan ODON"}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
