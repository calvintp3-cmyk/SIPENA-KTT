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
        className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              Antrean Fenomena Menunggu Telaah ({stats.quarter} {stats.year})
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Kandidat terbaru hasil ekstraksi yang memerlukan verifikasi analis sebelum masuk rekonsiliasi PDRB.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenFeed}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] sm:min-h-[36px]"
          >
            <span>Lihat Semua Data</span>
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
              Seluruh kandidat pada periode ini telah ditelaah atau Anda dapat meninjau riwayat keputusan melalui Tabel Kurasi Lengkap.
            </p>
            <button
              type="button"
              onClick={onOpenFeed}
              className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-4 py-2 text-xs font-semibold text-[var(--accent-text)] transition-colors hover:bg-[var(--bg-hover)] sm:min-h-[38px]"
            >
              <span>Buka Tabel Kurasi Lengkap</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {stats.recentPending.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 p-5 transition-colors hover:bg-[var(--bg-hover)]/75 md:flex-row md:items-center"
              >
                <div className="max-w-3xl space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceMediaLabel source={item.article.source} />
                    <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                      {formatIndonesianDate(item.article.publishedDate)}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>

                  <h3 className="text-sm font-semibold leading-snug text-[var(--text-primary)]">
                    <button
                      type="button"
                      onClick={() => onOpenReview(item)}
                      className="text-left transition-colors hover:text-[var(--accent-text)]"
                    >
                      {item.article.title}
                    </button>
                  </h3>

                  <p className="max-w-2xl text-xs leading-relaxed text-[var(--text-secondary)]">
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
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-primary-hover)] sm:min-h-[40px] md:w-auto"
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
