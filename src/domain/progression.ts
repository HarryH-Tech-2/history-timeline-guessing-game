import { z } from 'zod';

import { HeartsStateSchema, INITIAL_HEARTS } from './hearts';
import type { RoundResult } from './round';
import { INITIAL_STREAK, StreakStateSchema } from './streak';

/**
 * XP economy and level curve. Everything here is pure so it can be unit tested
 * and reused by the provider, the UI, and (later) any cloud sync without
 * pulling in React or storage.
 */

/** XP that separates level 1 from level 2. Higher levels cost proportionally more. */
export const BASE_XP_PER_LEVEL = 500;

/**
 * Cumulative XP required to *be at* a given (1-based) level. Level 1 is 0.
 * The gap between consecutive levels grows linearly, so total XP is triangular:
 * reaching level n costs BASE * (n-1) * n / 2.
 */
export function xpToReachLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return (BASE_XP_PER_LEVEL * (l - 1) * l) / 2;
}

/** The level a player with this much lifetime XP has earned. */
export function levelForXp(xp: number): number {
  const safe = Math.max(0, xp);
  let level = 1;
  while (xpToReachLevel(level + 1) <= safe) level += 1;
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP earned since the current level began. */
  xpIntoLevel: number;
  /** XP span of the current level (into + remaining). */
  xpForNextLevel: number;
  /** Progress through the current level, 0–1. */
  fraction: number;
}

export function levelProgress(xp: number): LevelProgress {
  const safe = Math.max(0, xp);
  const level = levelForXp(safe);
  const floor = xpToReachLevel(level);
  const ceil = xpToReachLevel(level + 1);
  const span = ceil - floor;
  const into = safe - floor;
  return {
    level,
    xpIntoLevel: into,
    xpForNextLevel: span,
    fraction: span === 0 ? 0 : into / span,
  };
}

/** Flat XP kicker for a bullseye, on top of the score-derived base. */
export const PERFECT_XP_BONUS = 50;

/** XP awarded for a single answered round: a tenth of the score, plus a perfect bonus. */
export function xpForRound(result: RoundResult): number {
  const base = Math.round(result.score.total / 10);
  return base + (result.isPerfect ? PERFECT_XP_BONUS : 0);
}

/**
 * Coins are tiered by accuracy — only sharp guesses pay, and modestly: a
 * bullseye is worth 5, within a year 3, within five 1. Coins are the currency
 * for hints (10), heart refills (100) and streak freezes (150), so they are
 * meant to feel scarce.
 */
const COIN_TIERS: ReadonlyArray<readonly [maxErrorYears: number, coins: number]> = [
  [0, 5],
  [1, 3],
  [5, 1],
];

export function coinsForRound(result: RoundResult): number {
  for (const [maxError, coins] of COIN_TIERS) {
    if (result.errorYears <= maxError) return coins;
  }
  return 0;
}

export interface RoundReward {
  xp: number;
  coins: number;
}

export function rewardForRound(result: RoundResult): RoundReward {
  return { xp: xpForRound(result), coins: coinsForRound(result) };
}

/** Lifetime counters used for achievements and the profile header.
 * Later additions carry `.default()` so profiles saved by older builds still
 * parse instead of being reset by the store's schema fallback. */
export const ProgressionStatsSchema = z.object({
  rounds: z.number().nonnegative(),
  perfectRounds: z.number().nonnegative(),
  gamesPlayed: z.number().nonnegative(),
  bestStreak: z.number().nonnegative(),
  /** Longest Daily streak ever held (the live one is in `streak`). */
  bestDailyStreak: z.number().nonnegative().default(0),
});
export type ProgressionStats = z.infer<typeof ProgressionStatsSchema>;

/** The whole of a player's persisted progression. Level is derived from `xp`. */
export const ProgressionStateSchema = z.object({
  xp: z.number().nonnegative(),
  coins: z.number().nonnegative(),
  unlocked: z.array(z.string()),
  stats: ProgressionStatsSchema,
  /** Daily streak; defaulted so pre-streak profiles migrate in place. */
  streak: StreakStateSchema.default(INITIAL_STREAK),
  /**
   * Museum collection: question id → best error-years among the guesses that
   * acquired it. An entry's existence IS the acquisition (see domain/collection).
   */
  collection: z.record(z.string(), z.number().nonnegative()).default({}),
  /** Play-energy meter; defaulted so older profiles start full. */
  hearts: HeartsStateSchema.default(INITIAL_HEARTS),
});
export type ProgressionState = z.infer<typeof ProgressionStateSchema>;

export const INITIAL_PROGRESSION: ProgressionState = {
  xp: 0,
  coins: 0,
  unlocked: [],
  stats: { rounds: 0, perfectRounds: 0, gamesPlayed: 0, bestStreak: 0, bestDailyStreak: 0 },
  streak: INITIAL_STREAK,
  collection: {},
  hearts: INITIAL_HEARTS,
};
