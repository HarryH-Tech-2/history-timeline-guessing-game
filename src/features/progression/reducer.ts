import { rewardForRound, type ProgressionState, type RoundResult } from '@/domain';

import { newlyEarnedAchievements } from './achievements';

export interface RoundOutcome {
  state: ProgressionState;
  reward: { xp: number; coins: number };
  /** Achievements crossed for the first time by this round. */
  unlocked: readonly string[];
}

/** Fold any freshly-earned achievements into the state's `unlocked` list. */
function withUnlocks(state: ProgressionState): { state: ProgressionState; unlocked: readonly string[] } {
  const unlocked = newlyEarnedAchievements(state);
  if (unlocked.length === 0) return { state, unlocked };
  return { state: { ...state, unlocked: [...state.unlocked, ...unlocked] }, unlocked };
}

/**
 * Apply one answered round: bank its XP/coins, bump lifetime counters, record
 * the best combo reached, and unlock anything newly earned. `streak` is the
 * combo length *including* this round, tracked by the session.
 */
export function applyRound(
  state: ProgressionState,
  result: RoundResult,
  streak: number,
): RoundOutcome {
  const reward = rewardForRound(result);
  const credited: ProgressionState = {
    ...state,
    xp: state.xp + reward.xp,
    coins: state.coins + reward.coins,
    stats: {
      ...state.stats,
      rounds: state.stats.rounds + 1,
      perfectRounds: state.stats.perfectRounds + (result.isPerfect ? 1 : 0),
      bestStreak: Math.max(state.stats.bestStreak, streak),
    },
  };
  const { state: next, unlocked } = withUnlocks(credited);
  return { state: next, reward, unlocked };
}

/** Mark a finished game, unlocking any play-count achievements. */
export function applyGameComplete(state: ProgressionState): {
  state: ProgressionState;
  unlocked: readonly string[];
} {
  return withUnlocks({
    ...state,
    stats: { ...state.stats, gamesPlayed: state.stats.gamesPlayed + 1 },
  });
}

/** Try to spend coins. Returns the unchanged state and `ok: false` if too poor. */
export function spendCoins(
  state: ProgressionState,
  amount: number,
): { state: ProgressionState; ok: boolean } {
  if (amount <= 0 || state.coins < amount) return { state, ok: false };
  return { state: { ...state, coins: state.coins - amount }, ok: true };
}
