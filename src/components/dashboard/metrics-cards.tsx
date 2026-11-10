"use client";

import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { KBLI_CATEGORIES, SOURCE_MEDIA_LABELS } from "@/lib/constants/taxonomy";
import type { DashboardStatsPayload, KbliCode } from "@/types/client";

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
    .slice(0, 3);

  const topSectors = stats.kbliDistribution.slice(0, 3);

  const totalPeriodCurated =
    stats.pendingCount + stats.approvedCount + stats.rejectedCount;
  const approvedPct =
    totalPeriodCurated > 0
      ? Math.round((stats.approvedCount / totalPeriodCurated) * 100)
      : 0;
  const pendingPct =
    totalPeriodCurated > 0
      ? Math.round((stats.pendingCount / totalPeriodCurated) * 100)
      : 0;
  const rejectedPct =
    totalPeriodCurated > 0
      ? Math.max(0, 100 - approvedPct - pendingPct)
      : 0;

  const hasPendingBacklog = stats.pendingCount > 0;

  return (
    <section
      aria-label="Ringkasan Kesiapan Kompilasi dan Cakupan Media"
      className="grid grid-cols-1 gap-4 lg:grid-cols-12"
    >
      {/* Primary Focus Panel: Quarterly Curation & Verification Decision */}
      <div className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-card lg:col-span-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
              {hasPendingBacklog ? (
                <Clock
                  className="h-4 w-4 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2
                  className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
              )}
              <span>
                Status Kurasi Periode {stats.quarter} {stats.year}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-3xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums sm:text-4xl">
                {hasPendingBacklog ? stats.pendingCount : stats.approvedCount}
              </span>
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {hasPendingBacklog
                  ? "fenomena menunggu verifikasi Nerwilis"
                  : "fenomena disetujui siap diseminasi"}
              </span>
            </div>
          </div>

          {hasPendingBacklog ? (
            <button
              type="button"
              onClick={onInspectPending}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-primary-hover)] sm:min-h-[40px]"
            >
              <span>Periksa Antrean Pending</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenExport}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-primary-hover)] sm:min-h-[40px]"
            >
              <span>Ekspor {stats.quarter} {stats.year}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Stacked Progress Distribution Bar */}
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--text-secondary)]">
              Progres Validasi Analis ({totalPeriodCurated} total kandidat)
            </span>
            <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
              {approvedPct}% terverifikasi siap rilis
            </span>
          </div>

          <div
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)] ring-1 ring-inset ring-[var(--border-subtle)]"
            role="img"
            aria-label={`Komposisi status: ${stats.approvedCount} disetujui, ${stats.pendingCount} pending, ${stats.rejectedCount} ditolak`}
          >
            {approvedPct > 0 && (
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-500"
                style={{ width: `${approvedPct}%` }}
              />
            )}
            {pendingPct > 0 && (
              <div
                className="h-full bg-amber-500 dark:bg-amber-400"
                style={{ width: `${pendingPct}%` }}
              />
            )}
            {rejectedPct > 0 && (
              <div
                className="h-full bg-slate-400 dark:bg-slate-600"
                style={{ width: `${rejectedPct}%` }}
              />
            )}
          </div>
        </div>

        {/* Breakdown Figures */}
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-4">
          <div>
            <dt className="text-[11px] font-medium text-[var(--text-muted)]">
              Disetujui
            </dt>
            <dd className="mt-0.5 font-mono text-lg font-bold text-emerald-700 tabular-nums dark:text-emerald-300">
              {stats.approvedCount}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-[var(--text-muted)]">
              Pending / Revisi
            </dt>
            <dd className="mt-0.5 font-mono text-lg font-bold text-amber-700 tabular-nums dark:text-amber-300">
              {stats.pendingCount}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-[var(--text-muted)]">
              Ditolak
            </dt>
            <dd className="mt-0.5 font-mono text-lg font-bold text-[var(--text-secondary)] tabular-nums">
              {stats.rejectedCount}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-[var(--text-muted)]">
              Relevansi Ekonomi
            </dt>
            <dd className="mt-0.5 font-mono text-lg font-bold text-[var(--accent-text)] tabular-nums">
              {stats.hitRatePercent}%
            </dd>
          </div>
        </dl>
      </div>

      {/* Secondary Panel: Archival Ingestion Telemetry & Dominant Sectors */}
      <div className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-card lg:col-span-5">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <div className="text-xs font-semibold text-[var(--text-secondary)]">
              Cakupan Arsip Berita Daerah
            </div>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span className="font-mono text-3xl font-bold text-[var(--text-primary)] tabular-nums">
                {stats.totalArticles}
              </span>
              <span className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
                {stats.todayArticlesCount > 0
                  ? `+${stats.todayArticlesCount} masuk hari ini`
                  : `${stats.totalEconomicPhenomena} fenomena pada periode ini`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenExport}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] sm:min-h-[36px]"
          >
            Ekspor
          </button>
        </div>

        {/* Media Contributors */}
        <div className="my-4 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Kontributor Sumber Teratas
          </div>
          {topSources.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              Belum ada artikel berita terindeks pada basis data.
            </p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {topSources.map((s) => (
                <li
                  key={s.source}
                  className="flex items-center justify-between border-b border-dashed border-[var(--border-subtle)] pb-1.5 last:border-b-0 last:pb-0"
                >
                  <span className="font-medium text-[var(--text-secondary)]">
                    {SOURCE_MEDIA_LABELS[s.source] ?? s.source}
                  </span>
                  <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                    {s.count} artikel
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dominant Sector Footnote */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs">
          <span className="font-medium text-[var(--text-muted)]">
            Sektor KBLI dominan:
          </span>
          {topSectors.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 font-mono">
              {topSectors.map((sec) => {
                const meta = KBLI_CATEGORIES[sec.category as KbliCode];
                const label =
                  sec.category === "M_N"
                    ? "M,N"
                    : sec.category === "R_S_T_U"
                      ? "R-U"
                      : sec.category;
                return (
                  <span
                    key={sec.category}
                    title={meta?.fullName ?? sec.category}
                    className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-primary)] tabular-nums"
                  >
                    {label} ({sec.count})
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="font-mono text-[var(--text-muted)]">-</span>
          )}
        </div>
      </div>
    </section>
  );
}
