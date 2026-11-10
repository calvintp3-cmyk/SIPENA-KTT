"use client";

import React, { useState, useMemo } from "react";
import { Search, ArrowLeftRight } from "lucide-react";
import { TOP_KTT_KBLI_CONVERSIONS, lookupKbliConversion } from "@/lib/kbli/conversions";

export function KbliCrosswalkTable() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    return lookupKbliConversion(searchQuery);
  }, [searchQuery]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] space-y-4">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#f0f0f0]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#141414]">
              Mesin Konversi KBLI 2020 ↔ KBLI 2025 (BPS0000)
            </h3>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Lampiran Resmi BPS RI
            </span>
          </div>
          <p className="text-xs text-[#8c8c8c] mt-0.5">
            Peta konversi forward-mapping untuk komoditas dan aktivitas ekonomi unggulan Tana Tidung.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#8c8c8c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode (05100) atau nama komoditas..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#141414] focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#f0f0f0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold text-[#8c8c8c] uppercase border-b border-[#f0f0f0]">
              <tr>
                <th className="py-2.5 px-4 w-28">KBLI 2020</th>
                <th className="py-2.5 px-4 min-w-[200px]">Deskripsi 2020</th>
                <th className="py-2.5 px-4 w-28">KBLI 2025</th>
                <th className="py-2.5 px-4 min-w-[200px]">Deskripsi 2025</th>
                <th className="py-2.5 px-4 w-36">Sektor PDRB KTT</th>
                <th className="py-2.5 px-4 min-w-[180px]">Catatan Konversi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0] text-[#595959]">
              {filteredItems.map((item, idx) => (
                <tr key={`${item.code2020}-${idx}`} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">
                    {item.code2020}
                  </td>
                  <td className="py-3 px-4 text-[#141414] font-medium">
                    {item.title2020}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                    {item.code2025}
                  </td>
                  <td className="py-3 px-4 text-[#141414] font-medium">
                    {item.title2025}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[#141414] font-semibold text-[10px]">
                      {item.pdrbSector}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#8c8c8c] text-[11px]">
                    {item.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

