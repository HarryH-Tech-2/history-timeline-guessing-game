import type { RoundResult } from '@/domain';

import { ENDLESS_LIVES, endlessLivesRemaining, isOutOfEndlessLives } from './endlessRules';

function resultWithError(errorYears: number): RoundResult {
  return {
    question: { id: 'q' } as RoundResult['question'],
    guessYear: 0,
    errorYears,
    score: { base: 0, comboMultiplier: 1, streakBonus: 0, total: 0 },
    isPerfect: errorYears === 0,
  };
}

describe('endless lives', () => {
  it('starts with ten lives', () => {
    expect(ENDLESS_LIVES).toBe(10);
    expect(endlessLivesRemaining([])).toBe(10);
  });

  it('close guesses cost nothing; loose guesses cost a life each', () => {
    expect(endlessLivesRemaining([resultWithError(20), resultWithError(0)])).toBe(10);
    expect(endlessLivesRemaining([resultWithError(21), resultWithError(300)])).toBe(8);
  });

  it('ends the run after ten loose guesses, never going below zero', () => {
    const loose = Array.from({ length: 12 }, () => resultWithError(999));
    expect(isOutOfEndlessLives(loose.slice(0, 9))).toBe(false);
    expect(isOutOfEndlessLives(loose.slice(0, 10))).toBe(true);
    expect(endlessLivesRemaining(loose)).toBe(0);
  });
});
