import { formatYear, MIN_YEAR, PRESENT_YEAR, worldXForYear } from './math';

export interface Tick {
  year: number;
  /** World-space x (px at scale 1); multiplied by the live scale at render. */
  worldX: number;
  major: boolean;
  /** Present only on major ticks. */
  label?: string;
}

/**
 * Static tick set for the timeline. Positions are precomputed once; the live
 * pan/zoom transform moves them on the UI thread, so this list never rebuilds.
 *
 * Major ticks (labelled) every century across the whole range; decade lines
 * come from a recycled pool instead (see decadeSlotYear).
 *
 * Nothing is drawn before MIN_YEAR: the crosshair can be panned onto 1000 BCE,
 * and the half-track to its left is left plain, with no gridlines.
 */
function buildTicks(): readonly Tick[] {
  const ticks: Tick[] = [];

  for (let year = FIRST_TICK_YEAR; year <= PRESENT_YEAR; year += 100) {
    ticks.push({
      year,
      worldX: worldXForYear(year),
      major: true,
      label: formatYear(year),
    });
  }

  return ticks;
}

export const FIRST_TICK_YEAR = MIN_YEAR;

export const TICKS = buildTicks();

/** The labelled century ticks (~30 playable + 20 overscan), always mounted. */
export const MAJOR_TICKS: readonly Tick[] = TICKS;

/**
 * Decade gridlines are drawn by a fixed pool of recycled views (see
 * TimelineTrack) rather than one view per decade: ~700 decades across the
 * range is too many to mount, and mounting a window of them around the
 * crosshair meant swapping views in and out as the player panned — a React
 * commit, so only ever done at rest, which left a fast fling showing no
 * decade lines at all until a second or so after it stopped.
 *
 * Slot `slot` of a pool of `poolSize` always shows the one decade, of the
 * `poolSize` consecutive decades centred on `centreYear`, that is congruent to
 * it mod `poolSize`. As the view pans, a slot's year changes only when its
 * decade leaves one edge of that window and it wraps around to the other —
 * so each frame touches at most a slot or two, never the whole pool.
 *
 * Returns null when the slot has nothing to draw: a century year (a major
 * tick already marks it) or a year past either end of the gridlines.
 */
export function decadeSlotYear(slot: number, centreYear: number, poolSize: number): number | null {
  'worklet';
  const first = Math.floor(centreYear / 10) - Math.floor(poolSize / 2);
  const offset = (((slot - first) % poolSize) + poolSize) % poolSize;
  const year = (first + offset) * 10;
  if (year % 100 === 0 || year < FIRST_TICK_YEAR || year > PRESENT_YEAR) return null;
  return year;
}
