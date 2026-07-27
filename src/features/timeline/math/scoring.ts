import type { Question, RoundResult, Score } from '@/domain';

/**
 * Points as a function of absolute year error. Values between breakpoints are
 * linearly interpolated; anything at or beyond 100 years scores 0.
 */
const BREAKPOINTS: ReadonlyArray<readonly [errorYears: number, points: number]> = [
  [0, 1000],
  [1, 950],
  [2, 900],
  [5, 800],
  [10, 650],
  [20, 450],
  [50, 150],
  [100, 0],
];

export function scoreForError(errorYears: number): number {
  const error = Math.abs(errorYears);
  const last = BREAKPOINTS[BREAKPOINTS.length - 1]!;
  if (error >= last[0]) return last[1];

  for (let i = 1; i < BREAKPOINTS.length; i += 1) {
    const [hiError, hiPoints] = BREAKPOINTS[i]!;
    if (error <= hiError) {
      const [loError, loPoints] = BREAKPOINTS[i - 1]!;
      const t = (error - loError) / (hiError - loError);
      return Math.round(loPoints + t * (hiPoints - loPoints));
    }
  }
  return 0;
}

export interface ScoreModifiers {
  /** Combo multiplier (>=1). Inert this slice; real in slice 5. */
  comboMultiplier?: number;
  /** Flat streak bonus added after multiplying. Inert this slice. */
  streakBonus?: number;
}

export function buildScore(base: number, modifiers: ScoreModifiers = {}): Score {
  const comboMultiplier = modifiers.comboMultiplier ?? 1;
  const streakBonus = modifiers.streakBonus ?? 0;
  const total = Math.round(base * comboMultiplier + streakBonus);
  return { base, comboMultiplier, streakBonus, total };
}

/**
 * Turn a raw (possibly fractional) placement into a scored round result. The
 * guess is rounded to a whole year, since players reason in whole years.
 */
export function evaluateGuess(
  question: Question,
  rawGuessYear: number,
  modifiers: ScoreModifiers = {},
): RoundResult {
  const guessYear = Math.round(rawGuessYear);
  const errorYears = Math.abs(guessYear - question.year);
  const base = scoreForError(errorYears);
  return {
    question,
    guessYear,
    errorYears,
    score: buildScore(base, modifiers),
    isPerfect: errorYears === 0,
  };
}
