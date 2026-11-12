// shared/utils/pdrb-colors.ts
import { ExpenditureComponentEnum } from '../enums/pdrb';

export type PdrbClusterKey = 'PRIMARY_SDA' | 'INDUSTRY_BUILD' | 'TRADE_LOGISTICS' | 'FINANCE_PUBLIC' | 'DEFAULT';

export interface PdrbClusterTheme {
  key: PdrbClusterKey;
  label: string;
  hex: string;
  hexLight: string;
  pillClass: string;
  accentBarClass: string;
  softStripClass: string;
  iconBgClass: string;
}

const CLUSTER_THEMES: Record<PdrbClusterKey, PdrbClusterTheme> = {
  PRIMARY_SDA: {
    key: 'PRIMARY_SDA',
    label: 'Primer & Sumber Daya',
    hex: '#059669',
    hexLight: '#D1FAE5',
    pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
    accentBarClass: 'bg-emerald-500',
    softStripClass: 'bg-emerald-50/55 border-emerald-200/60',
    iconBgClass: 'bg-emerald-100/90 text-emerald-700',
  },
  INDUSTRY_BUILD: {
    key: 'INDUSTRY_BUILD',
    label: 'Industri, Energi & Konstruksi',
    hex: '#D97706',
    hexLight: '#FEF3C7',
    pillClass: 'bg-amber-50 text-amber-800 border-amber-200/90',
    accentBarClass: 'bg-amber-500',
    softStripClass: 'bg-amber-50/55 border-amber-200/60',
    iconBgClass: 'bg-amber-100/90 text-amber-700',
  },
  TRADE_LOGISTICS: {
    key: 'TRADE_LOGISTICS',
    label: 'Perdagangan, Logistik & Digital',
    hex: '#2563EB',
    hexLight: '#DBEAFE',
    pillClass: 'bg-blue-50 text-blue-800 border-blue-200/90',
    accentBarClass: 'bg-blue-600',
    softStripClass: 'bg-blue-50/55 border-blue-200/60',
    iconBgClass: 'bg-blue-100/90 text-blue-700',
  },
  FINANCE_PUBLIC: {
    key: 'FINANCE_PUBLIC',
    label: 'Keuangan, Properti & Jasa Publik',
    hex: '#7C3AED',
    hexLight: '#EDE9FE',
    pillClass: 'bg-violet-50 text-violet-800 border-violet-200/90',
    accentBarClass: 'bg-violet-600',
    softStripClass: 'bg-violet-50/55 border-violet-200/60',
    iconBgClass: 'bg-violet-100/90 text-violet-700',
  },
  DEFAULT: {
    key: 'DEFAULT',
    label: 'Lainnya',
    hex: '#475569',
    hexLight: '#E2E8F0',
    pillClass: 'bg-slate-100 text-slate-700 border-slate-200',
    accentBarClass: 'bg-slate-400',
    softStripClass: 'bg-slate-50/80 border-slate-200/80',
    iconBgClass: 'bg-slate-100 text-slate-700',
  },
};

export function getKbliClusterKey(codeOrGroup: string | null | undefined): PdrbClusterKey {
  if (!codeOrGroup) return 'DEFAULT';
  const normalized = codeOrGroup.trim().toUpperCase();
  if (!normalized) return 'DEFAULT';

  const firstToken = normalized.split(',')[0]?.trim() ?? normalized;
  if (firstToken === 'A' || firstToken === 'B') return 'PRIMARY_SDA';
  if (firstToken === 'C' || firstToken === 'D' || firstToken === 'E' || firstToken === 'F') {
    return 'INDUSTRY_BUILD';
  }
  if (
    firstToken === 'G' ||
    firstToken === 'H' ||
    firstToken === 'I' ||
    firstToken === 'J' ||
    firstToken === 'K' ||
    normalized === 'J,K'
  ) {
    return 'TRADE_LOGISTICS';
  }
  if (
    ['L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'].includes(firstToken) ||
    normalized === 'N,O' ||
    normalized === 'S,T,U,V'
  ) {
    return 'FINANCE_PUBLIC';
  }
  return 'DEFAULT';
}

export function getKbliClusterTheme(codeOrGroup: string | null | undefined): PdrbClusterTheme {
  return CLUSTER_THEMES[getKbliClusterKey(codeOrGroup)];
}

export interface ExpenditureColorTheme {
  hex: string;
  pillClass: string;
  dotClass: string;
}

const EXPENDITURE_COLOR_MAP: Record<ExpenditureComponentEnum, ExpenditureColorTheme> = {
  [ExpenditureComponentEnum.PK_RT]: {
    hex: '#2563EB',
    pillClass: 'bg-blue-50 text-blue-800 border-blue-200/90',
    dotClass: 'bg-blue-600',
  },
  [ExpenditureComponentEnum.PK_LNPRT]: {
    hex: '#7C3AED',
    pillClass: 'bg-violet-50 text-violet-800 border-violet-200/90',
    dotClass: 'bg-violet-600',
  },
  [ExpenditureComponentEnum.PK_P]: {
    hex: '#0D9488',
    pillClass: 'bg-teal-50 text-teal-800 border-teal-200/90',
    dotClass: 'bg-teal-600',
  },
  [ExpenditureComponentEnum.PMTB]: {
    hex: '#D97706',
    pillClass: 'bg-amber-50 text-amber-800 border-amber-200/90',
    dotClass: 'bg-amber-500',
  },
  [ExpenditureComponentEnum.INVENTORY_CHANGE]: {
    hex: '#DB2777',
    pillClass: 'bg-pink-50 text-pink-800 border-pink-200/90',
    dotClass: 'bg-pink-600',
  },
  [ExpenditureComponentEnum.NET_EXPORT]: {
    hex: '#059669',
    pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
    dotClass: 'bg-emerald-600',
  },
};

const DEFAULT_EXPENDITURE_THEME: ExpenditureColorTheme = {
  hex: '#64748B',
  pillClass: 'bg-slate-100 text-slate-700 border-slate-200',
  dotClass: 'bg-slate-400',
};

export function getExpenditureColorTheme(
  code: ExpenditureComponentEnum | string | null | undefined,
): ExpenditureColorTheme {
  if (!code) return DEFAULT_EXPENDITURE_THEME;
  return EXPENDITURE_COLOR_MAP[code as ExpenditureComponentEnum] ?? DEFAULT_EXPENDITURE_THEME;
}

