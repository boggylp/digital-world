export const VIBES = {
  sky: '#4fb6f2',
  sun: '#ffa53a',
  leaf: '#6cc04a',
  meadow: '#a8d86a',
  teal: '#3cc2c9',
  lavender: '#b8a2ee',
  blossom: '#f59ac4',
  mountain: '#7d9cc4',
  dusk: '#8a93b8'
} as const;

const SERIES_COLORS: readonly string[] = [
  VIBES.sun,
  VIBES.sky,
  VIBES.leaf,
  VIBES.blossom,
  VIBES.teal,
  VIBES.lavender,
  VIBES.meadow,
  VIBES.mountain
];

export const pickSeriesColor = (index: number): string => SERIES_COLORS[index % SERIES_COLORS.length] ?? VIBES.sun;
