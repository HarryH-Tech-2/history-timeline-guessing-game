import { useEffect, useRef, useState } from 'react';

import { costsHeart, heartsAtStake } from '@/domain';
import { usePremium } from '@/features/premium';
import { achievementById, useProgression } from '@/features/progression';
import { requestReviewAfterRun } from '@/features/review';
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
  const { state, awardRound, completeGame, loseHeart } = useProgression();
  const { isPremium } = usePremium();
  const awardedCount = useRef(0);
  const finished = useRef(false);
  const [reward, setReward] = useState<RoundReward | null>(null);
  const [unlocked, setUnlocked] = useState<readonly string[]>([]);
  // Mirror of `unlocked` for the finish effect, which must not re-run on
  // every unlock just to read the latest list.
  const unlockedRef = useRef<readonly string[]>([]);
  const [acquired, setAcquired] = useState(false);

  const addUnlocked = (ids: readonly string[]) => {
    // Dedupe against the ref, not a setState updater: the finish effect reads
    // the ref in the same effects pass, before React would run an updater.
    const seen = new Set(unlockedRef.current);
    const added = ids.filter((id) => !seen.has(id));
    if (added.length === 0) return;
    unlockedRef.current = [...unlockedRef.current, ...added];
    setUnlocked(unlockedRef.current);
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
    // A loose guess costs a heart — unless this mode has its own lives, the
    // player holds Premium (unlimited hearts), or they are still in the free
    // games every new player gets before hearts are at stake.
    if (usesHearts && !isPremium && heartsAtStake(state.stats) && costsHeart(latest)) {
      loseHeart();
    }
  }, [session.results, awardRound, loseHeart, usesHearts, isPremium, state.stats]);

  useEffect(() => {
    if (session.status !== 'finished' || finished.current) return;
    finished.current = true;
    const onFinish = completeGame();
    addUnlocked(onFinish);
    // A rewarding finish — a strong score or a real achievement — in any mode
    // is the moment to ask for a Play review, once per install.
    void requestReviewAfterRun(session.results, [...unlockedRef.current, ...onFinish]);
  }, [session.status, session.results, completeGame]);

  const unlockedTitles = unlocked
    .map((id) => achievementById(id)?.title)
    .filter((t): t is string => t !== undefined);

  return { reward, unlockedTitles, acquired };
}
