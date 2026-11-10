"use client";

import { Activity, Eye } from "lucide-react";
import { formatIndonesianDate } from "@/lib/utils";
import { MetricsCards } from "./metrics-cards";
import { SectorDistribution } from "./sector-distribution";
import {
  ExpenditureBadge,
  ImpactIndicator,
  KbliBadge,
  SourceMediaLabel,
  StatusBadge,
} from "../phenomena/status-badge";
import type {
  DashboardStatsPayload,
  ExpenditureCode,
  KbliCode,
  SerializedPhenomenon,
} from "@/types/client";

interface OverviewPanelProps {
  stats: DashboardStatsPayload;
  onInspectPending: () => void;
  onOpenExport: () => void;
  onSelectKbli: (code: KbliCode) => void;
  onSelectExpenditure: (code: ExpenditureCode) => void;
  onOpenFeed: () => void;
  onOpenReview: (phenomenon: SerializedPhenomenon) => void;
}

export function OverviewPanel({
  stats,
  onInspectPending,
  onOpenExport,
  onSelectKbli,
  onSelectExpenditure,
  onOpenFeed,
  onOpenReview,
}: OverviewPanelProps) {
  return (
    <div className="space-y-6">
      <MetricsCards
        stats={stats}
        onInspectPending={onInspectPending}
        onOpenExport={onOpenExport}
      />

      <SectorDistribution
        stats={stats}
        onSelectKbli={onSelectKbli}
        onSelectExpenditure={onSelectExpenditure}
        onOpenFeed={onOpenFeed}
      />

      {/* Pending Curated Queue Preview */}
      <section className="overflow-hidden rounded-lg border border-slate-800 bg-[#131B2B]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#0D131F]/60 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-white">
              Antrean Fenomena Menunggu Telaah Nerwilis ({stats.quarter}{" "}
              {stats.year})
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenFeed}
            className="text-xs font-medium text-slate-300 hover:text-white hover:underline"
          >
            Lihat seluruh data di Tabel Kurasi &rarr;
          </button>
        </div>

        {stats.recentPending.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-200">
              Tidak ada fenomena berstatus Pending pada {stats.quarter}{" "}
              {stats.year}.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Semua kandidat fenomena telah diverifikasi atau Anda dapat memeriksa arsip berita pada Tabel Kurasi Lengkap.
            </p>
            <button
              type="button"
              onClick={onOpenFeed}
              className="mt-4 inline-flex items-center rounded border border-slate-700 bg-[#0D131F] px-3.5 py-1.5 text-xs font-medium text-sky-300 hover:bg-[#1A2438]"
            >
              Periksa Tabel Kurasi
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800 text-xs">
            {stats.recentPending.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-[#1A2438]/70 md:flex-row md:items-center"
              >
                <div className="max-w-3xl space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceMediaLabel source={item.article.source} />
                    <span className="font-mono text-[11px] text-slate-400">
                      {formatIndonesianDate(item.article.publishedDate)}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>

                  <h3 className="text-sm font-semibold leading-snug text-white">
                    {item.article.title}
                  </h3>

                  <p className="text-xs leading-relaxed text-slate-300">
                    {item.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <KbliBadge code={item.kbliCategory} />
                    <ExpenditureBadge code={item.expenditureComponent} />
                    <ImpactIndicator
                      impact={item.impactType}
                      effect={item.priceVolumeEffect}
                    />
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenReview(item)}
                    className="inline-flex items-center gap-1.5 rounded bg-[#0284C7] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-500"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Telaah &amp; Verifikasi</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

