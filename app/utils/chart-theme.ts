// app/utils/chart-theme.ts
// Centralized semantic visualization palette aligned with Observatory tokens in app/assets/css/main.css

export const SIPENA_CHART_TOKENS = {
  inkObsidian: '#141917',
  inkSecondary: '#4A524E',
  inkAxis: '#5F6762',
  inkMuted: '#5F6762',
  surfaceWhite: '#FFFFFF',
  surfaceMuted: '#F6F5F1',
  borderHairline: '#E2DFD7',
  borderSoft: '#ECEAE2',
  cobalt: '#0B3D2E',
  indigo: '#0B3D2E',
  emerald: '#0B3D2E',
  teal: '#0F766E',
  amber: '#B45309',
  rose: '#C8553D',
  slateMuted: '#ECEAE2',
  tooltipBorder: '#E2DFD7',
  pine: '#0B3D2E',
  copper: '#C8553D',
  ochre: '#B45309',
} as const;

export const SIPENA_KBLI_CLUSTER_CHART_PALETTE = [
  '#0B3D2E', // Deep Borneo Pine
  '#C8553D', // Burnished Copper
  '#0F766E', // Coastal Teal
  '#B45309', // Warm Ochre
  '#2D6A56', // Sage Pine
  '#5B6E58', // Olive Moss
  '#9A3412', // Burnt Sienna
  '#4A524E', // Mineral Charcoal
] as const;

export const SIPENA_CHART_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255, 255, 255, 0.98)',
  borderColor: SIPENA_CHART_TOKENS.borderHairline,
  borderWidth: 1,
  textStyle: {
    color: SIPENA_CHART_TOKENS.inkObsidian,
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontSize: 12,
  },
} as const;

