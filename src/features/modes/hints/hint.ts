/** Coins a single century hint costs. */
export const HINT_COST = 10;

/**
 * Coarsens a year to its 100-year band for a hint, e.g. 1969 → "the 1900s",
 * 2001 → "the 2000s", -450 → "the 500s BCE". Deliberately coarse: it narrows
 * the search without giving the answer away.
 */
export function centuryHint(year: number): string {
  const band = Math.floor(year / 100) * 100;
  if (band < 0) return `the ${Math.abs(band)}s BCE`;
  return `the ${band}s`;
}
