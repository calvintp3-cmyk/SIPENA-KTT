"use client";

import React, { useState, useMemo } from "react";
import { Download, Edit3, CheckCircle, ExternalLink, Filter } from "lucide-react";

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
  const [searchFilter, setSearchFilter] = useState<string>("");

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
    <section className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] overflow-hidden">
      
      {/* Table Header Controls */}
      <div className="p-5 border-b border-[#f0f0f0] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#141414]">
              Buku Kerja ODON 2026 (Format Resmi Sheet 6503)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-bold">
              {filteredRows.length} Entri Ditampilkan
            </span>
          </div>
          <p className="text-xs text-[#8c8c8c] mt-0.5">
            Struktur kolom 100% identik dengan spreadsheet kompilasi BPS Tana Tidung.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Triwulan Filter */}
          <select
            value={triwulanFilter}
            onChange={(e) => setTriwulanFilter(e.target.value)}
            className="h-8 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#141414] focus:outline-none"
          >
            <option value="all">Semua Triwulan</option>
            <option value="Q4">Triwulan IV (Okt-Des)</option>
            <option value="Q3">Triwulan III (Jul-Sep)</option>
            <option value="Q2">Triwulan II (Apr-Jun)</option>
            <option value="Q1">Triwulan I (Jan-Mar)</option>
          </select>

          {/* KBLI Filter */}
          <select
            value={kbliFilter}
            onChange={(e) => setKbliFilter(e.target.value)}
            className="h-8 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#141414] focus:outline-none"
          >
            <option value="all">Semua Sektor KBLI</option>
            <option value="B">KBLI B • Tambang Batubara (37.8%)</option>
            <option value="A">KBLI A • Sawit & Pertanian (23.4%)</option>
            <option value="F">KBLI F • Konstruksi (18.5%)</option>
            <option value="O">KBLI O • Pemkab KTT (8.5%)</option>
            <option value="G">KBLI G • Perdagangan (5.1%)</option>
          </select>

          {/* Download Excel */}
          <button
            onClick={onExportExcel}
            className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_4px_14px_0_rgba(24,144,255,0.35)] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .XLSX</span>
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-[#f0f0f0] text-[11px] uppercase tracking-wider text-[#8c8c8c] font-bold">
              <th className="py-3 px-4 w-12 text-center">No</th>
              <th className="py-3 px-4 w-28">Tanggal (H-1)</th>
              <th className="py-3 px-4 w-32">Kanal Portal</th>
              <th className="py-3 px-6 min-w-[340px]">Judul Berita & Ringkasan Fenomena</th>
              <th className="py-3 px-4 w-44">Sisi Lapangan Usaha (KBLI)</th>
              <th className="py-3 px-4 w-48">Sisi Pengeluaran</th>
              <th className="py-3 px-4 w-28 text-center">Kurasi Nerwilis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0] text-[#595959]">
            {filteredRows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3.5 px-4 text-center font-mono font-bold text-[#141414]">
                  {idx + 1}
                </td>
                <td className="py-3.5 px-4 font-mono font-semibold text-[#141414]">
                  {row.entryDate}
                  <span className="block text-[10px] text-[#8c8c8c] font-sans font-normal">
                    Rilis: {row.releaseDate}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-blue-50 text-blue-700">
                    {row.source}
                  </span>
                </td>
                <td className="py-3.5 px-6">
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#141414] hover:text-blue-600 transition-colors leading-snug block"
                  >
                    {row.title}
                  </a>
                  <p className="text-[11px] text-[#8c8c8c] mt-1 line-clamp-2">
                    {row.summary}
                  </p>
                </td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[#141414] font-semibold text-[11px] block w-fit mb-1">
                    KBLI {row.kbliCategory} ({row.kbliCode})
                  </span>
                  <span className="text-[10px] text-[#8c8c8c]">{row.kbliDesc}</span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-[11px] block w-fit mb-1">
                    {row.expenditureCode}
                  </span>
                  <span className="text-[10px] text-[#8c8c8c]">{row.expenditureDesc}</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  {isAdmin ? (
                    <button
                      onClick={() => onEditRow?.(row.id)}
                      className="p-1 rounded-md hover:bg-slate-200 text-[#141414] transition-colors cursor-pointer"
                      title="Koreksi Klasifikasi"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                      <CheckCircle className="w-3 h-3" />
                      Terverifikasi
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-[#f0f0f0] flex items-center justify-between text-xs text-[#8c8c8c]">
        <span>Total {filteredRows.length} Berita ODON Terverifikasi</span>
        <div className="flex items-center gap-1">
          <button className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-[#141414]">
            Sebelumnya
          </button>
          <button className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold">
            1
          </button>
          <button className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-[#141414]">
            Selanjutnya
          </button>
        </div>
      </div>

    </section>
  );
}

