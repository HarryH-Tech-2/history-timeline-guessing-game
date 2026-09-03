import { useEffect, useRef } from 'react';

import { isFirebaseConfigured } from '@/config/env';
import { levelForXp } from '@/domain';
import { useProgression } from '@/features/progression';
import { useAuth } from '@/services/firebase/auth';

import { resolveDisplayName } from './playerName';
import { publishEntry } from './service';

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
    const key = `${uid}:${state.xp}:${displayName}`;
    if (key === lastPublished.current) return;
    lastPublished.current = key;
    void publishEntry(uid, {
      displayName,
      xp: state.xp,
      level: levelForXp(state.xp),
      updatedAt: Date.now(),
    });
  }, [uid, isSignedIn, isLoading, state.xp, displayName]);
}
