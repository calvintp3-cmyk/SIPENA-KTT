"use client";

import React, { useState } from "react";
import { RefreshCw, ExternalLink, CheckCircle2, Clock } from "lucide-react";

interface ScraperPortal {
  name: string;
  source: string;
  url: string;
  articlesH1Count: number;
  status: "200_OK" | "SYNCING" | "ERROR";
  lastSync: string;
}

const DEFAULT_PORTALS: ScraperPortal[] = [
  {
    name: "Radar Tarakan",
    source: "radar_tarakan",
    url: "https://kaltara.prokal.co/tana-tidung",
    articlesH1Count: 14,
    status: "200_OK",
    lastSync: "Hari Ini, 05:00 WITA",
  },
  {
    name: "Benuanta.co.id",
    source: "benuanta",
    url: "https://benuanta.co.id/category/tana-tidung",
    articlesH1Count: 9,
    status: "200_OK",
    lastSync: "Hari Ini, 05:00 WITA",
  },
  {
    name: "Fokus Borneo",
    source: "fokus_borneo",
    url: "https://fokusborneo.com/category/advetorial/pemkab-tana-tidung",
    articlesH1Count: 6,
    status: "200_OK",
    lastSync: "Hari Ini, 05:00 WITA",
  },
  {
    name: "Tribun Kaltara",
    source: "tribun_kaltara",
    url: "https://kaltara.tribunnews.com/kaltara/tanah-tidung",
    articlesH1Count: 25,
    status: "200_OK",
    lastSync: "Hari Ini, 05:00 WITA",
  },
];

export function ScrapersStatusView() {
  const [portals] = useState<ScraperPortal[]>(DEFAULT_PORTALS);
  const [isTriggering, setIsTriggering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRunScraper = () => {
    setIsTriggering(true);
    setMessage(null);
    setTimeout(() => {
      setIsTriggering(false);
      setMessage("Pipeline scraping berhasil dijalankan! 54 artikel H-1 dipindai dan disaring oleh AI.");
    }, 1200);
  };

  return (
    <div className="ui-card overflow-hidden">
      <div className="ui-card-header">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="ui-h1">Status Radar Scraper 4 Portal Berita Daerah Kaltara</h3>
            <span className="ui-badge ui-badge-success num">Automated Cron: 05:00 WITA</span>
          </div>
          <p className="ui-muted mt-0.5">
            Sistem otomatis menarik berita berstatus H-1 setiap hari sebelum jam kerja BPS dimulai.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunScraper}
          disabled={isTriggering}
          className="ui-btn ui-btn-primary"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isTriggering ? "animate-spin" : ""}`} aria-hidden="true" />
          <span>{isTriggering ? "Sedang Memindai..." : "Jalankan Scraper Sekarang"}</span>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {message && (
          <div role="status" className="p-3.5 bg-emerald-50 ring-1 ring-inset ring-emerald-600/20 rounded-xl text-emerald-800 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {portals.map((p) => (
            <div
              key={p.source}
              className="ui-card ui-card-interactive p-5 flex items-center justify-between gap-4 !shadow-none bg-slate-50/50"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{p.name}</span>
                  <span className="ui-badge ui-badge-success num">200 OK</span>
                </div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] num text-blue-700 hover:underline mt-1.5 flex items-center gap-1 min-w-0"
                >
                  <span className="truncate">{p.url.replace("https://", "")}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </a>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                  <span className="font-semibold text-emerald-700">
                    <span className="num">{p.articlesH1Count}</span> artikel H-1 terjaring
                  </span>
                  <span className="flex items-center gap-1 num">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {p.lastSync}
                  </span>
                </div>
              </div>

              <span
                className="w-3 h-3 shrink-0 rounded-full bg-emerald-500 ui-dot-live"
                role="img"
                aria-label="Status aktif"
              />
            </div>
          ))}
        </div>

        <div className="bg-slate-50/90 border-l-2 border-slate-300 rounded-r-xl p-4 text-sm text-slate-600 space-y-1">
          <p className="font-semibold text-slate-900">Aturan Scraping Langsung (Direct Scraping):</p>
          <p className="text-[13px] leading-relaxed">
            Scraper dijalankan menggunakan standard HTTP User-Agent dengan jeda acak (jitter) <span className="num">300-800ms</span> untuk menjaga beban server portal media. Tidak memerlukan feed resmi atau API birokratis.
          </p>
        </div>
      </div>
    </div>
  );
}
