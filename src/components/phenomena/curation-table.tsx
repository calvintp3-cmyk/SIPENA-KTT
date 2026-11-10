"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  EXPENDITURE_COMPONENTS,
  KBLI_LIST,
  SOURCE_MEDIA_LABELS,
} from "@/lib/constants/taxonomy";
import { formatShortDate } from "@/lib/utils";
import {
  ExpenditureBadge,
  ImpactIndicator,
  KbliBadge,
  SourceMediaLabel,
  StatusBadge,
} from "./status-badge";
import type {
  AuthenticatedUser,
  ExpenditureCode,
  KbliCode,
  PaginationMeta,
  PeriodQuarter,
  PhenomenonStatus,
  SerializedPhenomenon,
  SourceMediaCode,
} from "@/types/client";

export interface TableFilterState {
  status: PhenomenonStatus | "";
  kbliCategory: KbliCode | "";
  expenditureComponent: ExpenditureCode | "";
  source: SourceMediaCode | "";
  search: string;
}

interface CurationTableProps {
  user: AuthenticatedUser;
  quarter: PeriodQuarter;
  year: number;
  filters: TableFilterState;
  onChangeFilters: (next: TableFilterState) => void;
  refreshTrigger: number;
  onOpenReview: (item: SerializedPhenomenon) => void;
  onDataMutated: (message: string, tone?: "success" | "error") => void;
}

const columnHelper = createColumnHelper<SerializedPhenomenon>();

