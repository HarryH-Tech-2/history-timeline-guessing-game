import type { RoundResult } from '@/domain';

export const STARTING_LIVES = 3;

/** A round this far (or further) from the true year costs a life. */
export const LIFE_ERROR_THRESHOLD = 20;

/** Whether a single round cost the player a life. */
export function costLife(result: RoundResult): boolean {
  return result.errorYears > LIFE_ERROR_THRESHOLD;
}

/** Lives left after the rounds played so far (never below 0). */
export function livesRemaining(results: readonly RoundResult[]): number {
  const lost = results.reduce((n, r) => n + (costLife(r) ? 1 : 0), 0);
  return Math.max(0, STARTING_LIVES - lost);
}

export function isOutOfLives(results: readonly RoundResult[]): boolean {
  return livesRemaining(results) <= 0;
}
