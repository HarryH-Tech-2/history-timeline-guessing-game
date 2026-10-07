import { getLandmarks } from '@/data';
import type { Question } from '@/domain';
import type { TranslationKey } from '@/i18n';

/** Coins a single hint costs. */
export const HINT_COST = 10;

export interface LandmarkHint {
  /** The well-known event the question is placed against. */
  landmark: Question;
  /** How far, and which way, the question sits from it. */
  relation: TranslationKey;
}

/**
 * How the gap to the landmark is worded. Deliberately loose: the landmark's
 * year is shown, so an exact gap would hand over the answer. The closest band
 * drops the direction for the same reason.
 */
function relationKey(gap: number): TranslationKey {
  const years = Math.abs(gap);
  if (years <= 12) return 'round.hints.relation.near';
  const after = gap > 0;
  if (years <= 40) return after ? 'round.hints.relation.decadesAfter' : 'round.hints.relation.decadesBefore';
  if (years <= 75) {
    return after ? 'round.hints.relation.halfCenturyAfter' : 'round.hints.relation.halfCenturyBefore';
  }
  if (years <= 150) return after ? 'round.hints.relation.centuryAfter' : 'round.hints.relation.centuryBefore';
  return after ? 'round.hints.relation.centuriesAfter' : 'round.hints.relation.centuriesBefore';
}

/**
 * A hint that teaches: the nearest landmark date (never the question itself)
 * and roughly where the question falls around it, e.g. "The Storming of the
 * Bastille · 1789 — this came a few decades later."
 */
export function landmarkHint(question: Question): LandmarkHint | null {
  let nearest: Question | null = null;
  for (const landmark of getLandmarks()) {
    if (landmark.id === question.id) continue;
    if (!nearest || Math.abs(landmark.year - question.year) < Math.abs(nearest.year - question.year)) {
      nearest = landmark;
    }
  }
  return nearest && { landmark: nearest, relation: relationKey(question.year - nearest.year) };
}
