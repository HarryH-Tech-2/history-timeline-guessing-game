/** Coins a single century hint costs. */
export const HINT_COST = 10;

/**
 * Coarsens a year to its 100-year band for a hint, e.g. 1969 → "the 1900s",
 * 2001 → "the 2000s", -450 → "the 400s BCE". Deliberately coarse: it narrows
 * the search without giving the answer away.
 *
 * BCE years band by their absolute value, because "the 400s BCE" means
 * 400–499 BCE (years -499..-400) — flooring the signed year put 450 BCE in
 * "the 500s BCE", a century off. The two double-digit bands read badly as
 * "the 0s", so they get their century names instead.
 */
export function centuryHint(year: number): string {
  if (year < 0) {
    const band = Math.floor(Math.abs(year) / 100) * 100;
    return band === 0 ? 'the 1st century BCE' : `the ${band}s BCE`;
  }
  const band = Math.floor(year / 100) * 100;
  return band === 0 ? 'the 1st century' : `the ${band}s`;
}

/**
 * Hint sentences, phrased around the century band. `{band}` marks where the
 * band goes so the UI can render it bold. Varied so hints don't always read
 * "this happened in X"; the pick is deterministic per question (see
 * {@link hintTemplate}) so re-renders never reshuffle the wording mid-round.
 */
const HINT_TEMPLATES: readonly string[] = [
  'Minerva hoots softly: look to {band}.',
  'The archives file this one under {band}.',
  'Dust off the scrolls from {band}.',
  'Somewhere in {band} — you can narrow it down from there.',
  'A curator would shelve this in {band}.',
  'Word around the museum is it belongs to {band}.',
  'The carbon dating comes back to {band}.',
  'Historians agree on this much: {band}.',
];

/** Small deterministic string hash (djb2), for a stable template pick. */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

/** The hint sentence for a question, with `{band}` still unexpanded. */
export function hintTemplate(questionId: string): string {
  return HINT_TEMPLATES[hashString(questionId) % HINT_TEMPLATES.length]!;
}
