"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Scale, X } from "lucide-react";
import { PDRB_PENGELUARAN_2025, getSectorWeightPercent } from "@/lib/constants/taxonomy";
import {
  TOP_KTT_KBLI_CONVERSIONS,
  convertKbli2020To2025,
} from "@/lib/kbli/conversions";
import type { ExpenditureCode, ImpactDirection, KbliCode } from "@/types/client";

export interface CurationModalSavePayload {
  kbliCategory: KbliCode;
  kbliCode2020: string;
  kbliCode2025: string;
  expenditureComponent: ExpenditureCode;
  impactType: ImpactDirection;
  summary: string;
}

interface CurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  title: string;
  initialKbliCategory?: KbliCode;
  initialKbli2020?: string;
  initialPengeluaran?: ExpenditureCode;
  initialImpactType?: ImpactDirection;
  initialSummary?: string;
  submitLabel?: string;
  onSave: (data: CurationModalSavePayload) => Promise<{ ok: boolean; error?: string }>;
}

const EXPENDITURE_SELECT_OPTIONS: Array<{ value: ExpenditureCode; label: string }> = [
  {
    value: "EKSPOR",
    label: `Pos 6 • Ekspor / Net Ekspor Barang & Jasa (${PDRB_PENGELUARAN_2025.NET_EKSPOR.weight.toFixed(2)}%)`,
  },
  {
    value: "PMTB",
    label: `Pos 4 • PMTB - Pembentukan Modal Tetap Bruto (${PDRB_PENGELUARAN_2025.PMTB.weight.toFixed(2)}%)`,
  },
  {
    value: "PK_P",
    label: `Pos 3 • PK-P - Konsumsi Pemerintah (${PDRB_PENGELUARAN_2025.PK_P.weight.toFixed(2)}%)`,
  },
  {
    value: "PK_RT",
    label: `Pos 1 • PK-RT - Konsumsi Rumah Tangga (${PDRB_PENGELUARAN_2025.PK_RT.weight.toFixed(2)}%)`,
  },
  {
    value: "PK_LNPRT",
    label: `Pos 2 • PK-LNPRT - Lembaga Nonprofit (${PDRB_PENGELUARAN_2025.PK_LNPRT.weight.toFixed(2)}%)`,
  },
  {
    value: "PI",
    label: `Pos 5 • PI - Perubahan Inventori (${PDRB_PENGELUARAN_2025.PI.weight.toFixed(2)}%)`,
  },
  {
    value: "IMPOR",
    label: `Pos 6 • Impor Barang & Jasa (${PDRB_PENGELUARAN_2025.NET_EKSPOR.weight.toFixed(2)}% Net Ekspor)`,
  },
  {
    value: "TIDAK_RELEVAN",
    label: "Tidak Berdampak Langsung ke Komponen Pengeluaran",
  },
];

