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
/** Dots drawn between consecutive buttons. */
export const TRAIL_DOTS = 5;
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
