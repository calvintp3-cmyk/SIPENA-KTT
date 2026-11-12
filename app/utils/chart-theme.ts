// app/utils/chart-theme.ts
// Centralized semantic visualization palette aligned with CSS tokens in app/assets/css/main.css

export const SIPENA_CHART_TOKENS = {
  inkObsidian: '#0F172A',
  inkSecondary: '#334155',
  inkAxis: '#475569',
  inkMuted: '#64748B',
  surfaceWhite: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  borderHairline: '#E2E8F0',
  borderSoft: '#CBD5E1',
  cobalt: '#2563EB',
  indigo: '#4F46E5',
  emerald: '#059669',
  teal: '#0F766E',
  amber: '#D97706',
  rose: '#E11D48',
  slateMuted: '#CBD5E1',
  tooltipBorder: '#E2E8F0',
} as const;

export const SIPENA_KBLI_CLUSTER_CHART_PALETTE = [
  '#2563EB', // Cobalt
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#0F766E', // Teal
  '#D97706', // Amber
  '#0284C7', // Sky
  '#7C3AED', // Violet
  '#E11D48', // Rose
] as const;

export const SIPENA_CHART_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255, 255, 255, 0.98)',
  borderColor: SIPENA_CHART_TOKENS.borderHairline,
  borderWidth: 1,
  textStyle: {
    color: SIPENA_CHART_TOKENS.inkObsidian,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
  },
} as const;

