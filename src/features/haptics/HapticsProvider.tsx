import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { createStore } from '@/storage';

import { setHapticsEnabled } from './haptics';

const hapticsStore = createStore<boolean>({
  key: 'chronos.haptics',
  schema: z.boolean(),
  fallback: true,
});

export interface HapticsContextValue {
  /** Whether vibration feedback is switched on (default on). */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

/** Default used when no provider is mounted (isolated component tests). */
const DEFAULT_CONTEXT: HapticsContextValue = {
  enabled: true,
  setEnabled: () => {},
  toggle: () => {},
};

export const HapticsContext = createContext<HapticsContextValue>(DEFAULT_CONTEXT);

/**
 * Owns the Vibration switch (Profile → Settings): the persisted on/off choice,
 * re-applied to the module-level haptics gate on every launch and change.
 */
export function HapticsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);

  // Rehydrate the persisted choice after first paint (defaults to on).
  useEffect(() => {
    let active = true;
    void hapticsStore.read().then((saved) => {
      if (!active) return;
      setEnabledState(saved);
      setHapticsEnabled(saved);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<HapticsContextValue>(() => {
    const setEnabled = (next: boolean) => {
      setEnabledState(next);
      setHapticsEnabled(next);
      void hapticsStore.write(next);
    };
    return { enabled, setEnabled, toggle: () => setEnabled(!enabled) };
  }, [enabled]);

  return <HapticsContext.Provider value={value}>{children}</HapticsContext.Provider>;
}

export function useHaptics(): HapticsContextValue {
  return useContext(HapticsContext);
}
