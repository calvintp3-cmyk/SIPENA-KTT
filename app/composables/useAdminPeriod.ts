// app/composables/useAdminPeriod.ts
import {
  formatPeriodLabel,
  getCurrentQuarterYearWita,
  type PdrbQuarter,
} from '#shared/utils/period';

export function useAdminPeriod() {
  const defaultWita = getCurrentQuarterYearWita();

  const selectedYear = useState<number>('sipena:admin-year', () => defaultWita.year);
  const selectedQuarter = useState<PdrbQuarter>('sipena:admin-quarter', () => defaultWita.quarter);
  const dynamicYears = useState<number[]>('sipena:admin-years-list', () => [defaultWita.year]);

  function setPeriod(year: number, quarter: PdrbQuarter) {
    selectedYear.value = year;
    selectedQuarter.value = quarter;
  }

  function registerAvailableYears(years: number[]) {
    const merged = new Set<number>([defaultWita.year, selectedYear.value, ...years]);
    dynamicYears.value = Array.from(merged).sort((a, b) => b - a);
  }

  const yearOptions = computed(() => {
    const set = new Set<number>([
      defaultWita.year,
      defaultWita.year - 1,
      defaultWita.year - 2,
      selectedYear.value,
      ...dynamicYears.value,
    ]);
    return Array.from(set)
      .sort((a, b) => b - a)
      .map((y) => ({ label: String(y), value: y }));
  });

  const quarterChips: Array<{ value: PdrbQuarter; shortLabel: string; label: string }> = [
    { value: 1, shortLabel: 'TW I', label: 'Triwulan I' },
    { value: 2, shortLabel: 'TW II', label: 'Triwulan II' },
    { value: 3, shortLabel: 'TW III', label: 'Triwulan III' },
    { value: 4, shortLabel: 'TW IV', label: 'Triwulan IV' },
  ];

  const periodLabel = computed(() =>
    formatPeriodLabel(selectedQuarter.value, selectedYear.value),
  );

  const shortPeriodLabel = computed(
    () => `TW ${['', 'I', 'II', 'III', 'IV'][selectedQuarter.value]} ${selectedYear.value}`,
  );

  return {
    selectedYear,
    selectedQuarter,
    periodLabel,
    shortPeriodLabel,
    yearOptions,
    quarterChips,
    setPeriod,
    registerAvailableYears,
  };
}

