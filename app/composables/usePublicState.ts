// app/composables/usePublicState.ts
import {
  formatPeriodLabel,
  getCurrentQuarterYearWita,
  type PdrbQuarter,
} from '#shared/utils/period';

export function usePublicPortalState() {
  const defaultPeriod = getCurrentQuarterYearWita();

  const searchInput = useState<string>('sipena:public-search', () => '');
  const selectedYear = useState<number>('sipena:public-year', () => defaultPeriod.year);
  const selectedQuarter = useState<PdrbQuarter>(
    'sipena:public-quarter',
    () => defaultPeriod.quarter,
  );
  const totalVerifiedInPeriod = useState<number>('sipena:public-total', () => 0);

  const shortHeaderPeriod = computed(() => {
    const roman = ['', 'I', 'II', 'III', 'IV'][selectedQuarter.value] ?? 'I';
    return `TW ${roman} ${selectedYear.value}`;
  });

  const fullPeriodLabel = computed(() =>
    formatPeriodLabel(selectedQuarter.value, selectedYear.value),
  );

  return {
    searchInput,
    selectedYear,
    selectedQuarter,
    totalVerifiedInPeriod,
    shortHeaderPeriod,
    fullPeriodLabel,
  };
}
