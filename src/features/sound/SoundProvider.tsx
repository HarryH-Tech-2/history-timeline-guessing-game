import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { z } from 'zod';

import { createStore } from '@/storage';

/** The two answer stings. Keys double as the `play()` argument. */
export type SoundEffect = 'right' | 'wrong';

const SOURCES: Record<SoundEffect, number> = {
  right: require('../../../assets/answer-right.mp3'),
  wrong: require('../../../assets/answer-wrong.mp3'),
};

const soundStore = createStore<boolean>({
  key: 'chronos.sound',
  schema: z.boolean(),
  fallback: true,
});

export interface SoundContextValue {
  /** Whether answer sound effects are switched on (default on). */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
  /** Play a sting from the start. A silent no-op while sounds are off. */
  play: (effect: SoundEffect) => void;
}

/** Default used when no provider is mounted (isolated component tests). */
const DEFAULT_CONTEXT: SoundContextValue = {
  enabled: true,
  setEnabled: () => {},
  toggle: () => {},
  play: () => {},
};

export const SoundContext = createContext<SoundContextValue>(DEFAULT_CONTEXT);

/**
 * Owns the answer sound effects: two preloaded players (so a sting fires the
 * instant a guess lands, with no load hitch) and the persisted on/off choice.
 * Playback mixes with whatever the player is already listening to rather than
 * pausing it — these are half-second stings, not a soundtrack.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);
  const players = useRef<Record<SoundEffect, AudioPlayer> | null>(null);

  // Rehydrate the persisted choice after first paint (defaults to on).
  useEffect(() => {
    let active = true;
    void soundStore.read().then((saved) => {
      if (active) setEnabledState(saved);
    });
    return () => {
      active = false;
    };
  }, []);

  // Preload both stings once for the life of the app and free them on unmount.
  useEffect(() => {
    // playsInSilentMode MUST be true: on Android expo-audio reads "silent mode"
    // as the ringer mode, and `play()` silently no-ops while the phone is on
    // vibrate/silent — which is how most phones sit. Stings belong to the
    // media stream, whose own volume the player controls.
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {
      // Audio mode is a nicety; playback still works with platform defaults.
    });
    const created: Record<SoundEffect, AudioPlayer> = {
      right: createAudioPlayer(SOURCES.right),
      wrong: createAudioPlayer(SOURCES.wrong),
    };
    players.current = created;
    return () => {
      players.current = null;
      created.right.remove();
      created.wrong.remove();
    };
  }, []);

  const play = useCallback(
    (effect: SoundEffect) => {
      const player = players.current?.[effect];
      if (!enabled || !player) return;
      try {
        // Rewind first so a rapid second answer restarts the sting cleanly.
        void player.seekTo(0);
        player.play();
      } catch {
        // A failed sting must never interrupt the round.
      }
    },
    [enabled],
  );

  const value = useMemo<SoundContextValue>(() => {
    const setEnabled = (next: boolean) => {
      setEnabledState(next);
      void soundStore.write(next);
    };
    return {
      enabled,
      setEnabled,
      toggle: () => setEnabled(!enabled),
      play,
    };
  }, [enabled, play]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  return useContext(SoundContext);
}
