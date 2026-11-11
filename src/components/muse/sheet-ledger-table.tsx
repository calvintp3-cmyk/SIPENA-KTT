"use client";

import React, { useState, useMemo } from "react";
import { Download, Edit3, CheckCircle } from "lucide-react";
import { PDRB_LAPANGAN_USAHA_2025 } from "@/lib/constants/taxonomy";
import type { OdonLedgerRowDto } from "@/types/odon";

interface SheetLedgerTableProps {
  rows: OdonLedgerRowDto[];
  isAdmin: boolean;
  onEditRow?: (row: OdonLedgerRowDto) => void;
  onExportExcel: () => void;
}

const PAGE_SIZE = 15;

const SORTED_SECTORS = Object.values(PDRB_LAPANGAN_USAHA_2025).sort(
  (a, b) => b.weight - a.weight
);

export function SheetLedgerTable({
  rows,
  isAdmin,
  onEditRow,
  onExportExcel,
}: SheetLedgerTableProps) {
  const [triwulanFilter, setTriwulanFilter] = useState<string>("all");
  const [kbliFilter, setKbliFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (triwulanFilter !== "all" && r.quarter !== triwulanFilter) return false;
      if (kbliFilter !== "all" && r.kbliCategory !== kbliFilter) return false;
      return true;
    });
  }, [rows, triwulanFilter, kbliFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const handleTriwulanChange = (val: string) => {
    setTriwulanFilter(val);
    setPage(1);
  };

  const handleKbliChange = (val: string) => {
    setKbliFilter(val);
    setPage(1);
  };

  return (
    <section className="ui-card overflow-hidden">
      {/* Controls */}
      <div className="ui-card-header">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="ui-h1">Buku Kerja ODON 2026 (Format Resmi Sheet 6503)</h3>
            <span className="ui-badge ui-badge-success num">
              {filteredRows.length} Entri Ditampilkan
            </span>
          </div>
          <p className="ui-muted mt-0.5">
            Struktur kolom Sheet 6503 terhubung langsung ke tabel PostgreSQL{" "}
            <code className="text-xs">odon_entries</code> &{" "}
            <code className="text-xs">odon_classifications</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter triwulan"
            value={triwulanFilter}
            onChange={(e) => handleTriwulanChange(e.target.value)}
            className="ui-select-sm"
          >
            <option value="all">Semua Triwulan</option>
            <option value="Q1">Triwulan I (Jan-Mar)</option>
            <option value="Q2">Triwulan II (Apr-Jun)</option>
            <option value="Q3">Triwulan III (Jul-Sep)</option>
            <option value="Q4">Triwulan IV (Okt-Des)</option>
          </select>

          <select
            aria-label="Filter sektor KBLI"
            value={kbliFilter}
            onChange={(e) => handleKbliChange(e.target.value)}
            className="ui-select-sm"
          >
            <option value="all">Semua 17 Sektor KBLI</option>
            {SORTED_SECTORS.map((sec) => (
              <option key={sec.code} value={sec.code}>
                KBLI {sec.code} • {sec.name} ({sec.weight.toFixed(2)}%)
              </option>
            ))}
          </select>

          <button type="button" onClick={onExportExcel} className="ui-btn ui-btn-primary">
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download .XLSX</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="ui-table min-w-[920px]">
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "29%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="text-center">No</th>
              <th scope="col">Tanggal Entri</th>
              <th scope="col">Kanal Portal</th>
              <th scope="col">Judul Berita & Ringkasan Fenomena</th>
              <th scope="col">Sisi Lapangan Usaha (KBLI)</th>
              <th scope="col">Sisi Pengeluaran</th>
              <th scope="col" className="text-center">Kurasi Nerwilis</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, idx) => (
              <tr key={row.id}>
                <td className="text-center num font-semibold text-slate-500">
                  {(safePage - 1) * PAGE_SIZE + idx + 1}
                </td>
                <td>
                  <span className="num font-semibold text-slate-900 text-xs">{row.entryDate}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 num">
                    Rilis {row.releaseDate} • {row.quarter} {row.year}
                  </span>
                </td>
                <td>
                  <span className="ui-badge ui-badge-info whitespace-normal">{row.source}</span>
                </td>
                <td>
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-slate-900 hover:text-blue-700 transition-colors leading-snug block"
                  >
                    {row.title}
                  </a>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1 line-clamp-2">
                    {row.summary}
                  </p>
                </td>
                <td>
                  <div className="flex items-start gap-2.5">
                    <span className="ui-kbli" aria-hidden="true">
                      {row.kbliCategory}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-900 num">
                        {row.kbliCode2020} → {row.kbliCode2025}
                      </span>
                      <span className="block text-[11px] text-slate-600 mt-0.5 leading-snug">
                        {row.kbliTitle2020}
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5 num">
                        Bobot PDRB: {row.pdrbWeightPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="ui-badge ui-badge-success whitespace-normal num">
                    {row.expenditureLabel}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1 capitalize">
                    Dampak: {row.impactType}
                  </span>
                </td>
                <td className="text-center">
                  {isAdmin && onEditRow ? (
                    <button
                      type="button"
                      onClick={() => onEditRow(row)}
                      className="ui-icon-btn"
                      title="Koreksi Klasifikasi"
                      aria-label={`Koreksi klasifikasi: ${row.title}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="ui-badge ui-badge-success">
                      <CheckCircle className="w-3 h-3" aria-hidden="true" />
                      Terverifikasi
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={7} className="!py-12 text-center text-slate-500">
                  {rows.length === 0
                    ? "Belum ada entri ODON terverifikasi di database. Gunakan Meja Kurasi AI untuk menetapkan entri pertama."
                    : "Tidak ada entri yang cocok dengan filter yang dipilih."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <span>
          Total <span className="num font-semibold">{filteredRows.length}</span> Berita ODON Terverifikasi
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="ui-btn ui-btn-secondary !min-h-8 !px-3"
          >
            Sebelumnya
          </button>
          <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-blue-600 text-white font-bold num">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="ui-btn ui-btn-secondary !min-h-8 !px-3"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </section>
  );
}
