"use client";

import React, { useState } from "react";
import {
  Search,
  ExternalLink,
  FileSpreadsheet,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type { OdonLedgerRowDto } from "@/types/odon";

interface PublicNewsTabulationProps {
  rows: OdonLedgerRowDto[];
  onOpenSubmitModal: () => void;
}

function getImpactBadge(impactType: OdonLedgerRowDto["impactType"]) {
  if (impactType === "negatif") {
    return {
      label: "Dampak Negatif",
      cls: "ui-badge ui-badge-danger whitespace-normal",
      Icon: TrendingDown,
    };
  }
  if (impactType === "netral") {
    return {
      label: "Dampak Netral",
      cls: "ui-badge ui-badge-neutral whitespace-normal",
      Icon: Minus,
    };
  }
  return {
    label: "Dampak Positif",
    cls: "ui-badge ui-badge-success whitespace-normal",
    Icon: TrendingUp,
  };
}

export function PublicNewsTabulation({
  rows,
  onOpenSubmitModal,
}: PublicNewsTabulationProps) {
  const [search, setSearch] = useState("");

  const filteredRows = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.kbliTitle2020.toLowerCase().includes(q) ||
      r.kbliCode2020.includes(q) ||
      r.kbliCode2025.includes(q) ||
      r.source.toLowerCase().includes(q) ||
      r.expenditureLabel.toLowerCase().includes(q) ||
      `${r.quarter} ${r.year}`.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Intro banner */}
      <div className="ui-card p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="ui-badge ui-badge-info num">SIPENA-KTT ODON 6504</span>
            <span className="text-xs text-slate-500 font-medium">BPS Kabupaten Tana Tidung</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Tabulasi Berita Harian Fenomena Ekonomi (ODON)
          </h2>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            Arsip resmi pencatatan fenomena ekonomi harian (One Day One News) yang dihimpun secara objektif dari media massa untuk pemantauan dinamika ekonomi daerah.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSubmitModal}
          className="ui-btn ui-btn-primary min-h-11 px-5 shrink-0"
        >
          <PlusCircle className="w-4 h-4" aria-hidden="true" />
          <span>Usulkan Berita Daerah</span>
        </button>
      </div>

      {/* Command-palette search */}
      <div className="relative">
        <Search
          className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <label htmlFor="public-news-search" className="visually-hidden">
          Cari berita
        </label>
        <input
          id="public-news-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari berita berdasarkan judul, ringkasan fenomena, kode KBLI (05100, 01262), sektor, atau portal..."
          className="ui-input pr-20"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100"
          >
            Reset
          </button>
        )}
      </div>

      {/* Public ODON table (mirrors official Sheet 6503) */}
      <div className="ui-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <span className="text-xs font-semibold text-slate-800">
              Data Fenomena Ekonomi Terverifikasi (<span className="num">{filteredRows.length}</span> Baris)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 num">Format Resmi Sheet 6503</span>
        </div>

        <div className="overflow-x-auto">
          <table className="ui-table min-w-[960px]">
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "21%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "6%" }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="text-center">No</th>
                <th scope="col">Tanggal Entri</th>
                <th scope="col">Judul Berita</th>
                <th scope="col">Ringkasan Fenomena Ekonomi</th>
                <th scope="col">Kategori (KBLI)</th>
                <th scope="col">Dampak & Pos</th>
                <th scope="col" className="text-center">Tautan Asli</th>
                <th scope="col" className="text-center">Periode</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="!py-14 text-center text-slate-500">
                    {rows.length === 0
                      ? "Belum ada entri ODON terverifikasi di database."
                      : "Tidak ada data fenomena yang cocok dengan kata kunci pencarian."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const impact = getImpactBadge(row.impactType);
                  const ImpactIcon = impact.Icon;
                  return (
                    <tr key={row.id}>
                      <td className="text-center num text-slate-500">{idx + 1}</td>

                      <td className="num text-slate-600 text-xs leading-relaxed">
                        <span className="font-semibold text-slate-800 block">{row.entryDate}</span>
                        <span className="text-[11px] text-slate-500 block">
                          Rilis {row.releaseDate}
                        </span>
                      </td>

                      <td>
                        <span className="font-semibold text-slate-900 leading-snug block">
                          {row.title}
                        </span>
                        <span className="text-[11px] text-blue-700 font-medium mt-1 block">
                          {row.source}
                        </span>
                      </td>

                      <td className="text-slate-600 leading-relaxed font-normal">{row.summary}</td>

                      <td>
                        <div className="flex items-start gap-2.5">
                          <span className="ui-kbli" aria-hidden="true">
                            {row.kbliCategory}
                          </span>
                          <div className="min-w-0">
                            <span className="sr-only">KBLI {row.kbliCategory}: </span>
                            <span className="text-xs text-slate-800 font-semibold leading-snug block">
                              {row.kbliTitle2020}
                            </span>
                            <span className="text-[11px] text-slate-500 num mt-0.5 block">
                              {row.kbliCode2020} → {row.kbliCode2025} ({row.pdrbWeightPercent.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="space-y-1.5">
                        <span className={impact.cls}>
                          <ImpactIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>{impact.label}</span>
                        </span>
                        <span className="block text-[11px] text-slate-500 num">
                          {row.expenditureLabel}
                        </span>
                      </td>

                      <td className="text-center">
                        <a
                          href={row.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ui-btn ui-btn-secondary !min-h-8 !px-2.5 !text-[11px]"
                          title="Buka artikel berita asli di tab baru"
                        >
                          <span>Sumber</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      </td>

                      <td className="text-center num font-semibold text-slate-800 text-[11px]">
                        {row.quarter} {row.year}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>Data bersumber langsung dari database resmi Nerwilis BPS 65.04</span>
          </div>
          <span className="num text-[11px]">Kabupaten Tana Tidung • Kaltara</span>
        </div>
      </div>
    </div>
  );
}
