/**
 * The "now" edge of the timeline. Kept as a constant (not `new Date()`) so the
 * warp is deterministic and unit-testable; bumped intentionally per release.
 */
export const PRESENT_YEAR = 2026;

/** Oldest year the timeline reaches: 3000 BCE. */
export const MIN_YEAR = -3000;

/** Convenience: the full span the timeline can represent. */
export const MAX_YEAR = PRESENT_YEAR;
