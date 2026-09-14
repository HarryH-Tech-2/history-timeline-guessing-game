/**
 * Museum collection rules. A question's artefact is "acquired" only by naming
 * the exact year; the persisted collection maps question id → error of the
 * acquiring guess (always 0 now, kept for entries earned under the older
 * per-difficulty thresholds), so an entry's existence IS the acquisition.
 * Pure helpers only — no storage, no React.
 */

export function isAcquiringGuess(errorYears: number): boolean {
  return errorYears === 0;
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
