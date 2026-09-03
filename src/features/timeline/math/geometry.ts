import { MAX_YEAR, MIN_YEAR } from './constants';
import { unwarp, warp } from './warp';

/**
 * Pixel width of the entire warped axis (coord 0..1) at scale = 1. The pinch
 * scale multiplies this. Derived from the year span so one year is always
 * ~1px at scale 1: the tick fade ramps (TimelineTick) and zoom thresholds are
 * calibrated in scale units under that assumption, so a fixed base would
 * silently detune them whenever MIN_YEAR changes.
 */
export const BASE_WIDTH = MAX_YEAR - MIN_YEAR;

/** Min/max pinch scale. Below MIN the whole of history is a smear; above MAX
 * single years are absurdly wide. */
export const MIN_SCALE = 0.04;
export const MAX_SCALE = 400;

export interface Transform {
  translateX: number;
  scale: number;
}

/** World-space x (px, at scale 1) for a given year. */
export function worldXForYear(year: number): number {
  return warp(year) * BASE_WIDTH;
}

/** Inverse of {@link worldXForYear}. */
export function yearForWorldX(worldX: number): number {
  return unwarp(worldX / BASE_WIDTH);
}

/** The year currently sitting under the screen's horizontal centre. */
export function yearAtScreenCentre(transform: Transform, screenWidth: number): number {
  const worldX = (screenWidth / 2 - transform.translateX) / transform.scale;
  return yearForWorldX(worldX);
}

/**
 * Build the transform that frames the year range [minYear, maxYear] to exactly
 * fill `screenWidth`, clamped to the allowed scale range.
 */
export function transformToFit(
  minYear: number,
  maxYear: number,
  screenWidth: number,
): Transform {
  const left = worldXForYear(minYear);
  const right = worldXForYear(maxYear);
  const rawScale = screenWidth / (right - left);
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));
  const translateX = -left * scale;
  return { translateX, scale };
}

/**
 * The framing a fresh question should start from, given the `current` view
 * the last reveal left behind: unchanged if it is at least as tight as the
 * default `spanYears` framing (the player's own zoom is respected), otherwise
 * a default-span window centred on `year` — the answer just revealed — kept
 * inside the timeline's range.
 *
 * Why: a big-miss reveal zooms out to fit guess and answer (thousands of
 * years on a phone), and the framing is deliberately carried into the next
 * question so era campaigns stay in their period. At that width the decade
 * dividers are unmounted and century labels faded, so every following
 * question looked stripped bare until the player pinched back in.
 */
export function transformToRefocus(
  year: number,
  spanYears: number,
  screenWidth: number,
  current: Transform,
): Transform {
  const fitScale = transformToFit(0, spanYears, screenWidth).scale;
  // Tolerance: the default framing itself lands a rounding error under this.
  if (current.scale >= fitScale * (1 - 1e-9)) return current;

  let minYear = year - spanYears / 2;
  let maxYear = year + spanYears / 2;
  if (minYear < MIN_YEAR) {
    maxYear += MIN_YEAR - minYear;
    minYear = MIN_YEAR;
  }
  if (maxYear > MAX_YEAR) {
    minYear -= maxYear - MAX_YEAR;
    maxYear = MAX_YEAR;
  }
  return transformToFit(Math.max(MIN_YEAR, minYear), maxYear, screenWidth);
}

/** Translate range that keeps the screen centre inside [MIN_YEAR, PRESENT_YEAR]. */
export function translateBounds(scale: number, screenWidth: number): [number, number] {
  'worklet';
  return [screenWidth / 2 - BASE_WIDTH * scale, screenWidth / 2];
}

/** Screen margin (px) a revealed marker keeps from the track's edges. */
export const REVEAL_MARGIN_PX = 48;

/**
 * The least disruptive transform that shows both `minYear` and `maxYear`
 * (guess and answer) on a reveal, starting from the player's `current` view:
 *
 * - both already on screen (inside the margin)  → unchanged, nothing moves;
 * - both fit at the current zoom                 → pan only, zoom untouched;
 * - too far apart for the current zoom           → zoom out just enough.
 *
 * Keeps the timeline where the player left it whenever possible, so the
 * reveal reads as "the answer appears" rather than "the timeline resets".
 */
export function transformToReveal(
  minYear: number,
  maxYear: number,
  screenWidth: number,
  current: Transform,
  marginPx = REVEAL_MARGIN_PX,
): Transform {
  const margin = Math.min(marginPx, screenWidth / 4);
  const { scale, translateX } = current;
  const lo = worldXForYear(Math.min(minYear, maxYear));
  const hi = worldXForYear(Math.max(minYear, maxYear));

  const left = lo * scale + translateX;
  const right = hi * scale + translateX;
  if (left >= margin && right <= screenWidth - margin) return current;

  const usable = screenWidth - 2 * margin;
  if ((hi - lo) * scale <= usable) {
    const next = left < margin ? margin - lo * scale : screenWidth - margin - hi * scale;
    const [tMin, tMax] = translateBounds(scale, screenWidth);
    return { scale, translateX: Math.min(tMax, Math.max(tMin, next)) };
  }

  const span = Math.max(minYear, maxYear) - Math.min(minYear, maxYear);
  const pad = Math.max(10, span * (margin / usable));
  return transformToFit(Math.min(minYear, maxYear) - pad, Math.max(minYear, maxYear) + pad, screenWidth);
}
