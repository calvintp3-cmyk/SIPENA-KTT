"use client";

import { ArrowRight } from "lucide-react";
import {
  EXPENDITURE_COMPONENTS,
  KBLI_CATEGORIES,
} from "@/lib/constants/taxonomy";
import type {
  DashboardStatsPayload,
  ExpenditureCode,
  KbliCode,
} from "@/types/client";

interface SectorDistributionProps {
  stats: DashboardStatsPayload;
  onSelectKbli: (code: KbliCode) => void;
  onSelectExpenditure: (code: ExpenditureCode) => void;
  onOpenFeed: () => void;
}

export function SectorDistribution({
  stats,
  onSelectKbli,
  onSelectExpenditure,
  onOpenFeed,
}: SectorDistributionProps) {
  const totalKbli = stats.kbliDistribution.reduce(
    (sum, item) => sum + item.count,
    0
  );
  const totalExpenditure = stats.expenditureDistribution.reduce(
    (sum, item) => sum + item.count,
    0
  );

  return (
    <section
      aria-label="Analisis Distribusi Sektor KBLI dan Pengeluaran PDRB"
      className="grid grid-cols-1 gap-4 lg:grid-cols-12"
    >
      {/* Left: 17 KBLI Ranked Sector Matrix */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-card lg:col-span-7">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3.5">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              Sektor KBLI Mana yang Paling Banyak Tercatat pada {stats.quarter}{" "}
              {stats.year}?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              Sebaran fenomena pada 17 Lapangan Usaha PDRB Kab. Tana Tidung. Pilih sektor untuk memfilter Tabel Kurasi.
            </p>
          </div>
          <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--text-primary)] tabular-nums">
            {totalKbli} Fenomena
          </span>
        </div>

        {stats.kbliDistribution.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Belum ada fenomena ekonomi terklasifikasi pada {stats.quarter}{" "}
              {stats.year}.
            </p>
            <p className="mt-1 max-w-md text-xs text-[var(--text-muted)]">
              Pilih periode triwulan lain pada bilah atas atau jalankan penarikan berita baru untuk mengisi distribusi KBLI.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {stats.kbliDistribution.map((item) => {
              const code = item.category as KbliCode;
              const meta = KBLI_CATEGORIES[code];
              const pct =
                totalKbli > 0
                  ? Math.round((item.count / totalKbli) * 1000) / 10
                  : 0;
              const widthPct = Math.max(pct, 4);
              const shortCode =
                code === "M_N" ? "M,N" : code === "R_S_T_U" ? "R-U" : code;

              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => onSelectKbli(code)}
                  className="group block w-full rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors hover:border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-text)]">
                      <span
                        className={`inline-flex h-5 min-w-[1.5rem] shrink-0 items-center justify-center rounded px-1 font-mono text-[10px] font-bold text-white ${
                          meta?.swatchColor ?? "bg-sky-700"
                        }`}
                      >
                        {shortCode}
                      </span>
                      <span className="truncate">
                        {meta?.fullName ?? item.category}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                      {item.count}{" "}
                      <span className="font-normal text-[var(--text-muted)]">
                        ({pct}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)] ring-1 ring-inset ring-[var(--border-subtle)]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        meta?.barColor ?? "bg-sky-600"
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: PDRB Expenditure Flow Breakdown */}
      <div className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-card lg:col-span-5">
        <div>
          <div className="border-b border-[var(--border-subtle)] pb-3.5">
            <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              Bagaimana Transmisi ke Pengeluaran PDRB?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              Peta dampak peristiwa terhadap komponen konsumsi, investasi fisik, dan perdagangan wilayah.
            </p>
          </div>

          {stats.expenditureDistribution.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              Belum ada pemetaan komponen pengeluaran untuk {stats.quarter}{" "}
              {stats.year}.
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {stats.expenditureDistribution.map((item) => {
                const code = item.component as ExpenditureCode;
                const meta = EXPENDITURE_COMPONENTS[code];
                const share =
                  totalExpenditure > 0
                    ? Math.round((item.count / totalExpenditure) * 100)
                    : 0;

                return (
                  <button
                    key={item.component}
                    type="button"
                    onClick={() => onSelectExpenditure(code)}
                    className="group w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block font-mono text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-text)]">
                          {meta?.label ?? item.component}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                          {meta?.description ?? ""}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-xs font-bold text-[var(--accent-text)] tabular-nums">
                        {item.count} kasus
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-primary)] dark:bg-sky-400"
                        style={{ width: `${Math.max(share, 5)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-[var(--border-subtle)] pt-3.5 text-center">
          <button
            type="button"
            onClick={onOpenFeed}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-text)] transition-colors hover:bg-[var(--bg-hover)] hover:underline sm:min-h-[38px]"
          >
            <span>Buka Tabel Kurasi Lengkap</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
