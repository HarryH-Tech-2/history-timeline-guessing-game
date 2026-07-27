import { levelForXp, type ProgressionState } from '@/domain';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Emoji badge, kept simple so no asset pipeline is needed. */
  icon: string;
  /** True once the given progression state satisfies this achievement. */
  isEarned: (state: ProgressionState) => boolean;
}

/**
 * The catalogue of unlockable achievements. Each predicate is pure over
 * `ProgressionState`, so unlocking is just a scan — no event bus, no ordering
 * concerns, and trivially testable.
 */
export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-round',
    title: 'First Steps',
    description: 'Answer your first question.',
    icon: '👣',
    isEarned: (s) => s.stats.rounds >= 1,
  },
  {
    id: 'bullseye',
    title: 'Bullseye',
    description: 'Nail a year exactly.',
    icon: '🎯',
    isEarned: (s) => s.stats.perfectRounds >= 1,
  },
  {
    id: 'sharpshooter',
    title: 'Sharpshooter',
    description: 'Land 25 perfect guesses.',
    icon: '🏹',
    isEarned: (s) => s.stats.perfectRounds >= 25,
  },
  {
    id: 'on-a-roll',
    title: 'On a Roll',
    description: 'Reach a 5-guess combo.',
    icon: '🔥',
    isEarned: (s) => s.stats.bestStreak >= 5,
  },
  {
    id: 'unstoppable',
    title: 'Unstoppable',
    description: 'Reach a 10-guess combo.',
    icon: '⚡',
    isEarned: (s) => s.stats.bestStreak >= 10,
  },
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Answer 100 questions.',
    icon: '💯',
    isEarned: (s) => s.stats.rounds >= 100,
  },
  {
    id: 'level-5',
    title: 'Rising Historian',
    description: 'Reach level 5.',
    icon: '📚',
    isEarned: (s) => levelForXp(s.xp) >= 5,
  },
  {
    id: 'level-10',
    title: 'Master of Time',
    description: 'Reach level 10.',
    icon: '⏳',
    isEarned: (s) => levelForXp(s.xp) >= 10,
  },
  {
    id: 'coin-hoarder',
    title: 'Coin Hoarder',
    description: 'Bank 500 coins at once.',
    icon: '🪙',
    isEarned: (s) => s.coins >= 500,
  },
  {
    id: 'dedicated',
    title: 'Dedicated',
    description: 'Finish 20 games.',
    icon: '🎖️',
    isEarned: (s) => s.stats.gamesPlayed >= 20,
  },
];

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Every achievement id the state currently satisfies. Combined with the stored
 * `unlocked` set, this lets the provider detect *newly* earned achievements.
 */
export function earnedAchievementIds(state: ProgressionState): readonly string[] {
  return ACHIEVEMENTS.filter((a) => a.isEarned(state)).map((a) => a.id);
}

/** Ids satisfied now but not yet recorded in `state.unlocked`. */
export function newlyEarnedAchievements(state: ProgressionState): readonly string[] {
  const already = new Set(state.unlocked);
  return earnedAchievementIds(state).filter((id) => !already.has(id));
}
