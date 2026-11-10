"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  AlertCircle,
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

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setPage(1);
        onChangeFilters({ ...filters, search: searchInput });
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onChangeFilters]);

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
          <label className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center sm:min-h-0 sm:min-w-0">
            <input
              type="checkbox"
              aria-label="Pilih semua baris halaman ini"
              checked={rows.length > 0 && selectedIds.size === rows.length}
              onChange={toggleSelectAll}
              disabled={!canEdit || rows.length === 0}
              className="h-4 w-4 rounded border-[var(--border-strong)] bg-[var(--bg-surface)] accent-[var(--accent-primary)]"
            />
          </label>
        ),
        cell: ({ row }) => (
          <label className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center sm:min-h-0 sm:min-w-0">
            <input
              type="checkbox"
              aria-label={`Pilih fenomena ${row.original.article.title}`}
              checked={selectedIds.has(row.original.id)}
              onChange={() => toggleSelectRow(row.original.id)}
              disabled={!canEdit}
              className="h-4 w-4 rounded border-[var(--border-strong)] bg-[var(--bg-surface)] accent-[var(--accent-primary)]"
            />
          </label>
        ),
      }),
      columnHelper.accessor((row) => row.article.publishedDate, {
        id: "source_date",
        header: "Sumber & Tanggal",
        cell: ({ row }) => (
          <div className="max-w-[114px] space-y-1.5 whitespace-nowrap">
            <SourceMediaLabel source={row.original.article.source} />
            <div className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
              {formatShortDate(row.original.article.publishedDate)}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.article.title, {
        id: "headline_summary",
        header: "Judul Berita & Ringkasan Ekonomi",
        cell: ({ row }) => (
          <div className="min-w-[200px] max-w-[340px]">
            <button
              type="button"
              onClick={() => onOpenReview(row.original)}
              className="text-left text-[13px] font-semibold leading-snug text-[var(--text-primary)] transition-colors hover:text-[var(--accent-text)]"
            >
              {row.original.article.title}
            </button>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              {row.original.summary}
            </p>
            {row.original.affectedCommodities &&
              row.original.affectedCommodities.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                  <span>Komoditas:</span>
                  <span className="font-medium text-[var(--text-primary)]">
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
          <div className="w-[152px] max-w-[160px]">
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
          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
            {canEdit && row.original.status === "pending" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void handleQuickDecision(row.original.id, "approved")
                  }
                  aria-label={`Setujui cepat ${row.original.article.title}`}
                  title="Setujui cepat"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-700/80 dark:bg-emerald-950/70 dark:text-emerald-200 dark:hover:bg-emerald-900 sm:h-7 sm:w-7"
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
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-rose-300 bg-rose-50 text-rose-800 transition-colors hover:bg-rose-100 dark:border-rose-700/80 dark:bg-rose-950/70 dark:text-rose-200 dark:hover:bg-rose-900 sm:h-7 sm:w-7"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onOpenReview(row.original)}
              className="min-h-[44px] rounded-md border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 py-1 text-xs font-semibold text-[var(--accent-text)] transition-colors hover:bg-[var(--bg-hover)] sm:min-h-[30px] sm:px-2.5"
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

  const activeFilterCount = [
    filters.status,
    filters.kbliCategory,
    filters.expenditureComponent,
    filters.source,
    filters.search.trim(),
  ].filter(Boolean).length;

  function clearAllFilters() {
    setSearchInput("");
    onChangeFilters({
      status: "",
      kbliCategory: "",
      expenditureComponent: "",
      source: "",
      search: "",
    });
  }

  return (
    <div className="space-y-4">
      {/* Unified Search & Taxonomy Filter Ribbon */}
      <search aria-label="Pencarian dan Penyaringan Fenomena Ekonomi">
        <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-card">
          <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            {/* Omni-Search Input */}
            <div className="relative flex-1 xl:max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <label htmlFor="curation-search" className="visually-hidden">
                Cari judul berita, ringkasan ekonomi, atau komoditas
              </label>
              <input
                ref={searchInputRef}
                id="curation-search"
                type="search"
                autoCorrect="off"
                spellCheck={false}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari judul, komoditas... (Ctrl+K)"
                className="min-h-[44px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] py-2 pl-9 pr-12 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-surface)] focus:outline-none sm:min-h-[38px] sm:pr-9"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Bersihkan kata kunci pencarian"
                  className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] sm:right-2 sm:h-7 sm:w-7"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Segmented Status Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-[var(--text-muted)]">
                Status:
              </span>
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
                    className={`min-h-[44px] rounded-lg border px-3 py-1 text-xs font-semibold transition-colors sm:min-h-[34px] ${
                      active
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                        : "border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Taxonomy Selects & Count Summary */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs">
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
              className="min-h-[44px] max-w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] focus:outline-none sm:min-h-[38px]"
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
              className="min-h-[44px] max-w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] focus:outline-none sm:min-h-[38px]"
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
              className="min-h-[44px] max-w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] focus:outline-none sm:min-h-[38px]"
            >
              <option value="">Semua Sumber Media</option>
              {Object.entries(SOURCE_MEDIA_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] sm:min-h-[38px]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset Filter ({activeFilterCount})</span>
              </button>
            )}

            <div className="ml-auto font-mono text-xs text-[var(--text-muted)] tabular-nums">
              Total:{" "}
              <strong className="text-[var(--text-primary)]">
                {pagination.total}
              </strong>{" "}
              entri
            </div>
          </div>
        </div>
      </search>

      {/* Contextual Batch Verification Bar */}
      {canEdit && selectedIds.size > 0 && (
        <div
          role="region"
          aria-label="Aksi verifikasi massal"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--accent-soft-border)] bg-[var(--accent-soft)] px-4 py-3 text-xs shadow-card"
        >
          <span className="font-medium text-[var(--text-primary)] tabular-nums">
            <strong className="font-mono">{selectedIds.size}</strong> fenomena
            dipilih untuk verifikasi massal
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isBatchSubmitting}
              onClick={() => void handleBatchAction("approved")}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 sm:min-h-[36px]"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Setujui Terpilih ({selectedIds.size})</span>
            </button>
            <button
              type="button"
              disabled={isBatchSubmitting}
              onClick={() => void handleBatchAction("rejected")}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-1.5 font-semibold text-rose-900 transition-colors hover:bg-rose-100 disabled:opacity-60 dark:border-rose-700 dark:bg-rose-950/80 dark:text-rose-200 dark:hover:bg-rose-900 sm:min-h-[36px]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tolak Terpilih ({selectedIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="min-h-[44px] rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] sm:min-h-[36px]"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Main Responsive Data Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card">
        {fetchError ? (
          <div role="alert" className="p-10 text-center">
            <AlertCircle
              className="mx-auto h-7 w-7 text-rose-600 dark:text-rose-400"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
              Gagal Memuat Daftar Fenomena
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{fetchError}</p>
            <button
              type="button"
              onClick={() => void fetchRows()}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)] sm:min-h-[38px]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Coba Muat Ulang</span>
            </button>
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="curation-table-caption"
            aria-busy={isLoading}
            className="max-h-[68vh] overflow-auto"
          >
            <table className="w-full border-separate border-spacing-0 text-left text-xs">
              <caption id="curation-table-caption" className="visually-hidden">
                Daftar Fenomena Ekonomi Kabupaten Tana Tidung Periode {quarter}{" "}
                {year}
              </caption>
              <thead className="sticky top-0 z-10 bg-[var(--bg-subtle)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        className="border-b border-[var(--border-subtle)] px-2.5 py-3 first:pl-3.5 last:pr-3.5"
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
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="bg-[var(--bg-surface)]">
                      <td className="py-3.5 pl-3.5 pr-2.5">
                        <div className="h-4 w-4 rounded bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="px-2.5 py-3.5">
                        <div className="h-5 w-24 rounded bg-[var(--bg-subtle)]" />
                        <div className="mt-1.5 h-3 w-16 rounded bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="px-2.5 py-3.5">
                        <div className="h-4 w-3/4 rounded bg-[var(--bg-subtle)]" />
                        <div className="mt-2 h-3 w-full rounded bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="px-2.5 py-3.5">
                        <div className="h-6 w-28 rounded bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="px-2.5 py-3.5">
                        <div className="h-6 w-16 rounded bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="px-2.5 py-3.5">
                        <div className="h-4 w-16 rounded bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="px-2.5 py-3.5">
                        <div className="h-6 w-20 rounded bg-[var(--bg-subtle)]" />
                      </td>
                      <td className="py-3.5 pl-2.5 pr-3.5 text-right">
                        <div className="ml-auto h-8 w-16 rounded bg-[var(--bg-subtle)]" />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-6 py-14 text-center"
                    >
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {activeFilterCount > 0
                          ? "Tidak ada entri yang cocok dengan filter saat ini."
                          : `Belum ada data fenomena tercatat pada ${quarter} ${year}.`}
                      </p>
                      <p className="mx-auto mt-1 max-w-md text-xs text-[var(--text-muted)]">
                        {activeFilterCount > 0
                          ? "Ubah kata kunci pencarian atau reset filter untuk menampilkan seluruh fenomena pada periode ini."
                          : "Pilih triwulan/tahun lain di bilah atas atau jalankan penarikan berita baru."}
                      </p>
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-4 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] sm:min-h-[38px]"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Reset Semua Filter</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, index) => {
                    const isKeyboardFocused = index === focusedRowIdx;
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors hover:bg-[var(--bg-hover)] ${
                          index % 2 === 1 ? "bg-[var(--bg-subtle)]/55" : ""
                        } ${
                          isKeyboardFocused
                            ? "ring-2 ring-inset ring-[var(--focus-ring)]"
                            : ""
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="border-b border-[var(--border-subtle)] px-2.5 py-3 align-top first:pl-3.5 last:pr-3.5"
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

        {/* Pagination & Shortcut Legend Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-3 font-mono text-[11px] text-[var(--text-muted)]">
          <span>
            Halaman{" "}
            <strong className="text-[var(--text-primary)]">
              {pagination.page}
            </strong>{" "}
            dari{" "}
            <strong className="text-[var(--text-primary)]">
              {pagination.totalPages}
            </strong>
            <span className="hidden sm:inline">
              {" "}
              &middot; Pintasan:{" "}
              <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[var(--text-primary)]">
                J
              </kbd>
              /
              <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[var(--text-primary)]">
                K
              </kbd>{" "}
              pilih baris,{" "}
              <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[var(--text-primary)]">
                Enter
              </kbd>{" "}
              buka telaah
            </span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 font-sans text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-45 sm:min-h-[36px]"
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
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 font-sans text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-45 sm:min-h-[36px]"
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
