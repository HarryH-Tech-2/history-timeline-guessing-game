import {
  activeStreakCount,
  applyDailyCompletion,
  isAcquiringGuess,
  MAX_STREAK_FREEZES,
  rewardForRound,
  STREAK_FREEZE_COST,
  streakMultiplier,
  type ProgressionState,
  type RoundResult,
} from '@/domain';

import { newlyEarnedAchievements } from './achievements';

export interface RoundOutcome {
  state: ProgressionState;
  reward: { xp: number; coins: number };
  /** Achievements crossed for the first time by this round. */
  unlocked: readonly string[];
  /** True when this round added the question's artefact to the museum. */
  acquired: boolean;
}

/** Fold any freshly-earned achievements into the state's `unlocked` list. */
function withUnlocks(state: ProgressionState): { state: ProgressionState; unlocked: readonly string[] } {
  const unlocked = newlyEarnedAchievements(state);
  if (unlocked.length === 0) return { state, unlocked };
  return { state: { ...state, unlocked: [...state.unlocked, ...unlocked] }, unlocked };
}

/**
 * Apply one answered round: bank its XP/coins (XP buffed by a live Daily
 * streak), bump lifetime counters, record the best combo reached, add the
 * artefact to the museum collection when the guess was close enough, and
 * unlock anything newly earned. `streak` is the combo length *including* this
 * round, tracked by the session; `todayKey` anchors the Daily-streak buff.
 */
export function applyRound(
  state: ProgressionState,
  result: RoundResult,
  streak: number,
  todayKey: string,
): RoundOutcome {
  const base = rewardForRound(result);
  const multiplier = streakMultiplier(activeStreakCount(state.streak, todayKey));
  const reward = { ...base, xp: Math.round(base.xp * multiplier) };

  const questionId = result.question.id;
  const acquiring = isAcquiringGuess(result.errorYears, result.question.difficulty);
  const previousBest = state.collection[questionId];
  const acquired = acquiring && previousBest === undefined;
  const collection =
    acquiring && (previousBest === undefined || result.errorYears < previousBest)
      ? { ...state.collection, [questionId]: result.errorYears }
      : state.collection;

  const credited: ProgressionState = {
    ...state,
    xp: state.xp + reward.xp,
    coins: state.coins + reward.coins,
    collection,
    stats: {
      ...state.stats,
      rounds: state.stats.rounds + 1,
      perfectRounds: state.stats.perfectRounds + (result.isPerfect ? 1 : 0),
      bestStreak: Math.max(state.stats.bestStreak, streak),
    },
  };
  const { state: next, unlocked } = withUnlocks(credited);
  return { state: next, reward, unlocked, acquired };
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

export interface DailyCompleteOutcome {
  state: ProgressionState;
  /** Streak length after this completion. */
  count: number;
  /** XP multiplier now in force. */
  multiplier: number;
  /** True when the completion extended (or started) the streak. */
  extended: boolean;
  unlocked: readonly string[];
}

/** Fold a finished Daily run into the streak. Idempotent per calendar day. */
export function applyDailyComplete(
  state: ProgressionState,
  todayKey: string,
): DailyCompleteOutcome {
  const { streak, extended } = applyDailyCompletion(state.streak, todayKey);
  const credited: ProgressionState = {
    ...state,
    streak,
    stats: {
      ...state.stats,
      bestDailyStreak: Math.max(state.stats.bestDailyStreak, streak.count),
    },
  };
  const { state: next, unlocked } = withUnlocks(credited);
  return {
    state: next,
    count: streak.count,
    multiplier: streakMultiplier(streak.count),
    extended,
    unlocked,
  };
}

/** Buy one streak freeze with coins; refuses when broke or already at the cap. */
export function buyStreakFreeze(state: ProgressionState): {
  state: ProgressionState;
  ok: boolean;
} {
  if (state.coins < STREAK_FREEZE_COST) return { state, ok: false };
  if (state.streak.freezes >= MAX_STREAK_FREEZES) return { state, ok: false };
  return {
    state: {
      ...state,
      coins: state.coins - STREAK_FREEZE_COST,
      streak: { ...state.streak, freezes: state.streak.freezes + 1 },
    },
    ok: true,
  };
}

/** Try to spend coins. Returns the unchanged state and `ok: false` if too poor. */
export function spendCoins(
  state: ProgressionState,
  amount: number,
): { state: ProgressionState; ok: boolean } {
  if (amount <= 0 || state.coins < amount) return { state, ok: false };
  return { state: { ...state, coins: state.coins - amount }, ok: true };
}
