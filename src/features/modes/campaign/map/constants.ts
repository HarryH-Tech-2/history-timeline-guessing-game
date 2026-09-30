/** Layout and timing shared across the campaign map's pieces. */

/** Stage button diameter. */
export const NODE = 68;
/** The frontier (next stage to play) is drawn larger. */
export const FRONTIER_NODE = 80;
/** Height of the darker 3D lip showing under a button or banner. */
export const LIP = 6;
/** Vertical distance between one stage button and the next. */
export const STEP_Y = 124;
/**
 * Clear space between an era banner and its first stage, so the frontier's
 * START bubble, larger button and pulse ring never touch the banner.
 */
export const TRAIL_TOP = 64;
/** How far (fraction of the usable half-width) the trail swings side to side. */
export const SWING = 0.62;
/**
 * Nominal dots per connector: the light-up sequence spreads each segment's
 * dots over this many staggers, whatever its length.
 */
export const TRAIL_DOTS = 5;
/** Distance between trail dots along the curved connector. */
export const TRAIL_DOT_SPACING = 13;
/** Delay between trail dots lighting up in the unlock sequence. */
export const DOT_STAGGER_MS = 90;
/** When the light-up sequence starts after the map regains focus. */
export const SEQUENCE_DELAY_MS = 250;
/** Height of the sticky era bar, including its lip and top margin. */
export const STICKY_BAR_SPACE = 60;

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Horizontal centre (px) of the k-th stage button on the winding trail. */
export function trailX(globalIndex: number, width: number): number {
  const amplitude = (width / 2 - FRONTIER_NODE / 2 - 24) * SWING;
  return width / 2 + amplitude * Math.sin(globalIndex * 1.05 + 0.6);
}

/** Vertical centre (px) of the i-th (0-based) stage button within its era trail. */
export function stageCentreY(i: number): number {
  return TRAIL_TOP + i * STEP_Y + STEP_Y / 2;
}

/** Era numeral, e.g. "II". */
export function eraNumeral(index: number): string {
  return ROMAN[index - 1] ?? String(index);
}

/** Below the fork stage's centre: where its route banners start (clear of its star pill). */
export const ROUTE_BANNER_TOP = 72;
/** Height of a route banner, lip included. */
export const ROUTE_BANNER_H = 52;
/** Side margin of the route lanes, and the gap between the two banners. */
export const ROUTE_GUTTER = 16;
export const ROUTE_GAP = 12;

/** Lane `lane` (0 = left, 1 = right) of a fork: its banner's box and the lane's centre line. */
export function routeLane(lane: number, width: number): { left: number; width: number; centre: number } {
  const laneWidth = (width - 2 * ROUTE_GUTTER - ROUTE_GAP) / 2;
  const left = ROUTE_GUTTER + lane * (laneWidth + ROUTE_GAP);
  return { left, width: laneWidth, centre: left + laneWidth / 2 };
}
