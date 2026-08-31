import type { RoundResult } from '@/domain';

import { costLife } from '../survival/survivalRules';

/** Endless runs on its own lives (like Survival), just more forgiving. */
export const ENDLESS_LIVES = 5;

/** Lives left after the rounds played so far (never below 0). */
export function endlessLivesRemaining(results: readonly RoundResult[]): number {
  const lost = results.reduce((n, r) => n + (costLife(r) ? 1 : 0), 0);
  return Math.max(0, ENDLESS_LIVES - lost);
}

export function isOutOfEndlessLives(results: readonly RoundResult[]): boolean {
  return endlessLivesRemaining(results) <= 0;
}
