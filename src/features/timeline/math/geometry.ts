import { unwarp, warp } from './warp';

/**
 * Pixel width of the entire warped axis (coord 0..1) at scale = 1. The pinch
 * scale multiplies this. A large base keeps arithmetic comfortably away from
 * sub-pixel rounding when zoomed in.
 */
export const BASE_WIDTH = 5000;

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
