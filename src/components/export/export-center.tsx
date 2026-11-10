"use client";

import { useEffect, useState } from "react";
import { Download, FileCheck2, Table2 } from "lucide-react";
import {
  EXPENDITURE_COMPONENTS,
  KBLI_CATEGORIES,
  SOURCE_MEDIA_LABELS,
} from "@/lib/constants/taxonomy";
import { formatShortDate } from "@/lib/utils";
import { ImpactIndicator, StatusBadge } from "../phenomena/status-badge";
import type {
  PeriodQuarter,
  SerializedPhenomenon,
} from "@/types/client";

interface ExportCenterProps {
  initialQuarter: PeriodQuarter;
  initialYear: number;
  onNotify: (message: string, tone?: "success" | "error") => void;
}

export function ExportCenter({
  initialQuarter,
  initialYear,
  onNotify,
}: ExportCenterProps) {
  const [quarter, setQuarter] = useState<PeriodQuarter>(initialQuarter);
  const [year, setYear] = useState<number>(initialYear);
  const [statusScope, setStatusScope] = useState<"approved" | "all">(
    "approved"
  );
  const [previewRows, setPreviewRows] = useState<SerializedPhenomenon[]>([]);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  // Sync if user changes global period selector
  useEffect(() => {
    setQuarter(initialQuarter);
    setYear(initialYear);
  }, [initialQuarter, initialYear]);

  useEffect(() => {
    let active = true;
    setIsLoadingPreview(true);

    const qs = new URLSearchParams();
    qs.set("quarter", quarter);
    qs.set("year", String(year));
    qs.set("limit", "10");
    qs.set("page", "1");
    if (statusScope === "approved") {
      qs.set("status", "approved");
    }

    fetch(`/api/phenomena?${qs.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as {
          data: SerializedPhenomenon[];
          pagination: { total: number };
        };
      })
      .then((json) => {
        if (!active) return;
        const economicOnly = json.data.filter((item) => item.isEconomicPhenomenon);
        setPreviewRows(economicOnly);
        setTotalMatches(json.pagination.total);
      })
      .catch(() => {
        if (!active) return;
        setPreviewRows([]);
        setTotalMatches(0);
      })
      .finally(() => {
        if (active) setIsLoadingPreview(false);
      });

    return () => {
      active = false;
    };
  }, [quarter, year, statusScope]);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    setIsDownloading(true);
    try {
      const qs = new URLSearchParams({
        quarter,
        year: String(year),
        status: statusScope,
      });
      const res = await fetch(`/api/export/excel?${qs.toString()}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        onNotify(
          err?.error ?? "Gagal membuat file Excel dari server.",
          "error"
        );
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Fenomena_Ekonomi_KTT_${quarter}_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      onNotify(
        `Berkas Fenomena_Ekonomi_KTT_${quarter}_${year}.xlsx berhasil diunduh.`,
        "success"
      );
    } catch {
      onNotify("Gagal mengunduh file Excel. Coba beberapa saat lagi.", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl rounded-lg border border-slate-800 bg-[#131B2B] p-6">
        <div className="border-b border-slate-800 pb-4">
          <div className="mb-1 flex items-center gap-2 font-mono text-xs text-emerald-400">
            <FileCheck2 className="h-4 w-4" aria-hidden="true" />
            <span>Format Resmi Diseminasi Nerwilis BPS Kabupaten Tana Tidung</span>
          </div>
          <h2 className="font-display text-lg font-semibold text-white">
            Ekspor Kertas Kerja Fenomena Ekonomi (.xlsx)
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Menghasilkan workbook Excel multi-sheet (Lapangan Usaha 17 KBLI, Komponen Pengeluaran PDRB, dan Ringkasan Eksekutif) untuk bahan rekonsiliasi PDRB dengan BPS Provinsi Kalimantan Utara.
          </p>
        </div>

        <form onSubmit={handleDownload} className="mt-5 space-y-5 text-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="export-year"
                className="mb-1.5 block font-mono text-[11px] uppercase text-slate-400"
              >
                Tahun Neraca
              </label>
              <select
                id="export-year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded border border-slate-700 bg-[#0D131F] p-2 font-mono text-white focus:border-sky-500 focus:outline-none"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="export-quarter"
                className="mb-1.5 block font-mono text-[11px] uppercase text-slate-400"
              >
                Triwulan Sasaran
              </label>
              <select
                id="export-quarter"
                value={quarter}
                onChange={(e) => setQuarter(e.target.value as PeriodQuarter)}
                className="w-full rounded border border-slate-700 bg-[#0D131F] p-2 font-mono text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="Q1">Triwulan I (Jan - Mar)</option>
                <option value="Q2">Triwulan II (Apr - Jun)</option>
                <option value="Q3">Triwulan III (Jul - Sep)</option>
                <option value="Q4">Triwulan IV (Okt - Des)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="export-status-scope"
                className="mb-1.5 block font-mono text-[11px] uppercase text-slate-400"
              >
                Cakupan Status Verifikasi
              </label>
              <select
                id="export-status-scope"
                value={statusScope}
                onChange={(e) =>
                  setStatusScope(e.target.value as "approved" | "all")
                }
                className="w-full rounded border border-slate-700 bg-[#0D131F] p-2 font-mono text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="approved">Hanya Disetujui (Approved)</option>
                <option value="all">Semua Status (Draft Rekonsiliasi)</option>
              </select>
            </div>
          </div>

          {/* Sheet breakdown summary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded border border-slate-800 bg-[#0D131F] p-3">
              <span className="block font-semibold text-white">
                Sheet 1: Lapangan Usaha KBLI
              </span>
              <span className="mt-1 block text-[11px] text-slate-400">
                Pengelompokan 17 kategori A s.d. U dengan narasi fenomena, komoditas, transmisi &amp; sumber rujukan.
              </span>
            </div>
            <div className="rounded border border-slate-800 bg-[#0D131F] p-3">
              <span className="block font-semibold text-white">
                Sheet 2: Komponen Pengeluaran
              </span>
              <span className="mt-1 block text-[11px] text-slate-400">
                Pemetaan PK-RT, PK-LNPRT, PK-P, PMTB, Perubahan Inventori, Ekspor &amp; Impor.
              </span>
            </div>
            <div className="rounded border border-slate-800 bg-[#0D131F] p-3">
              <span className="block font-semibold text-white">
                Sheet 3: Ringkasan Eksekutif
              </span>
              <span className="mt-1 block text-[11px] text-slate-400">
                Rekapitulasi jumlah fenomena per sektor, proporsi arah dampak, dan statistik periode.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <div className="font-mono text-[11px] text-slate-300 tabular-nums">
              Berkas sasaran:{" "}
              <span className="text-sky-300">
                Fenomena_Ekonomi_KTT_{quarter}_{year}.xlsx
              </span>{" "}
              ({totalMatches} entri cocok)
            </div>

            <button
              type="submit"
              disabled={isDownloading}
              className="inline-flex items-center gap-2 rounded bg-[#0284C7] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>
                {isDownloading
                  ? "Menyusun Workbook Excel..."
                  : "Unduh Berkas Excel (.xlsx)"}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Live Pre-Download Preview Table */}
      <div className="mx-auto max-w-4xl overflow-hidden rounded-lg border border-slate-800 bg-[#131B2B]">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#0D131F] px-4 py-3">
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <h3 className="font-display text-sm font-semibold text-white">
              Pratinjau Data Sebelum Unduh (Maks. 10 Baris Pertama)
            </h3>
          </div>
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            {quarter} {year} &middot;{" "}
            {statusScope === "approved" ? "Hanya Approved" : "Semua Status"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <caption className="visually-hidden">
              Pratinjau fenomena ekonomi untuk ekspor Excel {quarter} {year}
            </caption>
            <thead>
              <tr className="border-b border-slate-800 bg-[#080C14] font-mono text-[11px] uppercase text-slate-400">
                <th scope="col" className="px-3 py-2">
                  Tanggal &amp; Sumber
                </th>
                <th scope="col" className="px-3 py-2">
                  Sektor KBLI
                </th>
                <th scope="col" className="px-3 py-2">
                  Pengeluaran
                </th>
                <th scope="col" className="px-3 py-2">
                  Ringkasan Narasi BPS
                </th>
                <th scope="col" className="px-3 py-2">
                  Dampak
                </th>
                <th scope="col" className="px-3 py-2">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoadingPreview ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center font-mono text-slate-400"
                  >
                    Memuat pratinjau data ekspor...
                  </td>
                </tr>
              ) : previewRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Belum ada fenomena berstatus{" "}
                    <strong>
                      {statusScope === "approved" ? "Disetujui" : "Apapun"}
                    </strong>{" "}
                    pada {quarter} {year}.
                  </td>
                </tr>
              ) : (
                previewRows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#1A2438]/60">
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-slate-300 tabular-nums">
                      <div>{formatShortDate(row.article.publishedDate)}</div>
                      <div className="text-[10px] text-slate-400">
                        {SOURCE_MEDIA_LABELS[row.article.source] ??
                          row.article.source}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-sky-300">
                      {row.kbliCategory
                        ? KBLI_CATEGORIES[row.kbliCategory]?.shortName ??
                          row.kbliCategory
                        : "-"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-200">
                      {row.expenditureComponent
                        ? EXPENDITURE_COMPONENTS[row.expenditureComponent]
                            ?.label ?? row.expenditureComponent
                        : "-"}
                    </td>
                    <td className="max-w-md px-3 py-2.5 text-slate-200">
                      <p className="line-clamp-2">{row.summary}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <ImpactIndicator
                        impact={row.impactType}
                        effect={row.priceVolumeEffect}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

