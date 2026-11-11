"use client";

import React, { useState } from "react";
import { RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { OdonSourceStatusDto } from "@/types/odon";

interface ScrapersStatusViewProps {
  sources: OdonSourceStatusDto[];
  onRunScraper: () => Promise<{ ok: boolean; message: string }>;
}

export function ScrapersStatusView({
  sources,
  onRunScraper,
}: ScrapersStatusViewProps) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const handleRun = async () => {
    setIsTriggering(true);
    setFeedback(null);
    try {
      const result = await onRunScraper();
      setFeedback(result);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="ui-card overflow-hidden">
      <div className="ui-card-header">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="ui-h1">
              Status Radar Scraper {sources.length} Portal Berita Kaltara & Nasional
            </h3>
            <span className="ui-badge ui-badge-success num">Cron Jadwal: 05:00 WITA</span>
          </div>
          <p className="ui-muted mt-0.5">
            Cakupan sumber resmi SSoT beserta jumlah artikel aktual di database PostgreSQL.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={isTriggering}
          className="ui-btn ui-btn-primary"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isTriggering ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isTriggering ? "Sedang Memindai Portal..." : "Jalankan Scraper Sekarang"}</span>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {feedback && (
          <div
            role={feedback.ok ? "status" : "alert"}
            className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 ring-1 ring-inset ${
              feedback.ok
                ? "bg-emerald-50 ring-emerald-600/20 text-emerald-800"
                : "bg-rose-50 ring-rose-600/20 text-rose-800"
            }`}
          >
            {feedback.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {sources.map((p) => (
            <div
              key={p.source}
              className="ui-card ui-card-interactive p-5 flex items-center justify-between gap-4 !shadow-none bg-slate-50/50"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{p.label}</span>
                  <span
                    className={`ui-badge ${
                      p.scope === "national" ? "ui-badge-info" : "ui-badge-success"
                    }`}
                  >
                    {p.scope === "national" ? "Nasional" : "Regional Kaltara"}
                  </span>
                </div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] num text-blue-700 hover:underline mt-1.5 flex items-center gap-1 min-w-0"
                >
                  <span className="truncate">{p.url.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </a>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                  <span className="font-semibold text-emerald-700">
                    <span className="num">{p.articlesCount}</span> artikel tersimpan di DB
                  </span>
                  <span className="flex items-center gap-1 num">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {p.lastSyncedAt ?? `Jadwal ${p.schedule}`}
                  </span>
                </div>
              </div>

              <span
                className={`w-3 h-3 shrink-0 rounded-full ${
                  p.articlesCount > 0 ? "bg-emerald-500 ui-dot-live" : "bg-amber-400"
                }`}
                role="img"
                aria-label={p.articlesCount > 0 ? "Terdapat artikel di database" : "Siap dipindai"}
              />
            </div>
          ))}
        </div>

        <div className="bg-slate-50/90 border-l-2 border-slate-300 rounded-r-xl p-4 text-sm text-slate-600 space-y-1">
          <p className="font-semibold text-slate-900">Proteksi SSRF & Aturan Direct Scraping:</p>
          <p className="text-[13px] leading-relaxed">
            Setiap URL melewati validasi <code className="text-xs">isAllowedScraperUrl</code> terhadap daftar domain terpercaya pada <code className="text-xs">ALLOWED_SCRAPER_DOMAINS</code> dengan jeda acak <span className="num">300-800ms</span> serta pembersihan tag skrip/iklan sebelum ekstraksi Gemini AI.
          </p>
        </div>
      </div>
    </div>
  );
}
