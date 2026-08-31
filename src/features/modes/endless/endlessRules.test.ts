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
  it('starts with five lives', () => {
    expect(ENDLESS_LIVES).toBe(5);
    expect(endlessLivesRemaining([])).toBe(5);
  });

  it('close guesses cost nothing; loose guesses cost a life each', () => {
    expect(endlessLivesRemaining([resultWithError(20), resultWithError(0)])).toBe(5);
    expect(endlessLivesRemaining([resultWithError(21), resultWithError(300)])).toBe(3);
  });

  it('ends the run after five loose guesses, never going below zero', () => {
    const loose = Array.from({ length: 7 }, () => resultWithError(999));
    expect(isOutOfEndlessLives(loose.slice(0, 4))).toBe(false);
    expect(isOutOfEndlessLives(loose.slice(0, 5))).toBe(true);
    expect(endlessLivesRemaining(loose)).toBe(0);
  });
});
