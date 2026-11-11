"use client";

import React, { useState, useMemo } from "react";
import { Download, Edit3, CheckCircle, ExternalLink } from "lucide-react";

export interface OdonLedgerRow {
  id: string;
  entryDate: string; // "10/11/2026"
  releaseDate: string; // "09/11"
  source: string;
  sourceUrl: string;
  title: string;
  summary: string;
  kbliCategory: string; // "B"
  kbliCode: string; // "05100"
  kbliDesc: string; // "Batubara • 37.8%"
  kbli2025: string; // "05101"
  expenditureCode: string; // "Net Ekspor (49.98%)"
  expenditureDesc: string; // "PMTB Logistik (31.38%)"
  triwulan: "Q1" | "Q2" | "Q3" | "Q4";
  status: "verified" | "pending";
}

interface SheetLedgerTableProps {
  rows: OdonLedgerRow[];
  isAdmin: boolean;
  onEditRow?: (id: string) => void;
  onExportExcel: () => void;
}

export function SheetLedgerTable({
  rows,
  isAdmin,
  onEditRow,
  onExportExcel,
}: SheetLedgerTableProps) {
  const [triwulanFilter, setTriwulanFilter] = useState<string>("all");
  const [kbliFilter, setKbliFilter] = useState<string>("all");
  const [searchFilter] = useState<string>("");

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (triwulanFilter !== "all" && r.triwulan !== triwulanFilter) return false;
      if (kbliFilter !== "all" && r.kbliCategory !== kbliFilter) return false;
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchSummary = r.summary.toLowerCase().includes(q);
        const matchKbli = r.kbliCode.includes(q) || r.kbliDesc.toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchKbli) return false;
      }
      return true;
    });
  }, [rows, triwulanFilter, kbliFilter, searchFilter]);

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
            Struktur kolom 100% identik dengan spreadsheet kompilasi BPS Tana Tidung.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter triwulan"
            value={triwulanFilter}
            onChange={(e) => setTriwulanFilter(e.target.value)}
            className="ui-select-sm"
          >
            <option value="all">Semua Triwulan</option>
            <option value="Q4">Triwulan IV (Okt-Des)</option>
            <option value="Q3">Triwulan III (Jul-Sep)</option>
            <option value="Q2">Triwulan II (Apr-Jun)</option>
            <option value="Q1">Triwulan I (Jan-Mar)</option>
          </select>

          <select
            aria-label="Filter sektor KBLI"
            value={kbliFilter}
            onChange={(e) => setKbliFilter(e.target.value)}
            className="ui-select-sm"
          >
            <option value="all">Semua Sektor KBLI</option>
            <option value="B">KBLI B • Tambang Batubara (37.8%)</option>
            <option value="A">KBLI A • Sawit & Pertanian (23.4%)</option>
            <option value="F">KBLI F • Konstruksi (18.5%)</option>
            <option value="O">KBLI O • Pemkab KTT (8.5%)</option>
            <option value="G">KBLI G • Perdagangan (5.1%)</option>
          </select>

          <button type="button" onClick={onExportExcel} className="ui-btn ui-btn-primary">
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download .XLSX</span>
          </button>
        </div>
      </div>

      {/* Table: fixed layout with proportional columns, fits the container on desktop */}
      <div className="overflow-x-auto">
        <table className="ui-table min-w-[880px]">
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="text-center">No</th>
              <th scope="col">Tanggal (H-1)</th>
              <th scope="col">Kanal Portal</th>
              <th scope="col">Judul Berita & Ringkasan Fenomena</th>
              <th scope="col">Sisi Lapangan Usaha (KBLI)</th>
              <th scope="col">Sisi Pengeluaran</th>
              <th scope="col" className="text-center">Kurasi Nerwilis</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={row.id}>
                <td className="text-center num font-semibold text-slate-500">{idx + 1}</td>
                <td>
                  <span className="num font-semibold text-slate-900 text-xs">{row.entryDate}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Rilis: <span className="num">{row.releaseDate}</span>
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
                    <span className="ui-kbli" aria-hidden="true">{row.kbliCategory}</span>
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-900">
                        KBLI {row.kbliCategory} (<span className="num">{row.kbliCode}</span>)
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5 num">{row.kbliDesc}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="ui-badge ui-badge-success whitespace-normal num">
                    {row.expenditureCode}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1 num">
                    {row.expenditureDesc}
                  </span>
                </td>
                <td className="text-center">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => onEditRow?.(row.id)}
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
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} className="!py-12 text-center text-slate-500">
                  Tidak ada entri yang cocok dengan filter yang dipilih.
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
          <button type="button" disabled className="ui-btn ui-btn-secondary !min-h-8 !px-3">
            Sebelumnya
          </button>
          <span className="inline-flex items-center justify-center min-w-8 h-8 rounded-lg bg-blue-600 text-white font-bold num">
            1
          </span>
          <button type="button" disabled className="ui-btn ui-btn-secondary !min-h-8 !px-3">
            Selanjutnya
          </button>
        </div>
      </div>
    </section>
  );
}
