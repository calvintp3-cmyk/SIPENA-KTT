"use client";

import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

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
    <div className="ui-modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="curation-modal-title"
        className="ui-modal max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-600/15">
              <Scale className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h4 id="curation-modal-title" className="ui-h2">Koreksi Klasifikasi PDRB ODON</h4>
              <p className="text-xs text-slate-500">BPS 6504 • Validasi Lapangan Usaha & Pengeluaran</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup dialog" className="ui-icon-btn !border-transparent !shadow-none">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <span className="ui-label block mb-1.5">Judul Berita:</span>
            <p className="p-3 rounded-xl bg-slate-50/90 border-l-2 border-slate-300 rounded-l-none text-[13px] text-slate-800 font-medium leading-relaxed">
              {title}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cm-kbli2020" className="ui-label block mb-1.5">
                KBLI Lapangan Usaha (2020):
              </label>
              <select
                id="cm-kbli2020"
                value={kbli2020}
                onChange={(e) => setKbli2020(e.target.value)}
                className="ui-field"
              >
                <option value="05100">KBLI B • 05100 (Batubara - 37.8%)</option>
                <option value="01262">KBLI A • 01262 (Sawit - 23.4%)</option>
                <option value="41011">KBLI F • 41011 (Konstruksi - 18.5%)</option>
                <option value="84111">KBLI O • 84111 (Pemkab KTT - 8.5%)</option>
                <option value="47111">KBLI G • 47111 (Perdagangan - 5.1%)</option>
              </select>
            </div>

            <div>
              <label htmlFor="cm-kbli2025" className="ui-label block mb-1.5">
                KBLI 2025 (Crosswalk Otomatis):
              </label>
              <input
                id="cm-kbli2025"
                type="text"
                readOnly
                value={`${conv.code2025} (${conv.title2025})`}
                className="ui-field !bg-slate-100 num"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cm-pengeluaran" className="ui-label block mb-1.5">
              Pos Pengeluaran PDRB:
            </label>
            <select
              id="cm-pengeluaran"
              value={pengeluaran}
              onChange={(e) => setPengeluaran(e.target.value)}
              className="ui-field"
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
            <label htmlFor="cm-summary" className="ui-label block mb-1.5">
              Ringkasan Fenomena Ekonomi (Catatan Nerwilis):
            </label>
            <textarea
              id="cm-summary"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="ui-field leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200/80">
            <button type="button" onClick={onClose} className="ui-btn ui-btn-secondary">
              Batal
            </button>
            <button type="submit" className="ui-btn ui-btn-primary">
              Simpan ke Sheet 6503
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
