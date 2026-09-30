import { useEffect, useRef } from 'react';

import { isFirebaseConfigured } from '@/config/env';
import { levelForXp } from '@/domain';
import { usePremium } from '@/features/premium/PremiumProvider';
import { useProgression } from '@/features/progression';
import { resolveAvatar } from '@/features/progression/avatars';
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
/**
 * Every answered question changes XP, and a quick player answers several a
 * minute. The first change publishes at once (so a new name or a first score
 * shows up immediately); further changes within this window collapse into one
 * trailing write, sparing the JS thread a Firestore round-trip per guess.
 */
export const PUBLISH_DEBOUNCE_MS = 2500;

export function useLeaderboardSync(): void {
  const { uid, isSignedIn } = useAuth();
  const { state, isLoading } = useProgression();
  const lastPublished = useRef<string | null>(null);
  const lastPublishedAt = useRef(0);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; run: () => void } | null>(null);

  const { isPremium } = usePremium();
  const displayName = resolveDisplayName(state.displayName, uid);
  // What the profile shows: a lapsed Premium avatar publishes as the owl.
  const avatar = resolveAvatar(state.avatar, isPremium).id;

  // Flush a held write if the hook unmounts (sign-out, app root re-mount).
  useEffect(
    () => () => {
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current.run();
        pending.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!isFirebaseConfigured || !isSignedIn || uid === null || isLoading) return;
    // Nobody appears on the board until they have earned a little XP.
    if (!qualifiesForLeaderboard(state.xp)) return;
    // This week's XP only counts while the banked week is the current one.
    const week = weekKey();
    const weekXp = state.weekly.key === week ? state.weekly.xp : 0;
    const daily = state.lastDaily;
    const key = `${uid}:${state.xp}:${displayName}:${avatar}:${week}:${weekXp}:${daily?.date}:${daily?.score}`;
    if (key === lastPublished.current) return;
    lastPublished.current = key;

    const run = () => {
      lastPublishedAt.current = Date.now();
      void publishEntry(uid, {
        displayName,
        xp: state.xp,
        level: levelForXp(state.xp),
        updatedAt: Date.now(),
        weekKey: week,
        weekXp,
        avatar,
        // Firestore rejects `undefined`, so the Daily fields only appear once one exists.
        ...(daily ? { dailyDate: daily.date, dailyScore: daily.score } : {}),
      });
    };

    if (pending.current) clearTimeout(pending.current.timer);
    const sinceLast = Date.now() - lastPublishedAt.current;
    if (sinceLast >= PUBLISH_DEBOUNCE_MS) {
      pending.current = null;
      run();
      return;
    }
    const timer = setTimeout(() => {
      pending.current = null;
      run();
    }, PUBLISH_DEBOUNCE_MS - sinceLast);
    pending.current = { timer, run };
  }, [uid, isSignedIn, isLoading, state.xp, state.weekly, state.lastDaily, displayName, avatar]);
}
