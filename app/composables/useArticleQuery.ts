// app/composables/useArticleQuery.ts
import type { TableColumn } from '@nuxt/ui';
import {
  ExpenditureComponentEnum,
  KbliCategoryEnum,
  LlmStatusEnum,
  PDRB_17_SECTORS,
  VerificationStatusEnum,
} from '#shared/enums/pdrb';
import { getCurrentQuarterYearWita, type PdrbQuarter } from '#shared/utils/period';
import { KTT_SUBDISTRICTS } from '~/composables/usePdrbLabels';
import type { AdminArticleItem, SelectOptionItem } from '~/types/sipena';

export interface ArticleFiltersState {
  q: string;
  quarter: 'ALL' | 1 | 2 | 3 | 4;
  year: 'ALL' | number;
  pdrbGroup: string;
  kbli: string;
  expenditure: string;
  portal: string;
  subdistrict: string;
  status: string;
  llmStatus: string;
  isEconomic: 'ALL' | 'true' | 'false';
  from: string;
  to: string;
}

export function useArticleQuery() {
  const { kbliOptions, expenditureOptions, quarterOptions, verificationStatusOptions } = usePdrbLabels();
  const currentPeriod = getCurrentQuarterYearWita();

  const quarterFilterItems = computed(() => [
    { label: 'Semua Triwulan', value: 'ALL' as const },
    ...quarterOptions,
  ]);

  const yearFilterItems = computed(() => {
    const years = new Set<number>();
    for (let y = currentPeriod.year + 1; y >= currentPeriod.year - 4; y--) {
      years.add(y);
    }
    const sorted = Array.from(years).sort((a, b) => b - a);
    return [
      { label: 'Semua Tahun', value: 'ALL' as const },
      ...sorted.map((y) => ({ label: String(y), value: y })),
    ];
  });

  const pdrbGroupFilterItems = computed<SelectOptionItem<string>[]>(() => [
    { label: 'Semua 17 Sektor PDRB', value: 'ALL' },
    ...PDRB_17_SECTORS.map((sector) => ({
      label: `${sector.groupCode} - ${sector.shortName}`,
      value: sector.groupCode,
    })),
  ]);

  const kbliFilterItems = computed<SelectOptionItem<string>[]>(() => [
    { label: 'Semua Huruf KBLI (A–V)', value: 'ALL' },
    ...kbliOptions,
  ]);

  const expenditureFilterItems = computed<SelectOptionItem<string>[]>(() => [
    { label: 'Semua Komponen Pengeluaran', value: 'ALL' },
    ...expenditureOptions,
  ]);

  const statusFilterItems = computed<SelectOptionItem<string>[]>(() => [
    { label: 'Semua Status', value: 'ALL' },
    ...verificationStatusOptions,
  ]);

  const llmStatusFilterItems: SelectOptionItem<string>[] = [
    { label: 'Semua Status AI', value: 'ALL' },
    { label: 'AI Sukses', value: LlmStatusEnum.SUCCESS },
    { label: 'LLM Gagal', value: LlmStatusEnum.FAILED },
    { label: 'Input Manual', value: LlmStatusEnum.SKIPPED_MANUAL },
  ];

  const economicFilterItems: SelectOptionItem<string>[] = [
    { label: 'Semua Relevansi', value: 'ALL' },
    { label: 'Fenomena Ekonomi', value: 'true' },
    { label: 'Non-Ekonomi', value: 'false' },
  ];

  const subdistrictFilterItems: SelectOptionItem<string>[] = [
    { label: 'Semua Lokus / Kecamatan', value: 'ALL' },
    ...KTT_SUBDISTRICTS.map((s: string) => ({
      label: `Kec. ${s}`,
      value: s,
    })),
  ];

  const columns: TableColumn<AdminArticleItem>[] = [
    { accessorKey: 'select', header: '', id: 'select' },
    { accessorKey: 'publishedAt', header: 'Tanggal', id: 'publishedAt' },
    { accessorKey: 'title', header: 'Judul & Sumber', id: 'title' },
    { accessorKey: 'kbliCategory', header: 'Kategori KBLI', id: 'kbli' },
    { accessorKey: 'expenditureComponent', header: 'Pengeluaran', id: 'expenditure' },
    { accessorKey: 'period', header: 'Periode', id: 'period' },
    { accessorKey: 'verificationStatus', header: 'Status', id: 'status' },
    { id: 'actions', header: 'Aksi' },
  ];

  function parseRouteQuery(queryObj: Record<string, unknown>, filters: ArticleFiltersState, page: Ref<number>) {
    const readSingleQuery = (val: unknown): string => {
      if (Array.isArray(val)) return val[0] ? String(val[0]).trim() : '';
      return val ? String(val).trim() : '';
    };

    filters.q = readSingleQuery(queryObj.q);
    const qQuarter = Number(readSingleQuery(queryObj.quarter));
    filters.quarter = [1, 2, 3, 4].includes(qQuarter) ? (qQuarter as 1 | 2 | 3 | 4) : 'ALL';

    const qYear = Number(readSingleQuery(queryObj.year));
    filters.year = Number.isInteger(qYear) && qYear >= 2000 && qYear <= 2100 ? qYear : 'ALL';

    const qKbli = readSingleQuery(queryObj.kbli).toUpperCase();
    const qGroup = readSingleQuery(queryObj.pdrbGroup).toUpperCase();

    if (qKbli && qKbli in KbliCategoryEnum) {
      filters.kbli = qKbli;
      filters.pdrbGroup = 'ALL';
    } else {
      filters.kbli = 'ALL';
      const matchedGroup = PDRB_17_SECTORS.find((s) => s.groupCode === qGroup);
      filters.pdrbGroup = matchedGroup ? matchedGroup.groupCode : 'ALL';
    }

    const qExp = readSingleQuery(queryObj.expenditure);
    filters.expenditure = qExp && qExp in ExpenditureComponentEnum ? qExp : 'ALL';

    const qPortal = readSingleQuery(queryObj.portal);
    filters.portal = qPortal || 'ALL';

    const qSubdistrict = readSingleQuery(queryObj.subdistrict);
    filters.subdistrict = qSubdistrict || 'ALL';

    const qStatus = readSingleQuery(queryObj.status).toUpperCase();
    filters.status = qStatus && ['PENDING', 'VERIFIED', 'IGNORED'].includes(qStatus) ? qStatus : 'ALL';

    const qLlm = readSingleQuery(queryObj.llmStatus).toUpperCase();
    filters.llmStatus = qLlm && ['SUCCESS', 'FAILED', 'SKIPPED_MANUAL'].includes(qLlm) ? qLlm : 'ALL';

    const qEcon = readSingleQuery(queryObj.isEconomic).toLowerCase();
    filters.isEconomic = qEcon === 'true' || qEcon === 'false' ? qEcon : 'ALL';

    filters.from = readSingleQuery(queryObj.from);
    filters.to = readSingleQuery(queryObj.to);

    const qPage = Number(readSingleQuery(queryObj.page));
    page.value = Number.isInteger(qPage) && qPage >= 1 ? qPage : 1;
  }

  function applyDatePreset(
    preset: 'all' | 'today' | 'last7d' | 'last30d' | 'thisQuarter',
    filters: ArticleFiltersState,
    page: Ref<number>,
  ) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    if (preset === 'all') {
      filters.from = '';
      filters.to = '';
    } else if (preset === 'today') {
      filters.from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      filters.to = filters.from;
    } else if (preset === 'last7d' || preset === 'last30d') {
      const days = preset === 'last7d' ? 7 : 30;
      const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filters.from = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`;
      filters.to = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    } else if (preset === 'thisQuarter') {
      const targetYear = typeof filters.year === 'number' ? filters.year : currentPeriod.year;
      const targetQuarter =
        typeof filters.quarter === 'number' ? filters.quarter : currentPeriod.quarter;
      const qMap = {
        1: { s: 1, e: 3, ed: 31 },
        2: { s: 4, e: 6, ed: 30 },
        3: { s: 7, e: 9, ed: 30 },
        4: { s: 10, e: 12, ed: 31 },
      }[targetQuarter as 1 | 2 | 3 | 4] || { s: 1, e: 3, ed: 31 };
      filters.from = `${targetYear}-${pad(qMap.s)}-01`;
      filters.to = `${targetYear}-${pad(qMap.e)}-${pad(qMap.ed)}`;
    }
    page.value = 1;
  }

  function getActiveFilterChips(filters: ArticleFiltersState) {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (filters.pdrbGroup !== 'ALL') {
      chips.push({
        key: 'pdrbGroup',
        label: `Sektor: ${filters.pdrbGroup}`,
        clear: () => { filters.pdrbGroup = 'ALL'; },
      });
    }
    if (filters.kbli !== 'ALL') {
      chips.push({
        key: 'kbli',
        label: `KBLI: ${filters.kbli}`,
        clear: () => { filters.kbli = 'ALL'; },
      });
    }
    if (filters.expenditure !== 'ALL') {
      chips.push({
        key: 'expenditure',
        label: `Pengeluaran: ${filters.expenditure}`,
        clear: () => { filters.expenditure = 'ALL'; },
      });
    }
    if (filters.subdistrict !== 'ALL') {
      chips.push({
        key: 'subdistrict',
        label: `Kec: ${filters.subdistrict}`,
        clear: () => { filters.subdistrict = 'ALL'; },
      });
    }
    if (filters.portal !== 'ALL') {
      chips.push({
        key: 'portal',
        label: `Portal: ${filters.portal}`,
        clear: () => { filters.portal = 'ALL'; },
      });
    }
    if (filters.isEconomic !== 'ALL') {
      chips.push({
        key: 'isEconomic',
        label: filters.isEconomic === 'true' ? 'Fenomena Ekonomi' : 'Non-Ekonomi',
        clear: () => { filters.isEconomic = 'ALL'; },
      });
    }
    if (filters.from || filters.to) {
      chips.push({
        key: 'dateRange',
        label: `Rentang: ${filters.from || '...'} s.d ${filters.to || '...'}`,
        clear: () => { filters.from = ''; filters.to = ''; },
      });
    }
    return chips;
  }

  function buildExportParams(filters: ArticleFiltersState, debouncedQ: string, format: 'xlsx' | 'csv') {
    return {
      format,
      q: debouncedQ || undefined,
      quarter: filters.quarter === 'ALL' ? undefined : filters.quarter,
      year: filters.year === 'ALL' ? undefined : filters.year,
      kbli: filters.kbli === 'ALL' ? undefined : filters.kbli,
      pdrbGroup: filters.kbli === 'ALL' && filters.pdrbGroup !== 'ALL' ? filters.pdrbGroup : undefined,
      expenditure: filters.expenditure === 'ALL' ? undefined : filters.expenditure,
      portal: filters.portal === 'ALL' ? undefined : filters.portal,
      subdistrict: filters.subdistrict === 'ALL' ? undefined : filters.subdistrict,
      status: filters.status === 'ALL' ? undefined : filters.status,
      llmStatus: filters.llmStatus === 'ALL' ? undefined : filters.llmStatus,
      isEconomic: 'true',
      from: filters.from || undefined,
      to: filters.to || undefined,
    };
  }

  return {
    currentPeriod,
    quarterFilterItems,
    yearFilterItems,
    pdrbGroupFilterItems,
    kbliFilterItems,
    expenditureFilterItems,
    statusFilterItems,
    llmStatusFilterItems,
    economicFilterItems,
    subdistrictFilterItems,
    columns,
    parseRouteQuery,
    applyDatePreset,
    getActiveFilterChips,
    buildExportParams,
  };
}
