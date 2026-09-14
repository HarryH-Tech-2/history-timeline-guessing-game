import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { useAuth } from '@/services/firebase/auth';
import { createStore } from '@/storage';

import { identifyPlayer, setAnalyticsEnabled } from './client';

const analyticsStore = createStore<boolean>({
  key: 'chronos.analytics',
  schema: z.boolean(),
  fallback: true,
});

export interface AnalyticsSettingsValue {
  /** Whether usage analytics are switched on (default on). */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

/** Default used when no provider is mounted (isolated component tests). */
const DEFAULT_CONTEXT: AnalyticsSettingsValue = {
  enabled: true,
  setEnabled: () => {},
  toggle: () => {},
};

const AnalyticsSettingsContext = createContext<AnalyticsSettingsValue>(DEFAULT_CONTEXT);

/**
 * Owns the Usage analytics switch (Profile → Settings) and keeps the PostHog
 * client in step with it and with the signed-in uid. Must sit inside
 * AuthProvider. The choice is persisted on the device and re-applied on every
 * launch (PostHog keeps its own opt-out flag, so the two are kept in sync
 * here). In builds without a PostHog key every client call is a no-op.
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { uid } = useAuth();
  const [enabled, setEnabledState] = useState(true);

  // Rehydrate the persisted choice and apply it to the client.
  useEffect(() => {
    let active = true;
    void analyticsStore.read().then((saved) => {
      if (!active) return;
      setEnabledState(saved);
      void setAnalyticsEnabled(saved);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    identifyPlayer(uid);
  }, [uid]);

  const value = useMemo<AnalyticsSettingsValue>(() => {
    const setEnabled = (next: boolean) => {
      setEnabledState(next);
      void analyticsStore.write(next);
      void setAnalyticsEnabled(next);
    };
    return { enabled, setEnabled, toggle: () => setEnabled(!enabled) };
  }, [enabled]);

  return (
    <AnalyticsSettingsContext.Provider value={value}>{children}</AnalyticsSettingsContext.Provider>
  );
}

export function useAnalyticsSettings(): AnalyticsSettingsValue {
  return useContext(AnalyticsSettingsContext);
}
