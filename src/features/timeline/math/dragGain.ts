/**
 * Drag "pointer acceleration" for the timeline pan.
 *
 * With a year only a few px wide on a phone, a 1:1 drag made
 * landing on one exact year a matter of single-pixel finger wobble. Instead
 * the finger's movement is scaled by its speed: a slow, careful drag moves
 * the timeline a fraction of the finger distance (several px per year), a
 * quick swipe moves it faster than 1:1 to cross centuries.
 */

/** Finger speed (px/s) at or below which the drag is fully in precision mode. */
export const PRECISE_SPEED = 120;
/** Finger speed (px/s) at or above which the drag is at full gain. */
export const FAST_SPEED = 1400;
/** Timeline px per finger px when dragging slowly. */
export const PRECISE_GAIN = 0.4;
/** Timeline px per finger px when swiping fast. */
export const FAST_GAIN = 1.4;

/**
 * Timeline px moved per finger px at the given finger velocity (px/s, either
 * sign). Eased (smoothstep) between the two speeds so the change of feel has
 * no seam a player could notice mid-drag.
 */
export function dragGain(velocity: number): number {
  'worklet';
  const speed = Math.abs(velocity);
  if (speed <= PRECISE_SPEED) return PRECISE_GAIN;
  if (speed >= FAST_SPEED) return FAST_GAIN;
  const t = (speed - PRECISE_SPEED) / (FAST_SPEED - PRECISE_SPEED);
  const eased = t * t * (3 - 2 * t);
  return PRECISE_GAIN + (FAST_GAIN - PRECISE_GAIN) * eased;
}

/** Release speed (px/s) below which a lift is a placement, not a fling: the
 * timeline settles on the nearest year instead of coasting. */
export const FLING_MIN_SPEED = 400;
