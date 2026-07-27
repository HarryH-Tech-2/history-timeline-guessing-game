import { QuestionSchema, type Question } from '@/domain';

import type { RoundResult } from '@/domain';

import {
  buildScore,
  COMBO_MAX_STACKS,
  COMBO_STEP,
  comboModifiers,
  evaluateGuess,
  scoreForError,
  streakLength,
} from './scoring';

const question: Question = QuestionSchema.parse({
  id: 'q1',
  categoryId: 'events',
  title: 'Moon Landing',
  subtitle: 'Apollo 11',
  year: 1969,
  difficulty: 'easy',
  country: 'United States',
  region: 'Sea of Tranquility',
  latitude: 0.67,
  longitude: 23.47,
  shortDescription: 'First humans on the Moon.',
  longDescription: 'Apollo 11 landed the first humans on the Moon.',
  tags: ['space'],
  verified: true,
  featured: true,
});

describe('scoreForError', () => {
  it.each([
    [0, 1000],
    [1, 950],
    [2, 900],
    [5, 800],
    [10, 650],
    [20, 450],
    [50, 150],
    [100, 0],
    [250, 0],
  ])('scores %i years off as %i points', (error, expected) => {
    expect(scoreForError(error)).toBe(expected);
  });

  it('interpolates linearly between breakpoints', () => {
    // Halfway between 1yr (950) and 2yr (900) -> 925.
    expect(scoreForError(1.5)).toBe(925);
    // Halfway between 10yr (650) and 20yr (450) -> 550.
    expect(scoreForError(15)).toBe(550);
  });

  it('never returns a negative score', () => {
    expect(scoreForError(1000)).toBe(0);
  });
});

describe('buildScore', () => {
  it('is inert when combo/streak are at defaults', () => {
    const score = buildScore(800);
    expect(score).toEqual({
      base: 800,
      comboMultiplier: 1,
      streakBonus: 0,
      total: 800,
    });
  });

  it('applies multiplier then adds streak bonus', () => {
    const score = buildScore(800, { comboMultiplier: 1.5, streakBonus: 50 });
    expect(score.total).toBe(1250);
  });
});

function res(errorYears: number): RoundResult {
  return { errorYears } as RoundResult;
}

describe('combo', () => {
  it('counts the trailing run of good guesses', () => {
    expect(streakLength([])).toBe(0);
    expect(streakLength([res(5), res(10), res(20)])).toBe(3);
    // A miss (>20yr) breaks the run; only rounds after it count.
    expect(streakLength([res(5), res(80), res(10), res(15)])).toBe(2);
  });

  it('grows the multiplier with the streak and caps it', () => {
    expect(comboModifiers([])).toEqual({ comboMultiplier: 1 });
    expect(comboModifiers([res(5), res(5)])).toEqual({ comboMultiplier: 1 + 2 * COMBO_STEP });
    const long = Array.from({ length: COMBO_MAX_STACKS + 3 }, () => res(1));
    expect(comboModifiers(long)).toEqual({
      comboMultiplier: 1 + COMBO_MAX_STACKS * COMBO_STEP,
    });
  });
});

describe('evaluateGuess', () => {
  it('awards a perfect score for the exact year', () => {
    const result = evaluateGuess(question, 1969);
    expect(result.errorYears).toBe(0);
    expect(result.isPerfect).toBe(true);
    expect(result.score.total).toBe(1000);
  });

  it('rounds a fractional guess to the nearest year', () => {
    const result = evaluateGuess(question, 1969.4);
    expect(result.guessYear).toBe(1969);
    expect(result.isPerfect).toBe(true);
  });

  it('reports error distance and drops perfection when off', () => {
    const result = evaluateGuess(question, 1974);
    expect(result.errorYears).toBe(5);
    expect(result.isPerfect).toBe(false);
    expect(result.score.total).toBe(800);
  });
});
