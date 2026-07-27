import { MAX_YEAR, MIN_YEAR, PRESENT_YEAR } from './constants';

/**
 * Logarithmic timeline warp.
 *
 * Maps a year to a normalized axis coordinate in [0, 1] where 0 = {@link MIN_YEAR}
 * (ancient) and 1 = {@link PRESENT_YEAR} (now). The mapping is logarithmic in
 * *distance from the present*, so recent years occupy proportionally more of the
 * axis than ancient ones — the "epic scale, precise present" feel. Pinch-zoom
 * later multiplies this baseline; it does not replace it.
 *
 *   d          = PRESENT_YEAR - year          (0 now, larger in the past)
 *   warp(year) = 1 - log1p(d) / log1p(dMax)
 *
 * `unwarp` is the exact analytical inverse via `expm1`.
 */
const D_MAX = PRESENT_YEAR - MIN_YEAR;
const LOG_D_MAX = Math.log1p(D_MAX);

export function warp(year: number): number {
  'worklet';
  const d = PRESENT_YEAR - year;
  return 1 - Math.log1p(d) / LOG_D_MAX;
}

export function unwarp(coord: number): number {
  'worklet';
  const d = Math.expm1((1 - coord) * LOG_D_MAX);
  return PRESENT_YEAR - d;
}

/** Constrain a year to the representable timeline range. */
export function clampYear(year: number): number {
  'worklet';
  if (year > MAX_YEAR) return MAX_YEAR;
  if (year < MIN_YEAR) return MIN_YEAR;
  return year;
}
