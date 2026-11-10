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

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Left: KBLI Distribution Matrix */}
      <div className="rounded-lg border border-slate-800 bg-[#131B2B] p-5 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-white">
              Sektor KBLI Mana yang Paling Banyak Tercatat pada {stats.quarter}{" "}
              {stats.year}?
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Distribusi peristiwa ekonomi terhadap 17 kategori Lapangan Usaha PDRB Kabupaten Tana Tidung. Klik sektor untuk memfilter tabel kurasi.
            </p>
          </div>
          <span className="rounded border border-slate-800 bg-[#0D131F] px-2.5 py-1 font-mono text-xs text-slate-300 tabular-nums">
            {totalKbli} Fenomena
          </span>
        </div>

        {stats.kbliDistribution.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Belum ada fenomena ekonomi yang teridentifikasi untuk periode{" "}
            <strong className="text-slate-200">
              {stats.quarter} {stats.year}
            </strong>
            . Jalankan penarikan berita atau pilih periode lain di bagian atas.
          </div>
        ) : (
          <div className="mt-4 space-y-2.5 font-mono text-xs">
            {stats.kbliDistribution.map((item) => {
              const code = item.category as KbliCode;
              const meta = KBLI_CATEGORIES[code];
              const pct =
                totalKbli > 0
                  ? Math.round((item.count / totalKbli) * 1000) / 10
                  : 0;
              const widthPct = Math.max(pct, 4);

              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => onSelectKbli(code)}
                  className="group block w-full rounded px-2 py-1.5 text-left transition-colors hover:bg-[#1A2438]"
                >
                  <div className="mb-1 flex items-center justify-between gap-3 text-slate-200">
                    <span className="truncate group-hover:text-sky-300">
                      {meta?.fullName ?? item.category}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-100 tabular-nums">
                      {item.count} Berita ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full border border-slate-800 bg-[#080C14]">
                    <div
                      className={`h-2 rounded-full transition-all ${meta?.barColor ?? "bg-sky-500"}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: PDRB Expenditure Split */}
      <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#131B2B] p-5">
        <div>
          <div className="border-b border-slate-800 pb-3">
            <h2 className="font-display text-sm font-semibold text-white">
              Transmisi Komponen Pengeluaran PDRB
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Jalur dampak ekonomi ke komponen pengeluaran wilayah.
            </p>
          </div>

          {stats.expenditureDistribution.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Belum ada pemetaan komponen pengeluaran pada periode ini.
            </div>
          ) : (
            <div className="mt-4 space-y-2 font-mono text-xs">
              {stats.expenditureDistribution.map((item) => {
                const code = item.component as ExpenditureCode;
                const meta = EXPENDITURE_COMPONENTS[code];

                return (
                  <button
                    key={item.component}
                    type="button"
                    onClick={() => onSelectExpenditure(code)}
                    className="flex w-full items-center justify-between gap-2 rounded border border-slate-800 bg-[#0D131F] p-2.5 text-left transition-colors hover:border-slate-700 hover:bg-[#1A2438]"
                  >
                    <div className="min-w-0">
                      <span className="block font-semibold text-slate-100">
                        {meta?.label ?? item.component}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400">
                        {meta?.description ?? ""}
                      </span>
                    </div>
                    <span className="shrink-0 font-bold text-sky-300 tabular-nums">
                      {item.count} Kasus
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-slate-800 pt-3 text-center">
          <button
            type="button"
            onClick={onOpenFeed}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 hover:underline"
          >
            <span>Buka Tabel Kurasi Lengkap</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

