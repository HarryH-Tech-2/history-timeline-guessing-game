import { MAX_YEAR, MIN_YEAR, PRESENT_YEAR } from './constants';

/**
 * Linear timeline mapping.
 *
 * Maps a year to a normalized axis coordinate in [0, 1] where 0 = {@link MIN_YEAR}
 * (ancient) and 1 = {@link PRESENT_YEAR} (now). Every year occupies the same slice
 * of the axis, so centuries are spread out evenly across the whole range rather
 * than bunched toward one end. Pinch-zoom multiplies this baseline; the century
 * quick-jump bar re-frames to any part of history.
 *
 *   warp(year)  = (year - MIN_YEAR) / SPAN
 *   unwarp(c)   = MIN_YEAR + c * SPAN
 */
const SPAN = PRESENT_YEAR - MIN_YEAR;

export function warp(year: number): number {
  'worklet';
  return (year - MIN_YEAR) / SPAN;
}

export function unwarp(coord: number): number {
  'worklet';
  return MIN_YEAR + coord * SPAN;
}

/** Constrain a year to the representable timeline range. */
export function clampYear(year: number): number {
  'worklet';
  if (year > MAX_YEAR) return MAX_YEAR;
  if (year < MIN_YEAR) return MIN_YEAR;
  return year;
}
