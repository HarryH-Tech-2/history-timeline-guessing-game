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
  {
    id: 'warming-up',
    title: 'Warming Up',
    description: 'Finish your first game.',
    icon: '🌅',
    isEarned: (s) => s.stats.gamesPlayed >= 1,
  },
  {
    id: 'deadeye',
    title: 'Deadeye',
    description: 'Land 5 perfect guesses.',
    icon: '🎪',
    isEarned: (s) => s.stats.perfectRounds >= 5,
  },
  {
    id: 'time-lord',
    title: 'Time Lord',
    description: 'Land 100 perfect guesses.',
    icon: '🌀',
    isEarned: (s) => s.stats.perfectRounds >= 100,
  },
  {
    id: 'flow-state',
    title: 'Flow State',
    description: 'Reach a 20-guess combo.',
    icon: '🌊',
    isEarned: (s) => s.stats.bestStreak >= 20,
  },
  {
    id: 'daily-streak-3',
    title: 'Creature of Habit',
    description: 'Keep a 3-day Daily streak.',
    icon: '🔥',
    isEarned: (s) => s.stats.bestDailyStreak >= 3,
  },
  {
    id: 'daily-streak-7',
    title: 'Week of Wisdom',
    description: 'Keep a 7-day Daily streak.',
    icon: '📆',
    isEarned: (s) => s.stats.bestDailyStreak >= 7,
  },
  {
    id: 'daily-streak-30',
    title: 'Historian in Residence',
    description: 'Keep a 30-day Daily streak.',
    icon: '🏵️',
    isEarned: (s) => s.stats.bestDailyStreak >= 30,
  },
  {
    id: 'first-artefact',
    title: 'First Exhibit',
    description: 'Add your first artefact to the museum.',
    icon: '🏺',
    isEarned: (s) => Object.keys(s.collection).length >= 1,
  },
  {
    id: 'curator',
    title: 'Curator',
    description: 'Collect 25 museum artefacts.',
    icon: '🏛️',
    isEarned: (s) => Object.keys(s.collection).length >= 25,
  },
  {
    id: 'grand-curator',
    title: 'Grand Curator',
    description: 'Collect 100 museum artefacts.',
    icon: '🏰',
    isEarned: (s) => Object.keys(s.collection).length >= 100,
  },
  {
    id: 'scholar',
    title: 'Scholar',
    description: 'Answer 250 questions.',
    icon: '🎓',
    isEarned: (s) => s.stats.rounds >= 250,
  },
  {
    id: 'chronicler',
    title: 'Chronicler',
    description: 'Answer 500 questions.',
    icon: '📜',
    isEarned: (s) => s.stats.rounds >= 500,
  },
  {
    id: 'living-legend',
    title: 'Living Legend',
    description: 'Answer 1,000 questions.',
    icon: '🏛️',
    isEarned: (s) => s.stats.rounds >= 1000,
  },
  {
    id: 'marathoner',
    title: 'Marathoner',
    description: 'Finish 50 games.',
    icon: '🏃',
    isEarned: (s) => s.stats.gamesPlayed >= 50,
  },
  {
    id: 'completionist',
    title: 'Completionist',
    description: 'Finish 100 games.',
    icon: '🏆',
    isEarned: (s) => s.stats.gamesPlayed >= 100,
  },
  {
    id: 'treasure-vault',
    title: 'Treasure Vault',
    description: 'Hold 2,000 coins at once.',
    icon: '💰',
    isEarned: (s) => s.coins >= 2000,
  },
  {
    id: 'level-20',
    title: 'Chronomancer',
    description: 'Reach level 20.',
    icon: '🔮',
    isEarned: (s) => levelForXp(s.xp) >= 20,
  },
  {
    id: 'level-30',
    title: 'Timeless',
    description: 'Reach level 30.',
    icon: '♾️',
    isEarned: (s) => levelForXp(s.xp) >= 30,
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
