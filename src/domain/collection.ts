import type { Difficulty } from './common';

/**
 * Museum collection rules. A question's artefact is "acquired" when a guess
 * lands within its difficulty's threshold; the persisted collection maps
 * question id → best error among acquiring guesses, so an entry's existence
 * IS the acquisition. Pure helpers only — no storage, no React.
 */

/** Max years off that still acquires the artefact, by question difficulty. */
const ACQUIRE_THRESHOLDS: Record<Difficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 25,
  expert: 50,
};

export function acquireThreshold(difficulty: Difficulty): number {
  return ACQUIRE_THRESHOLDS[difficulty];
}

export function isAcquiringGuess(errorYears: number, difficulty: Difficulty): boolean {
  return errorYears <= acquireThreshold(difficulty);
}

export type MasteryTier = 'bronze' | 'silver' | 'gold';

/**
 * Category mastery from museum acquisitions: bronze at a third of the wing,
 * silver at two thirds, gold when complete. Fraction-based so remote
 * catalogues of any size keep working.
 */
export function masteryTier(acquired: number, total: number): MasteryTier | null {
  if (total <= 0 || acquired <= 0) return null;
  if (acquired >= total) return 'gold';
  if (acquired / total >= 2 / 3) return 'silver';
  if (acquired / total >= 1 / 3) return 'bronze';
  return null;
}

export const MASTERY_BADGES: Record<MasteryTier, { icon: string; label: string }> = {
  bronze: { icon: '🥉', label: 'Bronze' },
  silver: { icon: '🥈', label: 'Silver' },
  gold: { icon: '🥇', label: 'Gold' },
};
