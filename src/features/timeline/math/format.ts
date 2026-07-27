/**
 * Format a signed timeline year for display. Negative years are BCE; the
 * numeric magnitude is shown directly (astronomical year 0 is presented as
 * "1 BCE"). CE years are shown bare (the common reading for a history game).
 */
export function formatYear(year: number): string {
  const whole = Math.round(year);
  if (whole > 0) return `${whole}`;
  if (whole === 0) return '1 BCE';
  return `${-whole} BCE`;
}

/** Round a year to a "nice" step (1 / 10 / 100 / 1000) for gridlines. */
export function roundToStep(year: number, step: number): number {
  return Math.round(year / step) * step;
}
