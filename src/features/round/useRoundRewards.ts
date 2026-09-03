import { useEffect, useRef, useState } from 'react';

import { costsHeart } from '@/domain';
import { usePremium } from '@/features/premium';
import { achievementById, useProgression } from '@/features/progression';
import { requestReviewAfterStrongRun } from '@/features/review';
import { streakLength } from '@/features/timeline/math';

import type { GameSession } from './useGameSession';

export interface RoundRewardsOptions {
  /**
   * Whether loose guesses in this session cost hearts. Survival opts out: it
   * has its own lives and would otherwise punish a miss twice.
   */
  usesHearts?: boolean;
}

export interface RoundReward {
  xp: number;
  coins: number;
}

export interface RoundRewards {
  /** Reward banked for the round currently revealed, or null before the first. */
  reward: RoundReward | null;
  /** Titles of achievements unlocked so far this session, for a subtle callout. */
  unlockedTitles: readonly string[];
  /** True when the revealed round just added its artefact to the museum. */
  acquired: boolean;
}

/**
 * Bridges a play session to the progression economy: every time a new round is
 * revealed it banks that round's XP and coins (scaled by any combo already in
 * the session's scores), and on finish it records the completed game. Awarding
 * is idempotent per round via a high-water-mark ref, so re-renders don't
 * double-credit. With no ProgressionProvider mounted this degrades to a no-op.
 */
export function useRoundRewards(
  session: GameSession,
  { usesHearts = true }: RoundRewardsOptions = {},
): RoundRewards {
  const { awardRound, completeGame, loseHeart } = useProgression();
  const { isPremium } = usePremium();
  const awardedCount = useRef(0);
  const finished = useRef(false);
  const [reward, setReward] = useState<RoundReward | null>(null);
  const [unlocked, setUnlocked] = useState<readonly string[]>([]);
  const [acquired, setAcquired] = useState(false);

  const addUnlocked = (ids: readonly string[]) => {
    setUnlocked((prev) => {
      const seen = new Set(prev);
      const added = ids.filter((id) => !seen.has(id));
      return added.length > 0 ? [...prev, ...added] : prev;
    });
  };

  useEffect(() => {
    if (session.results.length <= awardedCount.current) return;
    const latest = session.results[session.results.length - 1]!;
    const streak = streakLength(session.results);
    const outcome = awardRound(latest, streak);
    awardedCount.current = session.results.length;
    setReward(outcome.reward);
    setAcquired(outcome.acquired);
    addUnlocked(outcome.unlocked);
    // A loose guess costs a heart — unless this mode has its own lives or the
    // player holds Premium (unlimited hearts).
    if (usesHearts && !isPremium && costsHeart(latest)) loseHeart();
  }, [session.results, awardRound, loseHeart, usesHearts, isPremium]);

  useEffect(() => {
    if (session.status !== 'finished' || finished.current) return;
    finished.current = true;
    addUnlocked(completeGame());
    // A strong finish (over 75% of the maximum score) in any mode is the
    // moment to ask for a Play review — once per install.
    void requestReviewAfterStrongRun(session.results);
  }, [session.status, session.results, completeGame]);

  const unlockedTitles = unlocked
    .map((id) => achievementById(id)?.title)
    .filter((t): t is string => t !== undefined);

  return { reward, unlockedTitles, acquired };
}
