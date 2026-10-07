import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Linking } from 'react-native';
import { z } from 'zod';

import { useProgression } from '@/features/progression';
import { createStore } from '@/storage';
import { dateKey } from '@/utils/date';

import { reminderPermissionBlocked, requestReminderPermission, syncDailyReminder } from './scheduler';

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
  /**
   * Reminders will really arrive: the player wants them and the system allows
   * notifications. Off while the permission is missing, whatever was chosen.
   */
  enabled: boolean;
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
 * Owns the Daily reminder: the persisted on/off choice plus the queue of
 * pending local notifications, which is re-derived whenever the choice, the
 * day, or "played today" changes, and whenever the app returns to the
 * foreground (which is also when a permission changed in system settings is
 * noticed).
 * Must sit inside ProgressionProvider (it reads the Daily streak).
 */
export function RemindersProvider({ children }: { children: ReactNode }) {
  const { state: progression, isLoading: progressionLoading } = useProgression();
  const [state, setState] = useState<RemindersState>(FALLBACK);
  const [isLoading, setLoading] = useState(true);
  // Whether the system allows notifications, as of the last sync.
  const [permitted, setPermitted] = useState(true);
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
    let active = true;
    void syncDailyReminder({ enabled: state.enabled, playedToday, now: new Date() }).then((ok) => {
      if (active) setPermitted(ok);
    });
    return () => {
      active = false;
    };
  }, [isLoading, progressionLoading, state.enabled, playedToday, tick]);

  const persist = useCallback((next: RemindersState) => {
    setState(next);
    void remindersStore.write(next);
  }, []);

  const enable = useCallback(async () => {
    const granted = await requestReminderPermission();
    if (!granted && (await reminderPermissionBlocked())) {
      // The system won't ask again, so send the player to the app's settings.
      // The choice is kept: allowing notifications there and coming back
      // switches reminders on at the next foreground sync.
      persist({ enabled: true, asked: true });
      setPermitted(false);
      void Linking.openSettings().catch(() => {});
      return false;
    }
    persist({ enabled: granted, asked: true });
    setPermitted(granted);
    return granted;
  }, [persist]);

  const disable = useCallback(() => persist({ enabled: false, asked: true }), [persist]);
  const dismissNudge = useCallback(
    () => persist({ enabled: state.enabled, asked: true }),
    [persist, state.enabled],
  );

  const value = useMemo<RemindersContextValue>(
    () => ({ ...state, enabled: state.enabled && permitted, isLoading, enable, disable, dismissNudge }),
    [state, permitted, isLoading, enable, disable, dismissNudge],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  return useContext(RemindersContext);
}
