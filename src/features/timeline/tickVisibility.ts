import type { Tick } from './ticks';

/**
 * Zoom ranges over which each tier of tick fades in, as [from, to] scale.
 * Chosen so that neighbouring visible labels are always ≥ ~80px apart and
 * gridlines never bunch into a smear: when the timeline is framed wide (e.g.
 * the reveal fitting 551 BCE and 1863 on one screen) only millennium and
 * 500-year labels survive, though century gridlines linger faintly; century
 * labels appear as you zoom in, then decade lines.
 *
 * Kept in its own module (not inside TimelineTick) so tests can drive the
 * exact ramps the component renders with — the "dividers vanish on a big-miss
 * reveal" bug lived in these numbers, and a regression test guards them.
 */
export type Ramp = readonly [number, number];

const ALWAYS: Ramp = [0, 0];

/** Line fade-in per tier: millennium / half-millennium / century / decade.
 * Century lines are fully on across the entire reveal range: a big-miss
 * reveal lands anywhere down to ~scale 0.1 (verified on-device — a 2,081-year
 * miss on a 390dp track reveals at ~0.15), and two earlier ramps ([0.3, 0.5],
 * then [0.12, 0.28]) both left that stretch looking stripped bare. At 0.1 the
 * century comb is 10px spacing — the same density as the decade comb in
 * normal play, so there is no smear risk before the ramp floor; only a manual
 * pinch below ~0.1 fades centuries out. Labels still wait for room. */
export const LINE_RAMPS: readonly Ramp[] = [ALWAYS, [0.04, 0.08], [0.05, 0.1], [0.7, 1.1]];

/** Label fade-in per labelled tier (decades have no label). */
export const LABEL_RAMPS: readonly Ramp[] = [[0.04, 0.07], [0.16, 0.24], [0.8, 1.1]];

/** Years between neighbouring ticks of each tier, for spacing maths. */
export const TIER_YEARS: readonly number[] = [1000, 500, 100, 10];

/** Decade ticks are unmounted entirely below this zoom (see TimelineTrack). */
export const DECADE_MIN_SCALE = 0.55;

export function rampOpacity(scale: number, from: number, to: number): number {
  'worklet';
  if (to <= from) return 1;
  if (scale <= from) return 0;
  if (scale >= to) return 1;
  return (scale - from) / (to - from);
}

export function tierOf(tick: Pick<Tick, 'major' | 'year'>): number {
  if (!tick.major) return 3;
  if (tick.year % 1000 === 0) return 0;
  if (tick.year % 500 === 0) return 1;
  return 2;
}
