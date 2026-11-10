"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  RotateCcw,
  Search,
  Sparkles,
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
import { SplitInspectionPane } from "./review-modal";
import type {
  AuthenticatedUser,
  DashboardStatsPayload,
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
  stats: DashboardStatsPayload;
  filters: TableFilterState;
  onChangeFilters: (next: TableFilterState) => void;
  refreshTrigger: number;
  preselectedItem: SerializedPhenomenon | null;
  onOpenMobileReview: (item: SerializedPhenomenon) => void;
  onDataMutated: (message: string, tone?: "success" | "error") => void;
}

export function CurationTable({
  user,
  quarter,
  year,
  stats,
  filters,
  onChangeFilters,
  refreshTrigger,
  preselectedItem,
  onOpenMobileReview,
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
  const [activeItem, setActiveItem] = useState<SerializedPhenomenon | null>(
    preselectedItem
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preselectedItem) {
      setActiveItem(preselectedItem);
    }
  }, [preselectedItem]);

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

      setActiveItem((prev) => {
        if (payload.data.length === 0) return null;
        if (prev) {
          const refreshedMatch = payload.data.find((r) => r.id === prev.id);
          if (refreshedMatch) return refreshedMatch;
        }
        return payload.data[0];
      });
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

      const currentIndex = activeItem
        ? rows.findIndex((r) => r.id === activeItem.id)
        : -1;

      if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        const nextIdx = Math.min(rows.length - 1, currentIndex + 1);
        setActiveItem(rows[nextIdx]);
      } else if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        const prevIdx = Math.max(0, currentIndex <= 0 ? 0 : currentIndex - 1);
        setActiveItem(rows[prevIdx]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, activeItem]);

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

  function handleSelectRow(item: SerializedPhenomenon) {
    setActiveItem(item);
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      onOpenMobileReview(item);
    }
  }

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

  const coveredKbliCount = stats.kbliDistribution.filter(
    (s) => s.count > 0
  ).length;

  return (
    <div className="space-y-5">
      {/* Interactive 4-Stat Metric Strip (Sapick & BlazeX Style) */}
      <section
        aria-label="Ringkasan Metrik Periode"
        className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-4"
      >
        <button
          type="button"
          onClick={() => onChangeFilters({ ...filters, status: "" })}
          className={`saas-card flex flex-col justify-between rounded-2xl p-5 text-left transition-all hover:border-slate-300 ${
            filters.status === "" && activeFilterCount === 0
              ? "ring-2 ring-emerald-600/25 border-emerald-200"
              : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Total Fenomena
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-[26px] font-bold leading-none tracking-[-0.025em] text-[var(--text-primary)] tabular-nums">
              {stats.totalEconomicPhenomena}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {quarter} {year}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            onChangeFilters({
              ...filters,
              status: filters.status === "pending" ? "" : "pending",
            })
          }
          className={`saas-card flex flex-col justify-between rounded-2xl p-5 text-left transition-all hover:border-amber-300 ${
            filters.status === "pending"
              ? "ring-2 ring-amber-500/30 border-amber-300"
              : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Menunggu Verifikasi
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-[26px] font-bold leading-none tracking-[-0.025em] text-[var(--text-primary)] tabular-nums">
              {stats.pendingCount}
            </span>
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/70 dark:text-amber-200">
              Antrean
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            onChangeFilters({
              ...filters,
              status: filters.status === "approved" ? "" : "approved",
            })
          }
          className={`saas-card flex flex-col justify-between rounded-2xl p-5 text-left transition-all hover:border-emerald-300 ${
            filters.status === "approved"
              ? "ring-2 ring-emerald-600/30 border-emerald-300"
              : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Disetujui ke PDRB
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-[26px] font-bold leading-none tracking-[-0.025em] text-[var(--text-primary)] tabular-nums">
              {stats.approvedCount}
            </span>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/70 dark:text-emerald-200">
              Siap Ekspor
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={clearAllFilters}
          className="saas-card flex flex-col justify-between rounded-2xl p-5 text-left transition-all hover:border-slate-300"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Cakupan Sektor KBLI
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-[26px] font-bold leading-none tracking-[-0.025em] text-[var(--text-primary)] tabular-nums">
              {coveredKbliCount}
              <span className="text-base font-medium text-[var(--text-muted)]">
                {" "}
                / 17
              </span>
            </span>
            <span className="text-xs text-[var(--text-muted)]">Sektor</span>
          </div>
        </button>
      </section>

      {/* Unified Search & Filter Ribbon */}
      <search aria-label="Pencarian dan Penyaringan Fenomena Ekonomi">
        <div className="saas-card space-y-3 rounded-2xl p-4">
          <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            {/* Search Input */}
            <div className="relative flex-1 xl:max-w-md">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
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
                placeholder="Cari judul, ringkasan, komoditas... (Ctrl+K)"
                className="input-modern h-10 w-full rounded-xl pl-10 pr-9 text-xs placeholder:text-[var(--text-muted)]"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Bersihkan kata kunci pencarian"
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Segmented Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
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
                    className={`h-9 rounded-xl px-3.5 text-xs font-semibold transition-all ${
                      active
                        ? "bg-[#0F172A] text-white shadow-xs dark:bg-emerald-500 dark:text-slate-950"
                        : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-slate-200/70 hover:text-[var(--text-primary)] dark:hover:bg-slate-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Taxonomy Filters */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-hairline)] pt-3 text-xs">
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
              className="input-modern h-9 max-w-full rounded-xl px-3 text-xs font-medium"
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
              className="input-modern h-9 max-w-full rounded-xl px-3 text-xs font-medium"
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
              className="input-modern h-9 max-w-full rounded-xl px-3 text-xs font-medium"
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
                className="btn-secondary inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset ({activeFilterCount})</span>
              </button>
            )}

            <div className="ml-auto text-xs text-[var(--text-muted)] tabular-nums">
              Menampilkan{" "}
              <strong className="font-semibold text-[var(--text-primary)]">
                {pagination.total}
              </strong>{" "}
              fenomena
            </div>
          </div>
        </div>
      </search>

      {/* Contextual Batch Verification Bar */}
      {canEdit && selectedIds.size > 0 && (
        <div
          role="region"
          aria-label="Aksi verifikasi massal"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-5 py-3 text-xs shadow-xs dark:border-emerald-800/70 dark:bg-emerald-950/50"
        >
          <span className="font-medium text-[var(--text-primary)] tabular-nums">
            <strong className="font-bold text-emerald-800 dark:text-emerald-300">
              {selectedIds.size}
            </strong>{" "}
            fenomena dipilih untuk verifikasi massal
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isBatchSubmitting}
              onClick={() => void handleBatchAction("approved")}
              className="btn-emerald inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 font-semibold disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Setujui Terpilih ({selectedIds.size})</span>
            </button>
            <button
              type="button"
              disabled={isBatchSubmitting}
              onClick={() => void handleBatchAction("rejected")}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 font-semibold text-rose-800 transition-colors hover:bg-rose-100 disabled:opacity-60 dark:border-rose-800 dark:bg-rose-950/80 dark:text-rose-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tolak Terpilih ({selectedIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="btn-secondary h-9 rounded-xl px-3 font-medium"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Master-Detail Split-View Workbench (SyncMaster List + TellDesk Inline Pane) */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_480px] 2xl:grid-cols-[minmax(0,1fr)_530px]">
        {/* Left Column: SyncMaster Clean Phenomenon Feed */}
        <div className="saas-card overflow-hidden rounded-2xl">
          {/* Feed Header */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60 px-5 py-3">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  aria-label="Pilih semua baris halaman ini"
                  checked={rows.length > 0 && selectedIds.size === rows.length}
                  onChange={toggleSelectAll}
                  disabled={!canEdit || rows.length === 0}
                  className="h-4 w-4 rounded border-[var(--border-input)] bg-[var(--bg-surface)] accent-emerald-600"
                />
              </label>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Daftar Fenomena Ekonomi
              </span>
            </div>

            <span className="hidden text-xs text-[var(--text-muted)] sm:inline">
              Navigasi:{" "}
              <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-primary)]">
                J
              </kbd>{" "}
              /{" "}
              <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-primary)]">
                K
              </kbd>
            </span>
          </div>

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
                className="btn-obsidian mt-4 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Coba Muat Ulang</span>
              </button>
            </div>
          ) : isLoading ? (
            <div className="divide-y divide-[var(--border-hairline)]" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2.5 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-32 rounded-lg bg-[var(--bg-subtle)]" />
                    <div className="h-6 w-20 rounded-lg bg-[var(--bg-subtle)]" />
                  </div>
                  <div className="h-4 w-4/5 rounded-lg bg-[var(--bg-subtle)]" />
                  <div className="h-3 w-full rounded-lg bg-[var(--bg-subtle)]" />
                  <div className="flex gap-2 pt-1">
                    <div className="h-6 w-36 rounded-lg bg-[var(--bg-subtle)]" />
                    <div className="h-6 w-20 rounded-lg bg-[var(--bg-subtle)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {activeFilterCount > 0
                  ? "Tidak ada fenomena yang cocok dengan filter saat ini."
                  : `Belum ada data fenomena tercatat pada ${quarter} ${year}.`}
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-[var(--text-muted)]">
                {activeFilterCount > 0
                  ? "Ubah kata kunci pencarian atau reset filter untuk menampilkan seluruh fenomena pada periode ini."
                  : "Pilih triwulan/tahun lain di bilah atas atau klik Tarik Berita untuk mengambil berita ekonomi terbaru."}
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="btn-secondary mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset Semua Filter</span>
                </button>
              )}
            </div>
          ) : (
            <div
              role="list"
              aria-label={`Daftar Fenomena Ekonomi ${quarter} ${year}`}
              className="divide-y divide-[var(--border-hairline)]"
            >
              {rows.map((item) => {
                const isSelected = activeItem?.id === item.id;
                const isChecked = selectedIds.has(item.id);
                return (
                  <article
                    key={item.id}
                    role="listitem"
                    onClick={() => handleSelectRow(item)}
                    className={`group relative cursor-pointer border-l-[3px] px-5 py-4 transition-colors ${
                      isSelected
                        ? "border-l-emerald-600 bg-emerald-50/55 dark:border-l-emerald-400 dark:bg-emerald-950/25"
                        : "border-l-transparent hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Top Row: Checkbox + Source + Date | Status + Quick Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="flex items-center gap-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Pilih fenomena ${item.article.title}`}
                          checked={isChecked}
                          onChange={() => toggleSelectRow(item.id)}
                          disabled={!canEdit}
                          className="h-4 w-4 rounded border-[var(--border-input)] bg-[var(--bg-surface)] accent-emerald-600"
                        />
                        <SourceMediaLabel source={item.article.source} />
                        <span className="text-xs text-[var(--text-muted)] tabular-nums">
                          {formatShortDate(item.article.publishedDate)}
                        </span>
                      </div>

                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canEdit && item.status === "pending" && (
                          <div className="hidden items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 sm:flex">
                            <button
                              type="button"
                              onClick={() =>
                                void handleQuickDecision(item.id, "approved")
                              }
                              aria-label={`Setujui cepat ${item.article.title}`}
                              title="Setujui cepat"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleQuickDecision(item.id, "rejected")
                              }
                              aria-label={`Tolak cepat ${item.article.title}`}
                              title="Tolak (non-ekonomi)"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-300"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                        <StatusBadge status={item.status} />
                      </div>
                    </div>

                    {/* Headline & Summary */}
                    <div className="mt-2.5 pl-6">
                      <h3
                        className={`text-[15px] font-semibold leading-snug transition-colors ${
                          isSelected
                            ? "text-emerald-900 dark:text-emerald-200"
                            : "text-[var(--text-primary)] group-hover:text-emerald-800 dark:group-hover:text-emerald-300"
                        }`}
                      >
                        {item.article.title}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                        {item.summary}
                      </p>

                      {/* Taxonomy & Impact Chips */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <KbliBadge
                          code={item.kbliCategory}
                          subsector={item.kbliSubsector}
                          compact
                        />
                        <ExpenditureBadge code={item.expenditureComponent} />
                        <ImpactIndicator
                          impact={item.impactType}
                          effect={item.priceVolumeEffect}
                          inline
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60 px-5 py-3 text-xs text-[var(--text-muted)]">
            <span className="tabular-nums">
              Halaman{" "}
              <strong className="font-semibold text-[var(--text-primary)]">
                {pagination.page}
              </strong>{" "}
              dari{" "}
              <strong className="font-semibold text-[var(--text-primary)]">
                {pagination.totalPages}
              </strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary inline-flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-semibold disabled:opacity-45"
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
                className="btn-secondary inline-flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-semibold disabled:opacity-45"
              >
                <span>Berikutnya</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: TellDesk Sticky Inline Inspection & Verification Pane */}
        <aside
          aria-label="Panel Inspeksi dan Verifikasi Fenomena"
          className="sticky top-20 hidden xl:block"
        >
          <SplitInspectionPane
            phenomenon={activeItem}
            user={user}
            onSaved={(msg) => onDataMutated(msg, "success")}
            onError={(msg) => onDataMutated(msg, "error")}
          />
        </aside>
      </div>
    </div>
  );
}
