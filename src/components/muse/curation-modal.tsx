"use client";

import React, { useState } from "react";
import { Scale, X } from "lucide-react";
import { convertKbli2020To2025 } from "@/lib/kbli/conversions";

interface CurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialKbli2020?: string;
  initialPengeluaran?: string;
  initialSummary?: string;
  onSave: (data: {
    kbli2020: string;
    kbli2025: string;
    pengeluaran: string;
    summary: string;
  }) => void;
}

export function CurationModal({
  isOpen,
  onClose,
  title,
  initialKbli2020 = "05100",
  initialPengeluaran = "NET_EKSPOR",
  initialSummary = "Peningkatan frekuensi tongkang batubara dan CPO di Pelabuhan Bebatu mendorong pertumbuhan ekspor antar daerah.",
  onSave,
}: CurationModalProps) {
  const [kbli2020, setKbli2020] = useState(initialKbli2020);
  const [pengeluaran, setPengeluaran] = useState(initialPengeluaran);
  const [summary, setSummary] = useState(initialSummary);

  if (!isOpen) return null;

  const conv = convertKbli2020To2025(kbli2020);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      kbli2020,
      kbli2025: conv.code2025,
      pengeluaran,
      summary,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] p-6 space-y-4">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#141414]">Koreksi Klasifikasi PDRB ODON</h4>
              <p className="text-[11px] text-[#8c8c8c]">BPS 6504 • Validasi Lapangan Usaha & Pengeluaran</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-[#8c8c8c]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#141414] mb-1">Judul Berita:</label>
            <p className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[#141414] font-medium leading-relaxed">
              {title}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#141414] mb-1">
                KBLI Lapangan Usaha (2020):
              </label>
              <select
                value={kbli2020}
                onChange={(e) => setKbli2020(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#141414]"
              >
                <option value="05100">KBLI B • 05100 (Batubara - 37.8%)</option>
                <option value="01262">KBLI A • 01262 (Sawit - 23.4%)</option>
                <option value="41011">KBLI F • 41011 (Konstruksi - 18.5%)</option>
                <option value="84111">KBLI O • 84111 (Pemkab KTT - 8.5%)</option>
                <option value="47111">KBLI G • 47111 (Perdagangan - 5.1%)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#141414] mb-1">
                KBLI 2025 (Crosswalk Otomatis):
              </label>
              <input
                type="text"
                readOnly
                value={`${conv.code2025} (${conv.title2025})`}
                className="w-full p-2 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-[#141414]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#141414] mb-1">
              Pos Pengeluaran PDRB:
            </label>
            <select
              value={pengeluaran}
              onChange={(e) => setPengeluaran(e.target.value)}
              className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#141414]"
            >
              <option value="NET_EKSPOR">Pos 6 • Net Ekspor Antar Daerah (49.98%)</option>
              <option value="PMTB">Pos 4 • PMTB - Modal Tetap Bruto (31.38%)</option>
              <option value="PK_P">Pos 2 • PK-P - Konsumsi Pemerintah (9.80%)</option>
              <option value="PK_RT">Pos 1 • PK-RT - Konsumsi Rumah Tangga (7.06%)</option>
              <option value="PK_LNPRT">Pos 3 • PK-LNPRT (1.13%)</option>
              <option value="PI">Pos 5 • Perubahan Inventori (0.65%)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#141414] mb-1">
              Ringkasan Fenomena Ekonomi (Catatan Nerwilis):
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#141414] focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f0f0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#141414] hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-[0_4px_14px_0_rgba(24,144,255,0.35)] hover:bg-blue-700 cursor-pointer"
            >
              Simpan ke Sheet 6503
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

