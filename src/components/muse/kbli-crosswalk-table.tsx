"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { TOP_KTT_KBLI_CONVERSIONS, lookupKbliConversion } from "@/lib/kbli/conversions";
import { getSectorWeightPercent } from "@/lib/constants/taxonomy";

interface ApiKbliItem {
  code2020: string;
  title2020: string;
  code2025: string;
  title2025: string;
  category: string;
  category2025: string;
  conversionType: "1_to_1" | "split_1_to_n" | "merge_n_to_1" | "many_to_many";
  pdrbWeightPercent: number;
  lampiranRef: string;
}

const CONVERSION_LABELS: Record<ApiKbliItem["conversionType"], { label: string; cls: string }> = {
  "1_to_1": { label: "1-ke-1", cls: "ui-badge ui-badge-success" },
  split_1_to_n: { label: "Pecah 1-ke-N", cls: "ui-badge ui-badge-warn" },
  merge_n_to_1: { label: "Gabung N-ke-1", cls: "ui-badge ui-badge-info" },
  many_to_many: { label: "Many-to-Many", cls: "ui-badge ui-badge-neutral" },
};

export function KbliCrosswalkTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFullCatalog, setShowFullCatalog] = useState(false);
  const [remoteItems, setRemoteItems] = useState<ApiKbliItem[] | null>(null);
  const [totalPairs, setTotalPairs] = useState<number>(2560);
  const [isLoading, setIsLoading] = useState(false);

  const shouldFetchRemote = showFullCatalog || searchQuery.trim().length > 0;

  useEffect(() => {
    if (!shouldFetchRemote) {
      setRemoteItems(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/kbli?q=${encodeURIComponent(searchQuery.trim())}&limit=80`
        );
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          items?: ApiKbliItem[];
          totalPairs?: number;
        };
        if (!cancelled) {
          setRemoteItems(json.items ?? []);
          if (typeof json.totalPairs === "number" && json.totalPairs > 0) {
            setTotalPairs(json.totalPairs);
          }
        }
      } catch {
        if (!cancelled) {
          // Graceful client-side highlight fallback if offline
          setRemoteItems(
            lookupKbliConversion(searchQuery).map((item) => ({
              code2020: item.code2020,
              title2020: item.title2020,
              code2025: item.code2025,
              title2025: item.title2025,
              category: item.category,
              category2025: item.category2025,
              conversionType: item.conversionType,
              pdrbWeightPercent: getSectorWeightPercent(item.category),
              lampiranRef: "BPS0000-L5",
            }))
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, shouldFetchRemote]);

  const highlightRows: ApiKbliItem[] = useMemo(
    () =>
      TOP_KTT_KBLI_CONVERSIONS.map((item) => ({
        code2020: item.code2020,
        title2020: item.title2020,
        code2025: item.code2025,
        title2025: item.title2025,
        category: item.category,
        category2025: item.category2025,
        conversionType: item.conversionType,
        pdrbWeightPercent: getSectorWeightPercent(item.category),
        lampiranRef: item.notes,
      })),
    []
  );

  const displayedItems = shouldFetchRemote ? remoteItems ?? highlightRows : highlightRows;

  return (
    <div className="ui-card overflow-hidden">
      {/* Header */}
      <div className="ui-card-header">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="ui-h1">Mesin Konversi KBLI 2020 ↔ KBLI 2025 (BPS0000)</h3>
            <span className="ui-badge ui-badge-info num">
              {totalPairs.toLocaleString("id-ID")} Pasangan Resmi
            </span>
          </div>
          <p className="ui-muted mt-0.5">
            Lampiran 5 Peraturan BPS No. 7 Tahun 2025. Ketik kode 5 digit atau kata kunci komoditas untuk mencari di seluruh tabel <code className="text-xs">kbli_conversions</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowFullCatalog((prev) => !prev)}
            className="ui-btn ui-btn-secondary"
          >
            {showFullCatalog
              ? `Prioritas KTT (${TOP_KTT_KBLI_CONVERSIONS.length})`
              : `Lihat Katalog Lengkap (${totalPairs.toLocaleString("id-ID")})`}
          </button>

          <div className="relative flex-1 sm:w-80">
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
              placeholder="Cari kode (05100, 42912, 84112) atau nama..."
              className="ui-input !h-10 pr-9"
            />
            {isLoading && (
              <Loader2
                className="w-4 h-4 text-blue-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="ui-table min-w-[920px]">
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">KBLI 2020</th>
              <th scope="col">Deskripsi KBLI 2020</th>
              <th scope="col">KBLI 2025</th>
              <th scope="col">Deskripsi KBLI 2025</th>
              <th scope="col">Sektor PDRB / KBLI 2025</th>
              <th scope="col">Tipe Konversi</th>
            </tr>
          </thead>
          <tbody>
            {displayedItems.map((item, idx) => {
              const badge = CONVERSION_LABELS[item.conversionType] ?? CONVERSION_LABELS["1_to_1"];
              const shiftedCategory = item.category2025 && item.category2025 !== item.category;
              return (
                <tr key={`${item.code2020}-${item.code2025}-${idx}`}>
                  <td>
                    <span className="ui-badge ui-badge-info num !text-xs">{item.code2020}</span>
                  </td>
                  <td className="text-slate-900 font-medium leading-snug">{item.title2020}</td>
                  <td>
                    <span className="ui-badge ui-badge-success num !text-xs">{item.code2025}</span>
                  </td>
                  <td className="text-slate-900 font-medium leading-snug">{item.title2025}</td>
                  <td>
                    <span className="ui-badge ui-badge-neutral num">
                      PDRB {item.category} ({item.pdrbWeightPercent.toFixed(2)}%)
                    </span>
                    {shiftedCategory && (
                      <span className="block text-[11px] text-amber-700 font-semibold mt-1 num">
                        Kat. KBLI 2025: {item.category2025}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={badge.cls}>{badge.label}</span>
                  </td>
                </tr>
              );
            })}
            {!isLoading && displayedItems.length === 0 && (
              <tr>
                <td colSpan={6} className="!py-12 text-center text-slate-500">
                  Tidak ada kode KBLI yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
