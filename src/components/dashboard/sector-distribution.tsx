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
      className="grid grid-cols-1 gap-5 lg:grid-cols-12"
    >
      {/* Left: 17 KBLI Ranked Sector Card */}
      <div className="saas-card rounded-2xl p-6 lg:col-span-7">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-hairline)] pb-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
              Distribusi 17 Lapangan Usaha (KBLI) &middot; {stats.quarter}{" "}
              {stats.year}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              Klik salah satu sektor untuk menyaring fenomena langsung di Meja Kurasi.
            </p>
          </div>
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 tabular-nums dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-200">
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
            {stats.kbliDistribution.map((item, idx) => {
              const code = item.category as KbliCode;
              const meta = KBLI_CATEGORIES[code];
              const pct =
                totalKbli > 0
                  ? Math.round((item.count / totalKbli) * 1000) / 10
                  : 0;
              const widthPct = Math.max(pct, 4);
              const shortCode =
                code === "M_N" ? "M,N" : code === "R_S_T_U" ? "R-U" : code;
              const isTopSector = idx < 3;

              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => onSelectKbli(code)}
                  className="group block w-full rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-[var(--border-hairline)] hover:bg-[var(--bg-canvas)]"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2.5 font-medium text-[var(--text-primary)] group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                      <span
                        className={`inline-flex h-6 min-w-[1.75rem] shrink-0 items-center justify-center rounded-lg px-1.5 font-mono text-[11px] font-bold ${
                          isTopSector
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                            : "border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {shortCode}
                      </span>
                      <span className="truncate">
                        {meta?.fullName ?? item.category}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-[var(--text-primary)] tabular-nums">
                      {item.count}{" "}
                      <span className="font-normal text-[var(--text-muted)]">
                        ({pct}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isTopSector
                          ? "bg-emerald-600 dark:bg-emerald-500"
                          : "bg-slate-400 dark:bg-slate-500"
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

      {/* Right: PDRB Expenditure Flow Card */}
      <div className="saas-card flex flex-col justify-between rounded-2xl p-6 lg:col-span-5">
        <div>
          <div className="border-b border-[var(--border-hairline)] pb-4">
            <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
              Komponen Pengeluaran PDRB
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              Transmisi dampak peristiwa terhadap konsumsi, investasi fisik, dan perdagangan wilayah.
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
                    className="group w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/70 p-3.5 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50/35 dark:hover:bg-emerald-950/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                          {meta?.label ?? item.component}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                          {meta?.description ?? ""}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-emerald-700 tabular-nums dark:text-emerald-300">
                        {item.count} kasus
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface)]">
                      <div
                        className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                        style={{ width: `${Math.max(share, 5)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-[var(--border-hairline)] pt-4 text-center">
          <button
            type="button"
            onClick={onOpenFeed}
            className="btn-secondary inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold"
          >
            <span>Buka Meja Kurasi Lengkap</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
