/**
 * Copy of the app's `scoreForError` (src/features/timeline/math/scoring.ts).
 * The app's Jest suite pins both to the same table (Task 2), so they can't drift.
 */
const BREAKPOINTS: readonly (readonly [number, number])[] = [
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

/** Per-round scores and total for guesses against the true years, in order. */
export function scoreEntry(
  years: readonly number[],
  guesses: readonly number[],
): { roundScores: number[]; total: number } {
  const roundScores = years.map((year, i) => scoreForError((guesses[i] ?? 0) - year));
  return { roundScores, total: roundScores.reduce((a, b) => a + b, 0) };
}
