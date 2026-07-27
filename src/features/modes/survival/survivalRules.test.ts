import type { Question, RoundResult } from '@/domain';

import { costLife, isOutOfLives, livesRemaining } from './survivalRules';

const question = { id: 'q', year: 1500 } as Question;

function round(errorYears: number): RoundResult {
  return {
    question,
    guessYear: question.year + errorYears,
    errorYears,
    score: { base: 0, comboMultiplier: 1, streakBonus: 0, total: 0 },
    isPerfect: errorYears === 0,
  };
}

describe('survival rules', () => {
  it('only charges a life beyond the threshold', () => {
    expect(costLife(round(20))).toBe(false);
    expect(costLife(round(21))).toBe(true);
    expect(costLife(round(0))).toBe(false);
  });

  it('starts with three lives and never drops below zero', () => {
    expect(livesRemaining([])).toBe(3);
    expect(livesRemaining([round(100), round(100)])).toBe(1);
    expect(livesRemaining([round(100), round(100), round(100), round(100)])).toBe(0);
  });

  it('ignores accurate rounds', () => {
    expect(livesRemaining([round(1), round(5), round(10)])).toBe(3);
  });

  it('ends the run at zero lives', () => {
    expect(isOutOfLives([round(100), round(100)])).toBe(false);
    expect(isOutOfLives([round(100), round(100), round(100)])).toBe(true);
  });
});
