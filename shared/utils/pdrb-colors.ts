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
    pillClass: 'bg-teal-50 text-teal-800 border-teal-200/90',
    accentBarClass: 'bg-teal-600',
    softStripClass: 'bg-teal-50/55 border-teal-200/60',
    iconBgClass: 'bg-teal-100/90 text-teal-800',
  },
  INDUSTRY_BUILD: {
    key: 'INDUSTRY_BUILD',
    label: 'Industri, Energi & Konstruksi',
    hex: '#D97706',
    hexLight: '#FEF3C7',
    pillClass: 'bg-orange-50 text-orange-800 border-orange-200/90',
    accentBarClass: 'bg-orange-600',
    softStripClass: 'bg-orange-50/55 border-orange-200/60',
    iconBgClass: 'bg-orange-100/90 text-orange-800',
  },
  TRADE_LOGISTICS: {
    key: 'TRADE_LOGISTICS',
    label: 'Perdagangan, Logistik & Digital',
    hex: '#2563EB',
    hexLight: '#DBEAFE',
    pillClass: 'bg-sky-50 text-sky-800 border-sky-200/90',
    accentBarClass: 'bg-sky-600',
    softStripClass: 'bg-sky-50/55 border-sky-200/60',
    iconBgClass: 'bg-sky-100/90 text-sky-800',
  },
  FINANCE_PUBLIC: {
    key: 'FINANCE_PUBLIC',
    label: 'Keuangan, Properti & Jasa Publik',
    hex: '#7C3AED',
    hexLight: '#EDE9FE',
    pillClass: 'bg-purple-50 text-purple-800 border-purple-200/90',
    accentBarClass: 'bg-purple-600',
    softStripClass: 'bg-purple-50/55 border-purple-200/60',
    iconBgClass: 'bg-purple-100/90 text-purple-800',
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
    pillClass: 'bg-slate-100/90 text-slate-800 border-slate-300/90',
    dotClass: 'bg-blue-700',
  },
  [ExpenditureComponentEnum.PK_LNPRT]: {
    hex: '#7C3AED',
    pillClass: 'bg-slate-100/90 text-slate-800 border-slate-300/90',
    dotClass: 'bg-violet-700',
  },
  [ExpenditureComponentEnum.PK_P]: {
    hex: '#0D9488',
    pillClass: 'bg-slate-100/90 text-slate-800 border-slate-300/90',
    dotClass: 'bg-teal-700',
  },
  [ExpenditureComponentEnum.PMTB]: {
    hex: '#D97706',
    pillClass: 'bg-slate-100/90 text-slate-800 border-slate-300/90',
    dotClass: 'bg-orange-700',
  },
  [ExpenditureComponentEnum.INVENTORY_CHANGE]: {
    hex: '#DB2777',
    pillClass: 'bg-slate-100/90 text-slate-800 border-slate-300/90',
    dotClass: 'bg-pink-700',
  },
  [ExpenditureComponentEnum.NET_EXPORT]: {
    hex: '#059669',
    pillClass: 'bg-slate-100/90 text-slate-800 border-slate-300/90',
    dotClass: 'bg-cyan-700',
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

