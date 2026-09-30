/**
 * Format a signed timeline year for display. Negative years are BCE; the
 * numeric magnitude is shown directly (astronomical year 0 is presented as
 * "1 BCE"). CE years are shown bare (the common reading for a history game).
 * `bce` is the era word for the language ("a.C."): a worklet can't call
 * `t()`, so JS-thread callers use `displayYear` and worklets are handed the
 * word from render.
 */
export function formatYear(year: number, bce: string = 'BCE'): string {
  'worklet';
  const whole = Math.round(year);
  if (whole > 0) return `${whole}`;
  const magnitude = `${whole === 0 ? 1 : -whole}`;
  // "%y" marks where the number goes when the era word comes first
  // (Japanese "紀元前%y" → "紀元前450"); otherwise it follows: "450 BCE".
  return bce.indexOf('%y') >= 0 ? bce.replace('%y', magnitude) : `${magnitude} ${bce}`;
}

/** Round a year to a "nice" step (1 / 10 / 100 / 1000) for gridlines. */
export function roundToStep(year: number, step: number): number {
  return Math.round(year / step) * step;
}
