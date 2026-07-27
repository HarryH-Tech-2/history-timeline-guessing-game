/**
 * Design tokens as plain JS values. NativeWind classes cover most styling, but
 * imperative code (Reanimated colours, gradients, canvas drawing) needs the raw
 * values. Keep this in sync with `tailwind.config.js`.
 */
export const palette = {
  bg: {
    base: '#0B0E14',
    raised: '#141924',
    overlay: '#1C2230',
  },
  ink: {
    primary: '#F4F6FB',
    secondary: '#AEB6C6',
    muted: '#6B7488',
  },
  accent: {
    default: '#5B8CFF',
    soft: '#8FB0FF',
  },
  success: '#3DDC97',
  warning: '#FFB454',
  danger: '#FF5C7A',
  hair: 'rgba(255,255,255,0.08)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Colour a category tile/marker by its own accent, falling back to the app accent. */
export function categoryColour(colour: string | undefined): string {
  return colour ?? palette.accent.default;
}
