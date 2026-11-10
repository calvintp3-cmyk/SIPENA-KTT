"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Download, FileCheck2, RotateCcw, Table2 } from "lucide-react";
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
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setQuarter(initialQuarter);
    setYear(initialYear);
  }, [initialQuarter, initialYear]);

  const loadPreview = useCallback(async () => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("quarter", quarter);
      qs.set("year", String(year));
      qs.set("limit", "10");
      qs.set("page", "1");
      if (statusScope === "approved") {
        qs.set("status", "approved");
      }

      const res = await fetch(`/api/phenomena?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        data: SerializedPhenomenon[];
        pagination: { total: number };
      };
      const economicOnly = json.data.filter((item) => item.isEconomicPhenomenon);
      setPreviewRows(economicOnly);
      setTotalMatches(json.pagination.total);
    } catch {
      setPreviewRows([]);
      setTotalMatches(0);
      setPreviewError(
        "Gagal memuat pratinjau data ekspor. Periksa koneksi lalu coba muat ulang."
      );
    } finally {
      setIsLoadingPreview(false);
    }
  }, [quarter, year, statusScope]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

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
      {/* Top Workbench: Parameters (7 Cols) + Official Sheet Blueprint (5 Cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-card lg:col-span-7 sm:p-6">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <FileCheck2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Format Resmi Diseminasi Nerwilis BPS Kab. Tana Tidung</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
              Konfigurasi Ekspor Kertas Kerja (.xlsx)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              Menghasilkan workbook Excel terstruktur untuk bahan rekonsiliasi PDRB Triwulanan bersama BPS Provinsi Kalimantan Utara.
            </p>
          </div>

          <form onSubmit={handleDownload} className="mt-5 space-y-5 text-xs">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <label
                  htmlFor="export-year"
                  className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Tahun Neraca
                </label>
                <select
                  id="export-year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="min-h-[44px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 font-mono text-xs font-semibold text-[var(--text-primary)] focus:outline-none sm:min-h-[42px]"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="export-quarter"
                  className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Triwulan Sasaran
                </label>
                <select
                  id="export-quarter"
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value as PeriodQuarter)}
                  className="min-h-[44px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 font-mono text-xs font-semibold text-[var(--text-primary)] focus:outline-none sm:min-h-[42px]"
                >
                  <option value="Q1">Q1 (Jan-Mar)</option>
                  <option value="Q2">Q2 (Apr-Jun)</option>
                  <option value="Q3">Q3 (Jul-Sep)</option>
                  <option value="Q4">Q4 (Okt-Des)</option>
                </select>
              </div>

              <div className="sm:col-span-5">
                <label
                  htmlFor="export-status-scope"
                  className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Cakupan Status Verifikasi
                </label>
                <select
                  id="export-status-scope"
                  value={statusScope}
                  onChange={(e) =>
                    setStatusScope(e.target.value as "approved" | "all")
                  }
                  className="min-h-[44px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none sm:min-h-[42px]"
                >
                  <option value="approved">Hanya Disetujui</option>
                  <option value="all">Semua Status (Draft)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-4">
              <div className="space-y-0.5 text-xs">
                <div className="text-[var(--text-muted)]">Nama berkas keluaran:</div>
                <div className="font-mono font-semibold text-[var(--accent-text)] tabular-nums">
                  Fenomena_Ekonomi_KTT_{quarter}_{year}.xlsx{" "}
                  <span className="font-normal text-[var(--text-muted)]">
                    ({totalMatches} entri cocok)
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isDownloading}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60 sm:w-auto"
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

        {/* Workbook Structure Specification */}
        <aside className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-card lg:col-span-5 sm:p-6">
          <h3 className="border-b border-[var(--border-subtle)] pb-3 text-sm font-bold text-[var(--text-primary)]">
            Struktur 3 Sheet Workbook Standar
          </h3>
          <ol className="mt-4 space-y-3.5 text-xs">
            <li className="border-b border-dashed border-[var(--border-subtle)] pb-3">
              <span className="block font-semibold text-[var(--text-primary)]">
                Sheet 1: Lapangan Usaha KBLI
              </span>
              <span className="mt-1 block leading-relaxed text-[var(--text-muted)]">
                Pengelompokan 17 kategori A s.d. U beserta narasi fenomena, komoditas terdampak, transmisi harga/volume, dan tautan berita rujukan.
              </span>
            </li>
            <li className="border-b border-dashed border-[var(--border-subtle)] pb-3">
              <span className="block font-semibold text-[var(--text-primary)]">
                Sheet 2: Komponen Pengeluaran PDRB
              </span>
              <span className="mt-1 block leading-relaxed text-[var(--text-muted)]">
                Pemetaan PK-RT, PK-LNPRT, PK-P, PMTB, Perubahan Inventori, Ekspor, dan Impor antar-daerah.
              </span>
            </li>
            <li>
              <span className="block font-semibold text-[var(--text-primary)]">
                Sheet 3: Ringkasan Eksekutif
              </span>
              <span className="mt-1 block leading-relaxed text-[var(--text-muted)]">
                Rekapitulasi jumlah fenomena per kategori KBLI, komposisi komponen pengeluaran, dan statistik cakupan periode.
              </span>
            </li>
          </ol>
        </aside>
      </div>

      {/* Live Pre-Download Preview Table */}
      <section
        aria-label="Pratinjau Data Sebelum Unduh"
        className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-[var(--accent-text)]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Pratinjau Data Sebelum Unduh (Maks. 10 Baris Pertama)
            </h3>
          </div>
          <span className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
            {quarter} {year} &middot;{" "}
            {statusScope === "approved" ? "Hanya Disetujui" : "Semua Status"}
          </span>
        </div>

        {previewError ? (
          <div role="alert" className="p-8 text-center">
            <AlertCircle
              className="mx-auto h-6 w-6 text-rose-600 dark:text-rose-400"
              aria-hidden="true"
            />
            <p className="mt-2 text-xs font-medium text-[var(--text-primary)]">
              {previewError}
            </p>
            <button
              type="button"
              onClick={() => void loadPreview()}
              className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] sm:min-h-[38px]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Muat Ulang Pratinjau</span>
            </button>
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="export-preview-caption"
            aria-busy={isLoadingPreview}
            className="overflow-x-auto"
          >
            <table className="w-full border-collapse text-left text-xs">
              <caption id="export-preview-caption" className="visually-hidden">
                Pratinjau fenomena ekonomi untuk ekspor Excel {quarter} {year}
              </caption>
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th scope="col" className="px-4 py-3">
                    Tanggal &amp; Sumber
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Sektor KBLI
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Pengeluaran
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Ringkasan Narasi BPS
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Dampak
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {isLoadingPreview ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3.5">
                        <div className="h-4 w-20 rounded bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="h-4 w-28 rounded bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="h-4 w-16 rounded bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="h-4 w-full rounded bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="h-4 w-16 rounded bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="h-5 w-20 rounded bg-[var(--bg-subtle)]" />
                      </td>
                    </tr>
                  ))
                ) : previewRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-[var(--text-muted)]"
                    >
                      Belum ada fenomena ekonomi berstatus{" "}
                      <strong className="text-[var(--text-primary)]">
                        {statusScope === "approved" ? "Disetujui" : "Apapun"}
                      </strong>{" "}
                      pada {quarter} {year}.
                      {statusScope === "approved" &&
                        " Anda dapat mengubah Cakupan Status menjadi Semua Status untuk pratinjau draf."}
                    </td>
                  </tr>
                ) : (
                  previewRows.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-[var(--bg-hover)]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-[var(--text-secondary)] tabular-nums">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {formatShortDate(row.article.publishedDate)}
                        </div>
                        <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                          {SOURCE_MEDIA_LABELS[row.article.source] ??
                            row.article.source}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-[var(--accent-text)]">
                        {row.kbliCategory
                          ? KBLI_CATEGORIES[row.kbliCategory]?.shortName ??
                            row.kbliCategory
                          : "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--text-primary)]">
                        {row.expenditureComponent
                          ? EXPENDITURE_COMPONENTS[row.expenditureComponent]
                              ?.label ?? row.expenditureComponent
                          : "-"}
                      </td>
                      <td className="max-w-md px-4 py-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                        <p className="line-clamp-2">{row.summary}</p>
                      </td>
                      <td className="px-4 py-3">
                        <ImpactIndicator
                          impact={row.impactType}
                          effect={row.priceVolumeEffect}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
