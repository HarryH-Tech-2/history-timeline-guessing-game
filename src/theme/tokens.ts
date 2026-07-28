/**
 * Design tokens as plain JS values. NativeWind classes cover most styling, but
 * imperative code (Reanimated colours, gradients, canvas drawing) needs the raw
 * values. Keep this in sync with `tailwind.config.js` and `global.css`.
 *
 * Colour is theme-aware. Surface/ink tones differ between light and dark; brand
 * accents are shared. The NativeWind classes (bg-bg-base, text-ink-primary, …)
 * resolve to CSS variables that {@link ThemeProvider} swaps at the app root, so
 * class-based styling flips automatically. Imperative consumers that need a
 * theme-sensitive colour (currently just `hair`) read it from `useThemeColors`.
 */

/** Brand accents — identical in both themes, tuned to read on light and dark. */
const brand = {
  accent: { default: '#4F80F5', soft: '#8FB0FF' },
  success: '#16A374',
  warning: '#D98A28',
  danger: '#EF4E6E',
} as const;

const lightSurfaces = {
  bg: { base: '#FAF7F2', raised: '#FFFFFF', overlay: '#F4F0E9' },
  ink: { primary: '#1A1815', secondary: '#5C574F', muted: '#8D867B' },
  hair: '#E4DFD6',
} as const;

const darkSurfaces = {
  bg: { base: '#0B0E14', raised: '#141924', overlay: '#1C2230' },
  ink: { primary: '#F4F6FB', secondary: '#AEB6C6', muted: '#6B7488' },
  hair: '#2A303C',
} as const;

export interface Palette {
  accent: { default: string; soft: string };
  success: string;
  warning: string;
  danger: string;
  bg: { base: string; raised: string; overlay: string };
  ink: { primary: string; secondary: string; muted: string };
  hair: string;
}

export const lightPalette: Palette = { ...brand, ...lightSurfaces };
export const darkPalette: Palette = { ...brand, ...darkSurfaces };

export type ThemeMode = 'light' | 'dark';

/**
 * Default palette for module-level constants (confetti, mode accent bars, …).
 * These only touch brand accents, which are theme-independent, so using the
 * light palette here is safe regardless of the active theme.
 */
export const palette = lightPalette;

/**
 * CSS-variable maps consumed by {@link ThemeProvider} via NativeWind's `vars()`.
 * Values are space-separated RGB channels so Tailwind can apply `<alpha-value>`.
 */
export const themeVars: Record<ThemeMode, Record<string, string>> = {
  light: buildVars(lightPalette),
  dark: buildVars(darkPalette),
};

function hexToRgbChannels(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function buildVars(p: Palette): Record<string, string> {
  return {
    '--color-bg-base': hexToRgbChannels(p.bg.base),
    '--color-bg-raised': hexToRgbChannels(p.bg.raised),
    '--color-bg-overlay': hexToRgbChannels(p.bg.overlay),
    '--color-ink-primary': hexToRgbChannels(p.ink.primary),
    '--color-ink-secondary': hexToRgbChannels(p.ink.secondary),
    '--color-ink-muted': hexToRgbChannels(p.ink.muted),
    '--color-accent': hexToRgbChannels(p.accent.default),
    '--color-accent-soft': hexToRgbChannels(p.accent.soft),
    '--color-success': hexToRgbChannels(p.success),
    '--color-warning': hexToRgbChannels(p.warning),
    '--color-danger': hexToRgbChannels(p.danger),
    '--color-hair': hexToRgbChannels(p.hair),
  };
}

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
