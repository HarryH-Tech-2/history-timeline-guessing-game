import { z } from 'zod';

import type { RoundResult } from './round';

/**
 * Hearts: the play-energy meter. A loose guess costs a heart; hearts refill
 * slowly over time, instantly for coins, or not at all for Premium (unlimited).
 * Everything here is pure and time is passed in explicitly, so the maths is
 * unit-testable and the provider decides what "now" is.
 */

export const MAX_HEARTS = 5;

/** One heart regenerates every 30 minutes. */
export const HEART_REGEN_MS = 30 * 60 * 1000;

/** A guess further off than this (in years) costs a heart — the same bar as a
 * Survival life, so "a miss" means one thing everywhere. */
export const HEART_ERROR_THRESHOLD = 20;

/** Coins for an instant full refill. */
export const HEART_REFILL_COST = 100;

export const HeartsStateSchema = z.object({
  /** Hearts banked at `updatedAt`; regeneration since then is derived. */
  count: z.number().int().min(0).max(MAX_HEARTS),
  /** Epoch ms the regeneration clock was last anchored (0 = never). */
  updatedAt: z.number().nonnegative(),
});
export type HeartsState = z.infer<typeof HeartsStateSchema>;

export const INITIAL_HEARTS: HeartsState = { count: MAX_HEARTS, updatedAt: 0 };

/** Whether a single round costs a heart. */
export function costsHeart(result: RoundResult): boolean {
  return result.errorYears > HEART_ERROR_THRESHOLD;
}

/**
 * Fold elapsed regeneration into the state. Idempotent: settling twice at the
 * same instant yields the same result. The clock only advances by whole
 * hearts, so partial progress toward the next heart is never lost.
 */
export function settleHearts(hearts: HeartsState, now: number): HeartsState {
  if (hearts.count >= MAX_HEARTS) return { count: MAX_HEARTS, updatedAt: now };
  const elapsed = Math.max(0, now - hearts.updatedAt);
  const gained = Math.floor(elapsed / HEART_REGEN_MS);
  if (gained <= 0) return hearts;
  const count = Math.min(MAX_HEARTS, hearts.count + gained);
  return {
    count,
    updatedAt: count >= MAX_HEARTS ? now : hearts.updatedAt + gained * HEART_REGEN_MS,
  };
}

/** Hearts the player can spend right now. */
export function heartsAvailable(hearts: HeartsState, now: number): number {
  return settleHearts(hearts, now).count;
}

/** Spend one heart. Starting the regen clock the moment the meter drops below full. */
export function loseHeart(hearts: HeartsState, now: number): HeartsState {
  const settled = settleHearts(hearts, now);
  if (settled.count <= 0) return settled;
  return {
    count: settled.count - 1,
    updatedAt: settled.count >= MAX_HEARTS ? now : settled.updatedAt,
  };
}

export function refillHearts(now: number): HeartsState {
  return { count: MAX_HEARTS, updatedAt: now };
}

/** Milliseconds until the next heart regenerates; 0 when already full. */
export function msUntilNextHeart(hearts: HeartsState, now: number): number {
  const settled = settleHearts(hearts, now);
  if (settled.count >= MAX_HEARTS) return 0;
  return Math.max(0, settled.updatedAt + HEART_REGEN_MS - now);
}

/** "12m" / "1h 05m" style countdown for the hearts UI. */
export function formatHeartCountdown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes < 60) return `${Math.max(1, totalMinutes)}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${`${minutes}`.padStart(2, '0')}m`;
}
