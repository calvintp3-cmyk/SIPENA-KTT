// app/composables/usePdrbLabels.ts
import {
  ArticleSourceTypeEnum,
  EXPENDITURE_COMPONENT_LABELS,
  EXPENDITURE_IMPACT_LABELS,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KBLI_CATEGORY_META,
  KBLI_IMPACT_LABELS,
  KbliCategoryEnum,
  KbliImpactEnum,
  LlmStatusEnum,
  ScraperRunStatusEnum,
  ScraperRunTypeEnum,
  VERIFICATION_STATUS_LABELS,
  VerificationStatusEnum,
} from '#shared/enums/pdrb';
import type { SelectOptionItem, UiSemanticColor } from '~/types/sipena';

export interface BadgeVisualMeta {
  label: string;
  shortLabel: string;
  color: UiSemanticColor;
  icon: string;
}

const KBLI_IMPACT_VISUAL: Record<KbliImpactEnum, BadgeVisualMeta> = {
  [KbliImpactEnum.INCREASE_NTB]: {
    label: KBLI_IMPACT_LABELS[KbliImpactEnum.INCREASE_NTB],
    shortLabel: 'Naik NTB',
    color: 'success',
    icon: 'i-lucide-trending-up',
  },
  [KbliImpactEnum.DECREASE_NTB]: {
    label: KBLI_IMPACT_LABELS[KbliImpactEnum.DECREASE_NTB],
    shortLabel: 'Turun NTB',
    color: 'error',
    icon: 'i-lucide-trending-down',
  },
  [KbliImpactEnum.INCREASE_PRICE]: {
    label: KBLI_IMPACT_LABELS[KbliImpactEnum.INCREASE_PRICE],
    shortLabel: 'Naik Harga',
    color: 'warning',
    icon: 'i-lucide-arrow-up-right',
  },
  [KbliImpactEnum.DECREASE_PRICE]: {
    label: KBLI_IMPACT_LABELS[KbliImpactEnum.DECREASE_PRICE],
    shortLabel: 'Turun Harga',
    color: 'info',
    icon: 'i-lucide-arrow-down-right',
  },
};

const EXPENDITURE_IMPACT_VISUAL: Record<ExpenditureImpactEnum, BadgeVisualMeta> = {
  [ExpenditureImpactEnum.INCREASE_REAL]: {
    label: EXPENDITURE_IMPACT_LABELS[ExpenditureImpactEnum.INCREASE_REAL],
    shortLabel: 'Naik Riil',
    color: 'success',
    icon: 'i-lucide-trending-up',
  },
  [ExpenditureImpactEnum.DECREASE_REAL]: {
    label: EXPENDITURE_IMPACT_LABELS[ExpenditureImpactEnum.DECREASE_REAL],
    shortLabel: 'Turun Riil',
    color: 'error',
    icon: 'i-lucide-trending-down',
  },
  [ExpenditureImpactEnum.INCREASE_DEFLATOR]: {
    label: EXPENDITURE_IMPACT_LABELS[ExpenditureImpactEnum.INCREASE_DEFLATOR],
    shortLabel: 'Naik Deflator',
    color: 'warning',
    icon: 'i-lucide-arrow-up-right',
  },
  [ExpenditureImpactEnum.DECREASE_DEFLATOR]: {
    label: EXPENDITURE_IMPACT_LABELS[ExpenditureImpactEnum.DECREASE_DEFLATOR],
    shortLabel: 'Turun Deflator',
    color: 'info',
    icon: 'i-lucide-arrow-down-right',
  },
};

const VERIFICATION_VISUAL: Record<VerificationStatusEnum, BadgeVisualMeta> = {
  [VerificationStatusEnum.PENDING]: {
    label: VERIFICATION_STATUS_LABELS[VerificationStatusEnum.PENDING],
    shortLabel: 'Pending',
    color: 'warning',
    icon: 'i-lucide-clock',
  },
  [VerificationStatusEnum.VERIFIED]: {
    label: VERIFICATION_STATUS_LABELS[VerificationStatusEnum.VERIFIED],
    shortLabel: 'Terverifikasi',
    color: 'success',
    icon: 'i-lucide-check-circle-2',
  },
  [VerificationStatusEnum.IGNORED]: {
    label: VERIFICATION_STATUS_LABELS[VerificationStatusEnum.IGNORED],
    shortLabel: 'Diabaikan',
    color: 'neutral',
    icon: 'i-lucide-archive-x',
  },
};

