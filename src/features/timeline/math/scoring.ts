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
  /** Combo multiplier (>=1) applied to the base score. */
  comboMultiplier?: number;
  /** Flat streak bonus added after multiplying. */
  streakBonus?: number;
}

/** A guess this close (in years) or better keeps a combo alive. */
export const COMBO_THRESHOLD_YEARS = 20;
/** Each stacked combo adds this much to the multiplier. */
export const COMBO_STEP = 0.1;
/** Combos stop stacking past this many rounds (caps the multiplier). */
export const COMBO_MAX_STACKS = 5;

/** Length of the trailing run of "good" guesses (error within the threshold). */
export function streakLength(results: readonly RoundResult[]): number {
  let n = 0;
  for (let i = results.length - 1; i >= 0; i -= 1) {
    if (results[i]!.errorYears <= COMBO_THRESHOLD_YEARS) n += 1;
    else break;
  }
  return n;
}

/**
 * Score modifiers for the *next* guess, derived from the rounds already played.
 * A running streak inflates the multiplier up to a cap; a miss resets it.
 */
export function comboModifiers(results: readonly RoundResult[]): ScoreModifiers {
  const stacks = Math.min(streakLength(results), COMBO_MAX_STACKS);
  return { comboMultiplier: 1 + stacks * COMBO_STEP };
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