export function CurationModal({
  isOpen,
  onClose,
  targetId,
  title,
  initialKbliCategory = "B",
  initialKbli2020 = "05100",
  initialPengeluaran = "EKSPOR",
  initialImpactType = "positif",
  initialSummary = "",
  submitLabel = "Simpan ke Sheet 6503",
  onSave,
}: CurationModalProps) {
  const [kbli2020, setKbli2020] = useState(initialKbli2020);
  const [pengeluaran, setPengeluaran] = useState<ExpenditureCode>(initialPengeluaran);
  const [impactType, setImpactType] = useState<ImpactDirection>(initialImpactType);
  const [summary, setSummary] = useState(initialSummary);
  const [resolvedInfo, setResolvedInfo] = useState<{
    code2025: string;
    title2025: string;
    category: string;
    category2025: string;
  }>(() => convertKbli2020To2025(initialKbli2020));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync form fields whenever a different row/candidate is opened
  useEffect(() => {
    if (!isOpen) return;
    setKbli2020(initialKbli2020);
    setPengeluaran(initialPengeluaran);
    setImpactType(initialImpactType);
    setSummary(initialSummary);
    setResolvedInfo(convertKbli2020To2025(initialKbli2020));
    setErrorMsg(null);
  }, [
    isOpen,
    targetId,
    initialKbli2020,
    initialPengeluaran,
    initialImpactType,
    initialSummary,
  ]);

  // Live crosswalk resolution for any 5-digit code across all 2,560 BPS0000 pairs
  useEffect(() => {
    if (!isOpen) return;
    const cleaned = kbli2020.trim();
    if (!/^\d{5}$/.test(cleaned)) return;

    const highlight = TOP_KTT_KBLI_CONVERSIONS.find((c) => c.code2020 === cleaned);
    if (highlight) {
      setResolvedInfo({
        code2025: highlight.code2025,
        title2025: highlight.title2025,
        category: highlight.category,
        category2025: highlight.category2025,
      });
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/kbli?q=${encodeURIComponent(cleaned)}&limit=10`);
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as {
          items?: Array<{
            code2020: string;
            code2025: string;
            title2025: string;
            category: string;
            category2025: string;
          }>;
        };
        const exact = payload.items?.find((it) => it.code2020 === cleaned);
        if (exact && !cancelled) {
          setResolvedInfo({
            code2025: exact.code2025,
            title2025: exact.title2025,
            category: exact.category,
            category2025: exact.category2025,
          });
        }
      } catch {
        // Keep synchronous fallback if lookup fails transiently
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, kbli2020]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const isPresetCode = TOP_KTT_KBLI_CONVERSIONS.some((c) => c.code2020 === kbli2020);
  const derivedCategory = (
    TOP_KTT_KBLI_CONVERSIONS.find((c) => c.code2020 === kbli2020)?.category ??
    resolvedInfo.category ??
    initialKbliCategory
  ) as KbliCode;
  const sectorWeight = getSectorWeightPercent(derivedCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedCode = kbli2020.trim();
    if (!/^\d{5}$/.test(cleanedCode)) {
      setErrorMsg("Kode KBLI 2020 harus terdiri dari tepat 5 digit angka (misal: 05100).");
      return;
    }
    if (summary.trim().length < 10) {
      setErrorMsg("Ringkasan fenomena ekonomi minimal 10 karakter.");
      return;
    }

    setErrorMsg(null);
    setIsSaving(true);
    try {
      const result = await onSave({
        kbliCategory: derivedCategory,
        kbliCode2020: cleanedCode,
        kbliCode2025: resolvedInfo.code2025,
        expenditureComponent: pengeluaran,
        impactType,
        summary: summary.trim(),
      });
      if (result.ok) {
        onClose();
      } else {
        setErrorMsg(result.error ?? "Gagal menyimpan perubahan klasifikasi ke server.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="ui-modal-scrim"
      onMouseDown={(e) => e.target === e.currentTarget && !isSaving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="curation-modal-title"
        className="ui-modal max-w-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-600/15">
              <Scale className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h4 id="curation-modal-title" className="ui-h2">
                Koreksi Klasifikasi PDRB ODON
              </h4>
              <p className="text-xs text-slate-500">
                BPS 6504 • Validasi Lapangan Usaha & Pengeluaran
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            aria-label="Tutup dialog"
            className="ui-icon-btn !border-transparent !shadow-none"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <span className="ui-label block mb-1.5">Judul Berita:</span>
            <p className="p-3 rounded-xl bg-slate-50/90 border-l-2 border-slate-300 rounded-l-none text-[13px] text-slate-800 font-medium leading-relaxed">
              {title}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cm-kbli-preset" className="ui-label block mb-1.5">
                Pilih Komoditas KTT / KBLI 2020:
              </label>
              <select
                id="cm-kbli-preset"
                value={isPresetCode ? kbli2020 : "__custom__"}
                onChange={(e) => {
                  if (e.target.value !== "__custom__") {
                    setKbli2020(e.target.value);
                  }
                }}
                className="ui-field"
              >
                {TOP_KTT_KBLI_CONVERSIONS.map((item) => (
                  <option key={item.code2020} value={item.code2020}>
                    KBLI {item.category} • {item.code2020} - {item.title2020}
                  </option>
                ))}
                <option value="__custom__">Kode KBLI 2020 Kustom (5 Digit)</option>
              </select>
            </div>

            <div>
              <label htmlFor="cm-kbli2020" className="ui-label block mb-1.5">
                Kode 5-Digit KBLI 2020 (BPS0000):
              </label>
              <input
                id="cm-kbli2020"
                type="text"
                maxLength={5}
                value={kbli2020}
                onChange={(e) => setKbli2020(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="05100"
                className="ui-field num"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cm-kbli2025" className="ui-label block mb-1.5">
              Crosswalk KBLI 2025 & Bobot PDRB (Seri 2010: {sectorWeight.toFixed(2)}%):
            </label>
            <input
              id="cm-kbli2025"
              type="text"
              readOnly
              value={`${resolvedInfo.code2025} (${resolvedInfo.title2025}) • Sektor PDRB ${derivedCategory} -> KBLI 2025 ${resolvedInfo.category2025}`}
              className="ui-field !bg-slate-100 num"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="cm-pengeluaran" className="ui-label block mb-1.5">
                Pos Pengeluaran PDRB:
              </label>
              <select
                id="cm-pengeluaran"
                value={pengeluaran}
                onChange={(e) => setPengeluaran(e.target.value as ExpenditureCode)}
                className="ui-field"
              >
                {EXPENDITURE_SELECT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cm-impact" className="ui-label block mb-1.5">
                Arah Dampak:
              </label>
              <select
                id="cm-impact"
                value={impactType}
                onChange={(e) => setImpactType(e.target.value as ImpactDirection)}
                className="ui-field"
              >
                <option value="positif">Positif</option>
                <option value="negatif">Negatif</option>
                <option value="netral">Netral</option>
              </select>
            </div>
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
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="ui-btn ui-btn-secondary"
            >
              Batal
            </button>
            <button type="submit" disabled={isSaving} className="ui-btn ui-btn-primary">
              {isSaving ? "Menyimpan..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
