import { z } from 'zod';

/**
 * Daily-streak rules. Pure and date-string based (`YYYY-MM-DD` keys, matching
 * the Daily mode's own gating) so everything is unit-testable without clocks.
 */

export const StreakStateSchema = z.object({
  /** Consecutive Daily completions, counting the most recent one. */
  count: z.number().nonnegative(),
  /** Date key of the last completed Daily, or null before the first. */
  lastDate: z.string().nullable(),
  /** Streak freezes owned; one is consumed automatically per missed day. */
  freezes: z.number().nonnegative(),
});
export type StreakState = z.infer<typeof StreakStateSchema>;

export const INITIAL_STREAK: StreakState = { count: 0, lastDate: null, freezes: 0 };

/** Coins to buy one streak freeze. */
export const STREAK_FREEZE_COST = 150;

/** Most freezes a player can stockpile. */
export const MAX_STREAK_FREEZES = 2;

/**
 * XP multiplier tiers by live streak length: [minimum streak, multiplier],
 * checked longest-first. Below the first tier the multiplier is 1.
 */
const STREAK_TIERS: ReadonlyArray<readonly [minCount: number, multiplier: number]> = [
  [14, 1.5],
  [7, 1.25],
  [3, 1.1],
];

export function streakMultiplier(count: number): number {
  for (const [min, multiplier] of STREAK_TIERS) {
    if (count >= min) return multiplier;
  }
  return 1;
}

/** The date key of the calendar day before `key`. UTC arithmetic on the parsed
 * parts, so device timezones can't skip or double a day. */
export function previousDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() - 1);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The streak length that counts as "live" today: the recorded count if the
 * last Daily was today or yesterday (yesterday's streak is still extendable,
 * so its buff holds), otherwise 0 — a lapsed streak buffs nothing.
 */
export function activeStreakCount(streak: StreakState, todayKey: string): number {
  if (streak.lastDate === todayKey) return streak.count;
  if (streak.lastDate === previousDateKey(todayKey)) return streak.count;
  return 0;
}

export interface StreakTransition {
  streak: StreakState;
  /** True when this completion extended (or started) the streak. */
  extended: boolean;
  /** True when a freeze was consumed to bridge exactly one missed day. */
  usedFreeze: boolean;
}

/**
 * Fold a completed Daily into the streak. Idempotent for the same day. A
 * single missed day is bridged automatically by a freeze (if one is owned);
 * anything longer resets to a fresh 1-day streak.
 */
export function applyDailyCompletion(streak: StreakState, todayKey: string): StreakTransition {
  if (streak.lastDate === todayKey) {
    return { streak, extended: false, usedFreeze: false };
  }

  const yesterday = previousDateKey(todayKey);
  if (streak.lastDate === yesterday) {
    return {
      streak: { ...streak, count: streak.count + 1, lastDate: todayKey },
      extended: true,
      usedFreeze: false,
    };
  }

  const dayBefore = previousDateKey(yesterday);
  if (streak.lastDate === dayBefore && streak.freezes > 0) {
    return {
      streak: {
        count: streak.count + 1,
        lastDate: todayKey,
        freezes: streak.freezes - 1,
      },
      extended: true,
      usedFreeze: true,
    };
  }

  return {
    streak: { ...streak, count: 1, lastDate: todayKey },
    extended: true,
    usedFreeze: false,
  };
}
