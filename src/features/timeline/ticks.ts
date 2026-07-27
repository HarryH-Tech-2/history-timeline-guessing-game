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
 * - Major ticks (labelled) every century across the whole range.
 * - Minor ticks every decade from 1000 CE onward, where they are visually
 *   distinct; earlier eras are dense enough that centuries suffice.
 */
function buildTicks(): readonly Tick[] {
  const ticks: Tick[] = [];

  for (let year = MIN_YEAR; year <= PRESENT_YEAR; year += 100) {
    ticks.push({
      year,
      worldX: worldXForYear(year),
      major: true,
      label: formatYear(year),
    });
  }

  for (let year = 1000; year <= PRESENT_YEAR; year += 10) {
    if (year % 100 === 0) continue; // already a major tick
    ticks.push({ year, worldX: worldXForYear(year), major: false });
  }

  return ticks;
}

export const TICKS = buildTicks();