const LLM_STATUS_VISUAL: Record<LlmStatusEnum, BadgeVisualMeta> = {
  [LlmStatusEnum.SUCCESS]: {
    label: 'AI Sukses',
    shortLabel: 'AI Sukses',
    color: 'success',
    icon: 'i-lucide-sparkles',
  },
  [LlmStatusEnum.FAILED]: {
    label: 'LLM Gagal',
    shortLabel: 'LLM Gagal',
    color: 'error',
    icon: 'i-lucide-alert-triangle',
  },
  [LlmStatusEnum.SKIPPED_MANUAL]: {
    label: 'Input Manual',
    shortLabel: 'Manual',
    color: 'info',
    icon: 'i-lucide-pen-line',
  },
};

const SCRAPER_STATUS_VISUAL: Record<ScraperRunStatusEnum, BadgeVisualMeta> = {
  [ScraperRunStatusEnum.RUNNING]: {
    label: 'Sedang Berjalan',
    shortLabel: 'Berjalan',
    color: 'info',
    icon: 'i-lucide-loader-circle',
  },
  [ScraperRunStatusEnum.SUCCESS]: {
    label: 'Sukses',
    shortLabel: 'Sukses',
    color: 'success',
    icon: 'i-lucide-check-circle-2',
  },
  [ScraperRunStatusEnum.PARTIAL]: {
    label: 'Parsial',
    shortLabel: 'Parsial',
    color: 'warning',
    icon: 'i-lucide-alert-circle',
  },
  [ScraperRunStatusEnum.FAILED]: {
    label: 'Gagal',
    shortLabel: 'Gagal',
    color: 'error',
    icon: 'i-lucide-x-circle',
  },
};

