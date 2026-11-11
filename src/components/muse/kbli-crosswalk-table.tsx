"use client";

import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { lookupKbliConversion } from "@/lib/kbli/conversions";

export function KbliCrosswalkTable() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    return lookupKbliConversion(searchQuery);
  }, [searchQuery]);

  return (
    <div className="ui-card overflow-hidden">
      {/* Header */}
      <div className="ui-card-header">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="ui-h1">Mesin Konversi KBLI 2020 ↔ KBLI 2025 (BPS0000)</h3>
            <span className="ui-badge ui-badge-info">Lampiran Resmi BPS RI</span>
          </div>
          <p className="ui-muted mt-0.5">
            Peta konversi forward-mapping untuk komoditas dan aktivitas ekonomi unggulan Tana Tidung.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search
            className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="kbli-search" className="visually-hidden">
            Cari kode KBLI atau nama komoditas
          </label>
          <input
            id="kbli-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode (05100) atau nama komoditas..."
            className="ui-input !h-11"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="ui-table min-w-[900px]">
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "21%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "21%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "24%" }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">KBLI 2020</th>
              <th scope="col">Deskripsi 2020</th>
              <th scope="col">KBLI 2025</th>
              <th scope="col">Deskripsi 2025</th>
              <th scope="col">Sektor PDRB KTT</th>
              <th scope="col">Catatan Konversi</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => (
              <tr key={`${item.code2020}-${idx}`}>
                <td>
                  <span className="ui-badge ui-badge-info num !text-xs">{item.code2020}</span>
                </td>
                <td className="text-slate-900 font-medium leading-snug">{item.title2020}</td>
                <td>
                  <span className="ui-badge ui-badge-success num !text-xs">{item.code2025}</span>
                </td>
                <td className="text-slate-900 font-medium leading-snug">{item.title2025}</td>
                <td>
                  <span className="ui-badge ui-badge-neutral whitespace-normal">{item.pdrbSector}</span>
                </td>
                <td className="text-slate-600 text-xs leading-relaxed">{item.notes}</td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} className="!py-12 text-center text-slate-500">
                  Tidak ada kode KBLI yang cocok dengan kata kunci pencarian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
