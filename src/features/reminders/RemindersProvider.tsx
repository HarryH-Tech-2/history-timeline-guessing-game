import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { z } from 'zod';

import { useProgression } from '@/features/progression';
import { createStore } from '@/storage';
import { dateKey } from '@/utils/date';

import { requestReminderPermission, syncDailyReminder } from './scheduler';

const RemindersSchema = z.object({
  /** The player wants a Daily reminder. */
  enabled: z.boolean(),
  /** The in-app "remind me?" card has been answered once, either way. */
  asked: z.boolean(),
});
type RemindersState = z.infer<typeof RemindersSchema>;

const FALLBACK: RemindersState = { enabled: false, asked: false };

export const remindersStore = createStore<RemindersState>({
  key: 'chronos.reminders',
  schema: RemindersSchema,
  fallback: FALLBACK,
});

export interface RemindersContextValue extends RemindersState {
  isLoading: boolean;
  /** Ask for permission and switch reminders on; resolves to whether it took. */
  enable: () => Promise<boolean>;
  disable: () => void;
  /** The player said "not now" to the nudge card. */
  dismissNudge: () => void;
}

/** Default used when no provider is mounted (isolated component tests). */
const DEFAULT_CONTEXT: RemindersContextValue = {
  ...FALLBACK,
  isLoading: false,
  enable: () => Promise.resolve(false),
  disable: () => {},
  dismissNudge: () => {},
};

export const RemindersContext = createContext<RemindersContextValue>(DEFAULT_CONTEXT);

/**
 * Owns the Daily reminder: the persisted on/off choice plus the one pending
 * local notification, which is re-derived whenever the choice, the day, or
 * "played today" changes, and whenever the app returns to the foreground.
 * Must sit inside ProgressionProvider (it reads the Daily streak).
 */
export function RemindersProvider({ children }: { children: ReactNode }) {
  const { state: progression, isLoading: progressionLoading } = useProgression();
  const [state, setState] = useState<RemindersState>(FALLBACK);
  const [isLoading, setLoading] = useState(true);
  // Bumped on foreground so the sync effect re-runs with a fresh "now".
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    void remindersStore.read().then((saved) => {
      if (!active) return;
      setState(saved);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  const playedToday = progression.streak.lastDate === dateKey();

  useEffect(() => {
    if (isLoading || progressionLoading) return;
    void syncDailyReminder({ enabled: state.enabled, playedToday, now: new Date() });
  }, [isLoading, progressionLoading, state.enabled, playedToday, tick]);

  const persist = useCallback((next: RemindersState) => {
    setState(next);
    void remindersStore.write(next);
  }, []);

  const enable = useCallback(async () => {
    const granted = await requestReminderPermission();
    persist({ enabled: granted, asked: true });
    return granted;
  }, [persist]);

  const disable = useCallback(() => persist({ enabled: false, asked: true }), [persist]);
  const dismissNudge = useCallback(
    () => persist({ enabled: state.enabled, asked: true }),
    [persist, state.enabled],
  );

  const value = useMemo<RemindersContextValue>(
    () => ({ ...state, isLoading, enable, disable, dismissNudge }),
    [state, isLoading, enable, disable, dismissNudge],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  return useContext(RemindersContext);
}
