// app/utils/chart-theme.ts
// Centralized semantic visualization palette aligned with CSS tokens in app/assets/css/main.css

export const SIPENA_CHART_TOKENS = {
  inkObsidian: '#1A1D1B',
  inkSecondary: '#474B48',
  inkAxis: '#575B58',
  inkMuted: '#6B6F6C',
  surfaceWhite: '#FFFFFF',
  surfaceMuted: '#F9F8F6',
  borderHairline: '#E7E4DC',
  borderSoft: '#D5D0C5',
  cobalt: '#0F4C3A',
  indigo: '#2D6A56',
  emerald: '#15803D',
  teal: '#0F766E',
  amber: '#D97706',
  rose: '#C2593F',
  slateMuted: '#D5D0C5',
  tooltipBorder: '#E7E4DC',
} as const;

export const SIPENA_KBLI_CLUSTER_CHART_PALETTE = [
  '#0F4C3A', // Deep Pine
  '#C2593F', // Terracotta
  '#2D6A56', // Sage Pine
  '#D97706', // Warm Amber
  '#0F766E', // Coastal Teal
  '#5B6E58', // Olive Moss
  '#9A3412', // Burnt Sienna
  '#475569', // Mineral Slate
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

