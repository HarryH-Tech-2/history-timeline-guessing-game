import { useEffect, useRef } from 'react';

import { isFirebaseConfigured } from '@/config/env';
import { levelForXp } from '@/domain';
import { useProgression } from '@/features/progression';
import { useAuth } from '@/services/firebase/auth';

import { publishEntry } from './service';
import { handleForUid } from './types';

/**
 * Publishes the player's XP to the leaderboard whenever it changes (and once the
 * anonymous sign-in has a uid). Mounted once near the app root so a score is
 * banked to the board no matter which mode earned it. A transparent no-op
 * offline or in unconfigured builds.
 */
export function useLeaderboardSync(): void {
  const { uid, isSignedIn } = useAuth();
  const { state } = useProgression();
  const lastPublishedXp = useRef<number | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !isSignedIn || uid === null) return;
    if (state.xp === lastPublishedXp.current) return;
    lastPublishedXp.current = state.xp;
    void publishEntry(uid, {
      displayName: handleForUid(uid),
      xp: state.xp,
      level: levelForXp(state.xp),
      updatedAt: Date.now(),
    });
  }, [uid, isSignedIn, state.xp]);
}
