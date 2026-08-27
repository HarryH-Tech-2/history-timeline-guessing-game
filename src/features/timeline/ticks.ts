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
 * - Minor ticks every decade across the whole range, so the pre-1000 stretch
 *   has the same separators as the modern era. They only fade in once the
 *   zoom is tight enough for decades to be legible (see TimelineTick), so the
 *   extra views cost nothing visually when zoomed out.
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

  for (let year = MIN_YEAR; year <= PRESENT_YEAR; year += 10) {
    if (year % 100 === 0) continue; // already a major tick
    ticks.push({ year, worldX: worldXForYear(year), major: false });
  }

  return ticks;
}

export const TICKS = buildTicks();

/** The ~50 labelled century ticks, always mounted. */
export const MAJOR_TICKS: readonly Tick[] = TICKS.filter((t) => t.major);

/**
 * Decade ticks are only legible once the view spans a few centuries, so they
 * are mounted lazily in 500-year blocks around the crosshair (see
 * TimelineTrack). Mounting all ~500 up front made the quiz screen take
 * noticeably long to appear after tapping a mode.
 */
export const DECADE_BLOCK_YEARS = 500;

export const MINOR_TICKS_BY_BLOCK: ReadonlyMap<number, readonly Tick[]> = (() => {
  const blocks = new Map<number, Tick[]>();
  for (const tick of TICKS) {
    if (tick.major) continue;
    const block = Math.floor(tick.year / DECADE_BLOCK_YEARS);
    const list = blocks.get(block);
    if (list) list.push(tick);
    else blocks.set(block, [tick]);
  }
  return blocks;
})();

/** Index of the 500-year block containing `year`; safe on the UI thread. */
export function decadeBlockOf(year: number): number {
  'worklet';
  return Math.floor(year / DECADE_BLOCK_YEARS);
}
