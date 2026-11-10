"use client";

import { ArrowRight, Eye } from "lucide-react";
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

      {/* Priority Pending Ledger */}
      <section
        aria-label="Antrean Fenomena Menunggu Telaah Nerwilis"
        className="saas-card overflow-hidden rounded-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60 px-6 py-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
              Antrean Fenomena Menunggu Telaah ({stats.quarter} {stats.year})
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Kandidat terbaru hasil ekstraksi yang memerlukan verifikasi analis sebelum masuk rekonsiliasi PDRB.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenFeed}
            className="btn-secondary inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold"
          >
            <span>Lihat Semua di Meja Kurasi</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {stats.recentPending.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Tidak ada fenomena berstatus Pending pada {stats.quarter}{" "}
              {stats.year}.
            </p>
            <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-[var(--text-muted)]">
              Seluruh kandidat pada periode ini telah ditelaah atau Anda dapat meninjau riwayat keputusan di Meja Kurasi.
            </p>
            <button
              type="button"
              onClick={onOpenFeed}
              className="btn-secondary mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold"
            >
              <span>Buka Meja Kurasi</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-hairline)]">
            {stats.recentPending.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 p-5 transition-colors hover:bg-[var(--bg-canvas)]/65 md:flex-row md:items-center sm:px-6"
              >
                <div className="max-w-3xl space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceMediaLabel source={item.article.source} />
                    <span className="text-xs text-[var(--text-muted)] tabular-nums">
                      {formatIndonesianDate(item.article.publishedDate)}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>

                  <h3 className="text-[15px] font-semibold leading-snug text-[var(--text-primary)]">
                    <button
                      type="button"
                      onClick={() => onOpenReview(item)}
                      className="text-left transition-colors hover:text-emerald-800 dark:hover:text-emerald-300"
                    >
                      {item.article.title}
                    </button>
                  </h3>

                  <p className="max-w-2xl text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    {item.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <KbliBadge code={item.kbliCategory} compact />
                    <ExpenditureBadge code={item.expenditureComponent} />
                    <ImpactIndicator
                      impact={item.impactType}
                      effect={item.priceVolumeEffect}
                      inline
                    />
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenReview(item)}
                    className="btn-obsidian inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold md:w-auto"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Telaah di Meja Kurasi</span>
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
