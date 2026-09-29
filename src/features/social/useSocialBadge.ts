import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/services/firebase/auth';

import * as api from './api';
import type { SocialState } from './types';

/** How many of the player's challenges have more entries than they last saw. */
export function unseenCount(state: SocialState, counts: Record<string, number>): number {
  return state.challengeCodes.filter((code) => (counts[code] ?? 0) > (state.seen[code] ?? 0)).length;
}

const CHECK_EVERY_MS = 60_000;
/** Only the newest challenges are checked, to bound the reads per check. */
const RECENT = 20;

/** True when a challenge has results the player hasn't opened. Checked on foreground, at most once a minute. */
export function useSocialBadge(): boolean {
  const { uid } = useAuth();
  // Keyed by uid so a signed-out or switched account never inherits the dot.
  const [badge, setBadge] = useState<{ uid: string; on: boolean } | null>(null);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    let last = 0;
    const check = async () => {
      const now = Date.now();
      if (last !== 0 && now - last < CHECK_EVERY_MS) return;
      last = now;
      try {
        const state = await api.fetchSocialState(uid);
        const recent = state.challengeCodes.slice(-RECENT);
        const counts = Object.fromEntries(
          await Promise.all(recent.map(async (c) => [c, (await api.fetchEntries(c)).length] as const)),
        );
        if (live) setBadge({ uid, on: unseenCount({ ...state, challengeCodes: recent }, counts) > 0 });
      } catch {
        // Offline or unreadable: keep the last value, never surface an error.
      }
    };
    void check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void check();
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, [uid]);

  return !!uid && badge?.uid === uid && badge.on;
}