export function CurationTable({
  user,
  quarter,
  year,
  filters,
  onChangeFilters,
  refreshTrigger,
  onOpenReview,
  onDataMutated,
}: CurationTableProps) {
  const canEdit = user.role === "admin" || user.role === "editor";
  const [rows, setRows] = useState<SerializedPhenomenon[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(filters.search);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [focusedRowIdx, setFocusedRowIdx] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync local search input when parent clears or injects filters
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Debounce search text propagation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setPage(1);
        onChangeFilters({ ...filters, search: searchInput });
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onChangeFilters]);

  // Reset page when non-search filters or period change
  const filterSignature = `${quarter}-${year}-${filters.status}-${filters.kbliCategory}-${filters.expenditureComponent}-${filters.source}`;
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
    setFocusedRowIdx(-1);
  }, [filterSignature]);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("quarter", quarter);
      qs.set("year", String(year));
      qs.set("page", String(page));
      qs.set("limit", "20");
      if (filters.status) qs.set("status", filters.status);
      if (filters.kbliCategory) qs.set("kbli_category", filters.kbliCategory);
      if (filters.expenditureComponent)
        qs.set("expenditure_component", filters.expenditureComponent);
      if (filters.source) qs.set("source", filters.source);
      if (filters.search.trim()) qs.set("search", filters.search.trim());

      const res = await fetch(`/api/phenomena?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const payload = (await res.json()) as {
        data: SerializedPhenomenon[];
        pagination: PaginationMeta;
      };
      setRows(payload.data);
      setPagination(payload.pagination);
      setSelectedIds(new Set());
    } catch {
      setFetchError(
        "Gagal memuat daftar fenomena ekonomi. Periksa koneksi database atau muat ulang."
      );
    } finally {
      setIsLoading(false);
    }
  }, [quarter, year, page, filters]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows, refreshTrigger]);

  // Keyboard shortcuts: Cmd/Ctrl+K to focus search, J/K + Enter to navigate rows
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      const activeTag = document.activeElement?.tagName;
      if (
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        activeTag === "SELECT" ||
        document.querySelector("dialog[open]")
      ) {
        return;
      }

      if (rows.length === 0) return;

      if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        setFocusedRowIdx((idx) => Math.min(rows.length - 1, idx + 1));
      } else if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        setFocusedRowIdx((idx) => Math.max(0, idx - 1));
      } else if (e.key === "Enter" && focusedRowIdx >= 0 && rows[focusedRowIdx]) {
        e.preventDefault();
        onOpenReview(rows[focusedRowIdx]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, focusedRowIdx, onOpenReview]);

  const toggleSelectAll = useCallback(() => {
    if (rows.length === 0) return;
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  }, [rows, selectedIds.size]);

  const toggleSelectRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  async function handleBatchAction(action: "approved" | "rejected") {
    if (!canEdit || selectedIds.size === 0) return;
    setIsBatchSubmitting(true);
    try {
      const res = await fetch("/api/phenomena/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { updated_count?: number; error?: string }
        | null;

      if (!res.ok) {
        onDataMutated(
          json?.error ?? "Gagal memproses verifikasi massal.",
          "error"
        );
        return;
      }

      setSelectedIds(new Set());
      onDataMutated(
        `${json?.updated_count ?? 0} fenomena berhasil ditandai ${
          action === "approved" ? "Disetujui" : "Ditolak"
        }.`,
        "success"
      );
    } catch {
      onDataMutated("Kesalahan jaringan saat menyimpan aksi massal.", "error");
    } finally {
      setIsBatchSubmitting(false);
    }
  }

  const handleQuickDecision = useCallback(
    async (id: string, status: "approved" | "rejected") => {
      if (!canEdit) return;
      try {
        const res = await fetch(`/api/phenomena/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          onDataMutated(err?.error ?? "Gagal memperbarui status.", "error");
          return;
        }
        onDataMutated(
          `Status fenomena diperbarui menjadi ${
            status === "approved" ? "Disetujui" : "Ditolak"
          }.`,
          "success"
        );
      } catch {
        onDataMutated("Kesalahan jaringan saat memperbarui status.", "error");
      }
    },
    [canEdit, onDataMutated]
  );

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: () => (
          <input
            type="checkbox"
            aria-label="Pilih semua baris halaman ini"
            checked={rows.length > 0 && selectedIds.size === rows.length}
            onChange={toggleSelectAll}
            disabled={!canEdit || rows.length === 0}
            className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-sky-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Pilih fenomena ${row.original.article.title}`}
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleSelectRow(row.original.id)}
            disabled={!canEdit}
            className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-sky-500"
          />
        ),
      }),
      columnHelper.accessor((row) => row.article.publishedDate, {
        id: "source_date",
        header: "Sumber & Tanggal",
        cell: ({ row }) => (
          <div className="space-y-1 whitespace-nowrap font-mono text-[11px]">
            <SourceMediaLabel source={row.original.article.source} />
            <div className="text-slate-400 tabular-nums">
              {formatShortDate(row.original.article.publishedDate)}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.article.title, {
        id: "headline_summary",
        header: "Judul Berita & Ringkasan Ekonomi",
        cell: ({ row }) => (
          <div className="min-w-[260px] max-w-xl">
            <button
              type="button"
              onClick={() => onOpenReview(row.original)}
              className="text-left text-[13px] font-semibold leading-snug text-white transition-colors hover:text-sky-300"
            >
              {row.original.article.title}
            </button>
            <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-300">
              {row.original.summary}
            </p>
            {row.original.affectedCommodities &&
              row.original.affectedCommodities.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-slate-400">
                  <span>Komoditas:</span>
                  <span className="text-slate-200">
                    {row.original.affectedCommodities.join(", ")}
                  </span>
                </div>
              )}
          </div>
        ),
      }),
      columnHelper.accessor("kbliCategory", {
        id: "kbli",
        header: "Sektor KBLI",
        cell: ({ row }) => (
          <div className="min-w-[140px]">
            <KbliBadge
              code={row.original.kbliCategory}
              subsector={row.original.kbliSubsector}
            />
          </div>
        ),
      }),
      columnHelper.accessor("expenditureComponent", {
        id: "expenditure",
        header: "Pengeluaran",
        cell: ({ row }) => (
          <ExpenditureBadge code={row.original.expenditureComponent} />
        ),
      }),
      columnHelper.accessor("impactType", {
        id: "impact",
        header: "Dampak",
        cell: ({ row }) => (
          <ImpactIndicator
            impact={row.original.impactType}
            effect={row.original.priceVolumeEffect}
          />
        ),
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="block text-right">Aksi</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            {canEdit && row.original.status === "pending" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void handleQuickDecision(row.original.id, "approved")
                  }
                  aria-label={`Setujui cepat ${row.original.article.title}`}
                  title="Setujui cepat"
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-emerald-800/70 bg-emerald-950/60 text-emerald-300 transition-colors hover:bg-emerald-900"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handleQuickDecision(row.original.id, "rejected")
                  }
                  aria-label={`Tolak cepat ${row.original.article.title}`}
                  title="Tolak (non-ekonomi)"
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-rose-800/70 bg-rose-950/60 text-rose-300 transition-colors hover:bg-rose-900"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onOpenReview(row.original)}
              className="rounded border border-slate-700 bg-[#0D131F] px-2.5 py-1 text-xs font-medium text-sky-300 transition-colors hover:border-sky-700 hover:bg-[#1A2438]"
            >
              {canEdit ? "Telaah" : "Detail"}
            </button>
          </div>
        ),
      }),
    ],
    [
      rows.length,
      selectedIds,
      toggleSelectAll,
      toggleSelectRow,
      handleQuickDecision,
      canEdit,
      onOpenReview,
    ]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const hasActiveFilters =
    filters.status !== "" ||
    filters.kbliCategory !== "" ||
    filters.expenditureComponent !== "" ||
    filters.source !== "" ||
    filters.search.trim() !== "";

  return (
    <div className="space-y-4">
      {/* Multi-Filter Control Bar */}
      <div className="space-y-3 rounded-lg border border-slate-800 bg-[#131B2B] p-3.5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          {/* Omni-Search Input */}
          <div className="relative max-w-md flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="curation-search" className="visually-hidden">
              Cari judul berita, ringkasan ekonomi, atau komoditas
            </label>
            <input
              ref={searchInputRef}
              id="curation-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari judul berita, sawit, batubara, jalan... (Ctrl+K)"
              className="w-full rounded border border-slate-700 bg-[#0D131F] py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Quick Status Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <span className="mr-1 text-[11px] text-slate-400">Status:</span>
            {(
              [
                { value: "", label: "Semua" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Disetujui" },
                { value: "needs_revision", label: "Perlu Revisi" },
                { value: "rejected", label: "Ditolak" },
              ] as const
            ).map((opt) => {
              const active = filters.status === opt.value;
              return (
                <button
                  key={opt.value || "all"}
                  type="button"
                  onClick={() =>
                    onChangeFilters({ ...filters, status: opt.value })
                  }
                  aria-pressed={active}
                  className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-[#0284C7] bg-[#0284C7] text-white"
                      : "border-slate-800 bg-[#0D131F] text-slate-300 hover:bg-[#1A2438]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Taxonomy Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2.5 font-mono text-xs">
          <label htmlFor="filter-kbli" className="visually-hidden">
            Filter Sektor KBLI
          </label>
          <select
            id="filter-kbli"
            value={filters.kbliCategory}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                kbliCategory: e.target.value as KbliCode | "",
              })
            }
            className="rounded border border-slate-700 bg-[#0D131F] px-2.5 py-1 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
          >
            <option value="">Semua Sektor KBLI (A-U)</option>
            {KBLI_LIST.map((item) => (
              <option key={item.code} value={item.code}>
                {item.fullName}
              </option>
            ))}
          </select>

          <label htmlFor="filter-expenditure" className="visually-hidden">
            Filter Komponen Pengeluaran
          </label>
          <select
            id="filter-expenditure"
            value={filters.expenditureComponent}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                expenditureComponent: e.target.value as ExpenditureCode | "",
              })
            }
            className="rounded border border-slate-700 bg-[#0D131F] px-2.5 py-1 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
          >
            <option value="">Semua Komponen Pengeluaran</option>
            {Object.values(EXPENDITURE_COMPONENTS).map((comp) => (
              <option key={comp.code} value={comp.code}>
                {comp.label} - {comp.fullName}
              </option>
            ))}
          </select>

          <label htmlFor="filter-source" className="visually-hidden">
            Filter Sumber Media
          </label>
          <select
            id="filter-source"
            value={filters.source}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                source: e.target.value as SourceMediaCode | "",
              })
            }
            className="rounded border border-slate-700 bg-[#0D131F] px-2.5 py-1 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
          >
            <option value="">Semua Sumber Media</option>
            {Object.entries(SOURCE_MEDIA_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                onChangeFilters({
                  status: "",
                  kbliCategory: "",
                  expenditureComponent: "",
                  source: "",
                  search: "",
                });
              }}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-[#0D131F] px-2 py-1 text-[11px] text-slate-300 hover:bg-[#1A2438] hover:text-white"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset Filter</span>
            </button>
          )}

          <div className="ml-auto text-[11px] text-slate-400 tabular-nums">
            Total: <strong className="text-slate-100">{pagination.total}</strong>{" "}
            entri
          </div>
        </div>
      </div>

      {/* Batch Action Bar (appears when checkboxes checked) */}
      {canEdit && selectedIds.size > 0 && (
        <div
          role="region"
          aria-label="Aksi verifikasi massal"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-700/80 bg-sky-950/50 px-4 py-2.5 text-xs"
        >
          <span className="font-mono text-sky-200 tabular-nums">
            <strong>{selectedIds.size}</strong> fenomena dipilih untuk verifikasi massal
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isBatchSubmitting}
              onClick={() => void handleBatchAction("approved")}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Setujui Terpilih ({selectedIds.size})</span>
            </button>
            <button
              type="button"
              disabled={isBatchSubmitting}
              onClick={() => void handleBatchAction("rejected")}
              className="inline-flex items-center gap-1.5 rounded border border-rose-700 bg-rose-950 px-3 py-1.5 font-medium text-rose-200 hover:bg-rose-900 disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tolak Terpilih ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#131B2B]">
        {fetchError ? (
          <div className="p-8 text-center text-xs">
            <p className="font-medium text-rose-300">{fetchError}</p>
            <button
              type="button"
              onClick={() => void fetchRows()}
              className="mt-3 rounded border border-slate-700 bg-[#0D131F] px-3 py-1.5 text-slate-200 hover:bg-[#1A2438]"
            >
              Coba Muat Ulang
            </button>
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="curation-table-caption"
            className="max-h-[68vh] overflow-auto"
          >
            <table className="w-full border-separate border-spacing-0 text-left text-xs">
              <caption id="curation-table-caption" className="visually-hidden">
                Daftar Fenomena Ekonomi Kabupaten Tana Tidung Periode{" "}
                {quarter} {year}
              </caption>
              <thead className="sticky top-0 z-10 bg-[#0D131F] font-mono text-[11px] uppercase text-slate-400">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        className="border-b border-slate-800 px-3 py-2.5 font-semibold tracking-wide"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="bg-[#0D131F]/40">
                      <td
                        colSpan={columns.length}
                        className="px-4 py-4 font-mono text-xs text-slate-400"
                      >
                        Memuat data fenomena {quarter} {year}...
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-6 py-12 text-center"
                    >
                      <p className="text-sm font-medium text-slate-200">
                        Tidak ada entri yang cocok dengan filter saat ini.
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Ubah kata kunci pencarian, periode triwulan, atau reset filter status untuk menampilkan seluruh fenomena.
                      </p>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, index) => {
                    const isKeyboardFocused = index === focusedRowIdx;
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors hover:bg-[#1A2438]/75 ${
                          index % 2 === 1 ? "bg-[#0D131F]/40" : ""
                        } ${isKeyboardFocused ? "ring-1 ring-inset ring-sky-500" : ""}`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="border-b border-slate-800/80 px-3 py-2.5 align-top"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-[#0D131F] px-4 py-2.5 font-mono text-[11px] text-slate-400">
          <span>
            Halaman <strong className="text-slate-200">{pagination.page}</strong>{" "}
            dari{" "}
            <strong className="text-slate-200">{pagination.totalPages}</strong>{" "}
            &middot; Pintasan tabel: <kbd className="rounded bg-slate-800 px-1 py-0.5 text-slate-200">J</kbd>/<kbd className="rounded bg-slate-800 px-1 py-0.5 text-slate-200">K</kbd> pilih baris, <kbd className="rounded bg-slate-800 px-1 py-0.5 text-slate-200">Enter</kbd> buka telaah
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-[#131B2B] px-2.5 py-1 text-slate-200 hover:bg-[#1A2438] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sebelumnya</span>
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages || isLoading}
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-[#131B2B] px-2.5 py-1 text-slate-200 hover:bg-[#1A2438] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span>Berikutnya</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

