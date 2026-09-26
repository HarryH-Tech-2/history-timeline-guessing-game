import { useEffect, useRef } from 'react';

import { isFirebaseConfigured } from '@/config/env';
import { levelForXp } from '@/domain';
import { useProgression } from '@/features/progression';
import { useAuth } from '@/services/firebase/auth';

import { weekKey } from '@/utils/date';

import { resolveDisplayName } from './playerName';
import { publishEntry } from './service';
import { qualifiesForLeaderboard } from './types';

/**
 * Publishes the player's XP to the leaderboard whenever it (or their name)
 * changes, once the anonymous sign-in has a uid. Mounted once near the app
 * root so a score is banked to the board no matter which mode earned it. A
 * transparent no-op offline or in unconfigured builds.
 *
 * The published name is the player's chosen name or their generated handle —
 * never the Google/email name on the account.
 */
export function useLeaderboardSync(): void {
  const { uid, isSignedIn } = useAuth();
  const { state, isLoading } = useProgression();
  const lastPublished = useRef<string | null>(null);

  const displayName = resolveDisplayName(state.displayName, uid);

  useEffect(() => {
    if (!isFirebaseConfigured || !isSignedIn || uid === null || isLoading) return;
    // Nobody appears on the board until they have earned a little XP.
    if (!qualifiesForLeaderboard(state.xp)) return;
    // This week's XP only counts while the banked week is the current one.
    const week = weekKey();
    const weekXp = state.weekly.key === week ? state.weekly.xp : 0;
    const daily = state.lastDaily;
    const key = `${uid}:${state.xp}:${displayName}:${week}:${weekXp}:${daily?.date}:${daily?.score}`;
    if (key === lastPublished.current) return;
    lastPublished.current = key;
    void publishEntry(uid, {
      displayName,
      xp: state.xp,
      level: levelForXp(state.xp),
      updatedAt: Date.now(),
      weekKey: week,
      weekXp,
      // Firestore rejects `undefined`, so the Daily fields only appear once one exists.
      ...(daily ? { dailyDate: daily.date, dailyScore: daily.score } : {}),
    });
  }, [uid, isSignedIn, isLoading, state.xp, state.weekly, state.lastDaily, displayName]);
}
