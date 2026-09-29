import type { Question } from '@/domain';
import { MAX_YEAR, MIN_YEAR } from '@/features/timeline/math/constants';

/** Coins that buying multiple choice for one question costs. */
export const MULTIPLE_CHOICE_COST = 25;

/**
 * How far apart neighbouring options sit, by era. Modern dates are known to
 * the decade, so decoys a few years off are a real test; ancient ones need
 * centuries of spread to be distinguishable at all.
 */
export function choiceGap(year: number): { min: number; max: number } {
  if (year >= 1800) return { min: 8, max: 40 };
  if (year >= 1000) return { min: 25, max: 120 };
  return { min: 70, max: 400 };
}

/** djb2 over the question id: a stable seed, so options never reshuffle. */
function seedFor(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 33) ^ id.charCodeAt(i);
  return hash >>> 0;
}

/** mulberry32: a tiny deterministic PRNG returning floats in [0, 1). */
function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Years run 1 BCE → 1 CE; there is no year zero, so step over it. */
function skipZero(year: number, direction: 1 | -1): number {
  return year === 0 ? direction : year;
}

/**
 * The four years offered when a player buys multiple choice: the real year
 * plus three decoys, sorted oldest first. Deterministic per question. The
 * answer's slot is random, then shifted if the decoys would run off either
 * end of the timeline (a present-day event can't have later decoys).
 */
export function multipleChoiceYears(question: Question): number[] {
  const random = prng(seedFor(question.id));
  const { min, max } = choiceGap(question.year);
  const gaps = [0, 1, 2].map(() => min + Math.floor(random() * (max - min + 1)));
  let slot = Math.floor(random() * 4);

  const build = (answerSlot: number): number[] => {
    const years: number[] = [question.year];
    let below = question.year;
    for (let i = 0; i < answerSlot; i += 1) {
      below = skipZero(below - gaps[i]!, -1);
      years.unshift(below);
    }
    let above = question.year;
    for (let i = answerSlot; i < 3; i += 1) {
      above = skipZero(above + gaps[i]!, 1);
      years.push(above);
    }
    return years;
  };

  let years = build(slot);
  while (years[3]! > MAX_YEAR && slot < 3) years = build(++slot);
  while (years[0]! < MIN_YEAR && slot > 0) years = build(--slot);
  return years;
}
