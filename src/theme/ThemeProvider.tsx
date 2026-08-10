import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { colorScheme, vars } from 'nativewind';
import { z } from 'zod';

import { createStore } from '@/storage';

import { darkPalette, lightPalette, themeVars, type Palette, type ThemeMode } from './tokens';

const themeStore = createStore<ThemeMode>({
  key: 'chronos.theme',
  schema: z.enum(['light', 'dark']),
  fallback: 'dark',
});

interface ThemeContextValue {
  mode: ThemeMode;
  /** Active palette for imperative (non-className) colour needs. */
  colors: Palette;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

/**
 * Default used when no provider is mounted (isolated component tests, etc.).
 * Mirrors the codebase convention of a working offline default so screens render
 * standalone. Dark theme (the app default), with inert setters.
 */
const DEFAULT_CONTEXT: ThemeContextValue = {
  mode: 'dark',
  colors: darkPalette,
  toggle: () => {},
  setMode: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_CONTEXT);

/**
 * Owns the light/dark choice. Defaults to dark (the app's black-and-copper
 * look), persists the user's pick, and publishes the active theme two ways: as
 * NativeWind CSS variables applied at the root (so every
 * `bg-bg-base`/`text-ink-primary` class flips for free) and as a resolved
 * {@link Palette} on context for imperative consumers.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  // Rehydrate the persisted choice after first paint (defaults to dark).
  useEffect(() => {
    let active = true;
    void themeStore.read().then((saved) => {
      if (active) setModeState(saved);
    });
    return () => {
      active = false;
    };
  }, []);

  // Keep NativeWind's runtime scheme in step so `dark:` variants and native
  // components (StatusBar helpers, etc.) agree with our explicit choice.
  useEffect(() => {
    colorScheme.set(mode);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(() => {
    const setMode = (next: ThemeMode) => {
      setModeState(next);
      void themeStore.write(next);
    };
    return {
      mode,
      colors: mode === 'dark' ? darkPalette : lightPalette,
      setMode,
      toggle: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    };
  }, [mode]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, vars(themeVars[mode])]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Convenience: the active palette for imperative colour values. */
export function useThemeColors(): Palette {
  return useTheme().colors;
}
