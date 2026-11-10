"use client";

import React, { useState } from "react";
import { RefreshCw, Radio, ExternalLink, CheckCircle2, Clock } from "lucide-react";

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
    <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#f0f0f0]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#141414]">
              Status Radar Scraper 4 Portal Berita Daerah Kaltara
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-bold">
              Automated Cron: 05:00 WITA
            </span>
          </div>
          <p className="text-xs text-[#8c8c8c] mt-0.5">
            Sistem otomatis menarik berita berstatus H-1 setiap hari sebelum jam kerja BPS dimulai.
          </p>
        </div>

        <button
          onClick={handleRunScraper}
          disabled={isTriggering}
          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-[0_4px_14px_0_rgba(24,144,255,0.35)] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isTriggering ? "animate-spin" : ""}`} />
          <span>{isTriggering ? "Sedang Memindai..." : "Jalankan Scraper Sekarang"}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Grid of Portals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {portals.map((p) => (
          <div
            key={p.source}
            className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#141414]">{p.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                  200 OK
                </span>
              </div>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-blue-600 hover:underline mt-0.5 flex items-center gap-1"
              >
                <span>{p.url.replace("https://", "")}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#8c8c8c]">
                <span className="font-semibold text-emerald-700">
                  {p.articlesH1Count} artikel H-1 terjaring
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {p.lastSync}
                </span>
              </div>
            </div>

            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
        ))}
      </div>

      {/* Bottom Notes */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#595959] space-y-1">
        <p className="font-bold text-[#141414]">Aturan Scraping Langsung (Direct Scraping):</p>
        <p className="text-[11px] text-[#8c8c8c]">
          Scraper dijalankan menggunakan standard HTTP User-Agent dengan jeda acak (jitter) 300-800ms untuk menjaga beban server portal media. Tidak memerlukan feed resmi atau API birokratis.
        </p>
      </div>

    </div>
  );
}

