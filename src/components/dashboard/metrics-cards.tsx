"use client";

import { ArrowRight, CheckCircle2, Clock, Cpu, Newspaper } from "lucide-react";
import { SOURCE_MEDIA_LABELS } from "@/lib/constants/taxonomy";
import type { DashboardStatsPayload } from "@/types/client";

interface MetricsCardsProps {
  stats: DashboardStatsPayload;
  onInspectPending: () => void;
  onOpenExport: () => void;
}

export function MetricsCards({
  stats,
  onInspectPending,
  onOpenExport,
}: MetricsCardsProps) {
  const topSources = [...stats.sourceBreakdown]
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);

  const topSectors = stats.kbliDistribution.slice(0, 3).map((d) => d.category);

  return (
    <section
      aria-label="Indikator Utama Periode"
      className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* 1. Total Artikel Terindeks */}
      <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#131B2B] p-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px] uppercase tracking-wider">
            Artikel Terindeks
          </span>
          <Newspaper className="h-4 w-4 text-slate-400" aria-hidden="true" />
        </div>

        <div className="my-3 flex items-baseline gap-2.5">
          <span className="font-mono text-3xl font-bold text-white tabular-nums">
            {stats.totalArticles}
          </span>
          <span className="font-mono text-xs text-slate-300 tabular-nums">
            {stats.todayArticlesCount > 0
              ? `+${stats.todayArticlesCount} hari ini`
              : "Total arsip portal"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-2.5 font-mono text-[11px] text-slate-400">
          {topSources.length > 0 ? (
            topSources.map((s) => (
              <span key={s.source} className="truncate">
                {SOURCE_MEDIA_LABELS[s.source] ?? s.source}:{" "}
                <strong className="text-slate-200 tabular-nums">{s.count}</strong>
              </span>
            ))
          ) : (
            <span>Belum ada artikel terindeks</span>
          )}
        </div>
      </div>

      {/* 2. Fenomena Ekonomi Teridentifikasi */}
      <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#131B2B] p-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px] uppercase tracking-wider">
            Fenomena Teridentifikasi
          </span>
          <Cpu className="h-4 w-4 text-sky-400" aria-hidden="true" />
        </div>

        <div className="my-3 flex items-baseline gap-2.5">
          <span className="font-mono text-3xl font-bold text-sky-400 tabular-nums">
            {stats.totalEconomicPhenomena}
          </span>
          <span className="font-mono text-xs text-slate-300 tabular-nums">
            {stats.hitRatePercent}% relevan
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 font-mono text-[11px] text-slate-400">
          <span>Sektor dominan:</span>
          <span className="font-semibold text-sky-300">
            {topSectors.length > 0 ? topSectors.join(", ") : "-"}
          </span>
        </div>
      </div>

      {/* 3. Antrean Verifikasi */}
      <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#131B2B] p-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px] uppercase tracking-wider">
            Menunggu Verifikasi
          </span>
          <Clock
            className={`h-4 w-4 ${stats.pendingCount > 0 ? "text-amber-400" : "text-slate-400"}`}
            aria-hidden="true"
          />
        </div>

        <div className="my-3 flex items-baseline gap-2.5">
          <span className="font-mono text-3xl font-bold text-amber-400 tabular-nums">
            {stats.pendingCount}
          </span>
          <span className="rounded border border-amber-800/80 bg-amber-950 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-300">
            Periode {stats.quarter}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 font-mono text-[11px] text-slate-400">
          <span>Tindakan analis:</span>
          <button
            type="button"
            onClick={onInspectPending}
            className="inline-flex items-center gap-1 font-medium text-amber-300 hover:text-amber-200 hover:underline"
          >
            <span>Periksa antrean</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 4. Disetujui / Siap Diseminasi */}
      <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#131B2B] p-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px] uppercase tracking-wider">
            Disetujui (Siap Rilis)
          </span>
          <CheckCircle2
            className="h-4 w-4 text-emerald-400"
            aria-hidden="true"
          />
        </div>

        <div className="my-3 flex items-baseline gap-2.5">
          <span className="font-mono text-3xl font-bold text-emerald-400 tabular-nums">
            {stats.approvedCount}
          </span>
          <span className="font-mono text-xs text-slate-300 tabular-nums">
            {stats.rejectedCount} ditolak
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 font-mono text-[11px] text-slate-400">
          <span>Kertas kerja Excel:</span>
          <button
            type="button"
            onClick={onOpenExport}
            className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
          >
            Ekspor {stats.quarter} {stats.year}
          </button>
        </div>
      </div>
    </section>
  );
}