export function usePdrbLabels() {
  const kbliOptions: SelectOptionItem<KbliCategoryEnum>[] = (
    Object.values(KbliCategoryEnum) as KbliCategoryEnum[]
  ).map((code) => ({
    value: code,
    label: KBLI_CATEGORY_META[code].fullLabel,
    shortLabel: `[${code}] ${KBLI_CATEGORY_META[code].name}`,
  }));

  const kbliImpactOptions: SelectOptionItem<KbliImpactEnum>[] = (
    Object.values(KbliImpactEnum) as KbliImpactEnum[]
  ).map((code) => ({
    value: code,
    label: KBLI_IMPACT_LABELS[code],
    shortLabel: KBLI_IMPACT_VISUAL[code].shortLabel,
  }));

  const expenditureOptions: SelectOptionItem<ExpenditureComponentEnum>[] = (
    Object.values(ExpenditureComponentEnum) as ExpenditureComponentEnum[]
  ).map((code) => ({
    value: code,
    label: EXPENDITURE_COMPONENT_LABELS[code].official,
    shortLabel: EXPENDITURE_COMPONENT_LABELS[code].short,
  }));

  const expenditureImpactOptions: SelectOptionItem<ExpenditureImpactEnum>[] = (
    Object.values(ExpenditureImpactEnum) as ExpenditureImpactEnum[]
  ).map((code) => ({
    value: code,
    label: EXPENDITURE_IMPACT_LABELS[code],
    shortLabel: EXPENDITURE_IMPACT_VISUAL[code].shortLabel,
  }));

  const quarterOptions: Array<{ label: string; value: 1 | 2 | 3 | 4 }> = [
    { label: 'Triwulan I (Jan–Mar)', value: 1 },
    { label: 'Triwulan II (Apr–Jun)', value: 2 },
    { label: 'Triwulan III (Jul–Sep)', value: 3 },
    { label: 'Triwulan IV (Okt–Des)', value: 4 },
  ];

  const verificationStatusOptions: SelectOptionItem<VerificationStatusEnum>[] = (
    Object.values(VerificationStatusEnum) as VerificationStatusEnum[]
  ).map((status) => ({
    value: status,
    label: VERIFICATION_STATUS_LABELS[status],
  }));

  function getKbliLabel(code: KbliCategoryEnum | null | undefined, full = true): string {
    if (!code || !(code in KBLI_CATEGORY_META)) return 'Belum Dipetakan';
    return full ? KBLI_CATEGORY_META[code].fullLabel : KBLI_CATEGORY_META[code].name;
  }

  function getKbliShortCodeName(code: KbliCategoryEnum | null | undefined): string {
    if (!code || !(code in KBLI_CATEGORY_META)) return 'Belum Dipetakan';
    const name = KBLI_CATEGORY_META[code].name;
    const truncated = name.length > 34 ? `${name.slice(0, 32)}…` : name;
    return `[${code}] ${truncated}`;
  }

  function getKbliImpactBadge(impact: KbliImpactEnum | null | undefined): BadgeVisualMeta {
    if (!impact || !(impact in KBLI_IMPACT_VISUAL)) {
      return {
        label: 'Belum Dipetakan',
        shortLabel: 'Belum Dipetakan',
        color: 'neutral',
        icon: 'i-lucide-help-circle',
      };
    }
    return KBLI_IMPACT_VISUAL[impact];
  }

  function getExpenditureLabel(
    code: ExpenditureComponentEnum | null | undefined,
    official = false,
  ): string {
    if (!code || !(code in EXPENDITURE_COMPONENT_LABELS)) return 'Belum Dipetakan';
    return official
      ? EXPENDITURE_COMPONENT_LABELS[code].official
      : EXPENDITURE_COMPONENT_LABELS[code].short;
  }

  function getExpenditureImpactBadge(
    impact: ExpenditureImpactEnum | null | undefined,
  ): BadgeVisualMeta {
    if (!impact || !(impact in EXPENDITURE_IMPACT_VISUAL)) {
      return {
        label: 'Belum Dipetakan',
        shortLabel: 'Belum Dipetakan',
        color: 'neutral',
        icon: 'i-lucide-help-circle',
      };
    }
    return EXPENDITURE_IMPACT_VISUAL[impact];
  }

  function getVerificationStatusBadge(
    status: VerificationStatusEnum | null | undefined,
  ): BadgeVisualMeta {
    if (!status || !(status in VERIFICATION_VISUAL)) {
      return VERIFICATION_VISUAL[VerificationStatusEnum.PENDING];
    }
    return VERIFICATION_VISUAL[status];
  }

  function getLlmStatusBadge(status: LlmStatusEnum | null | undefined): BadgeVisualMeta {
    if (!status || !(status in LLM_STATUS_VISUAL)) {
      return LLM_STATUS_VISUAL[LlmStatusEnum.FAILED];
    }
    return LLM_STATUS_VISUAL[status];
  }

  function getScraperStatusBadge(status: ScraperRunStatusEnum | null | undefined): BadgeVisualMeta {
    if (!status || !(status in SCRAPER_STATUS_VISUAL)) {
      return SCRAPER_STATUS_VISUAL[ScraperRunStatusEnum.FAILED];
    }
    return SCRAPER_STATUS_VISUAL[status];
  }

  function getScraperRunTypeLabel(runType: ScraperRunTypeEnum): string {
    switch (runType) {
      case ScraperRunTypeEnum.SCHEDULED:
        return 'Terjadwal';
      case ScraperRunTypeEnum.MANUAL:
        return 'Manual';
      case ScraperRunTypeEnum.RETRY_LLM:
        return 'Retry LLM';
      default:
        return runType;
    }
  }

  function getSourceTypeLabel(sourceType: ArticleSourceTypeEnum): string {
    switch (sourceType) {
      case ArticleSourceTypeEnum.REGIONAL:
        return 'Portal Regional';
      case ArticleSourceTypeEnum.NATIONAL:
        return 'Nasional (Keyword)';
      case ArticleSourceTypeEnum.MANUAL:
        return 'Input Manual';
      default:
        return sourceType;
    }
  }

  function isSafeHttpUrl(rawUrl: string | null | undefined): boolean {
    if (!rawUrl) return false;
    return /^https?:\/\//i.test(rawUrl.trim());
  }

  function formatDurationMs(durationMs: number | null | undefined): string {
    if (durationMs === null || durationMs === undefined || durationMs < 0) return '-';
    const totalSeconds = Math.round(durationMs / 1000);
    if (totalSeconds < 60) return `${totalSeconds} dtk`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return secs > 0 ? `${mins}m ${secs}d` : `${mins} menit`;
  }

  function formatNumberId(val: number | null | undefined): string {
    return new Intl.NumberFormat('id-ID').format(val ?? 0);
  }

  return {
    kbliOptions,
    kbliImpactOptions,
    expenditureOptions,
    expenditureImpactOptions,
    quarterOptions,
    verificationStatusOptions,
    getKbliLabel,
    getKbliShortCodeName,
    getKbliImpactBadge,
    getExpenditureLabel,
    getExpenditureImpactBadge,
    getVerificationStatusBadge,
    getLlmStatusBadge,
    getScraperStatusBadge,
    getScraperRunTypeLabel,
    getSourceTypeLabel,
    isSafeHttpUrl,
    formatDurationMs,
    formatNumberId,
  };
}

