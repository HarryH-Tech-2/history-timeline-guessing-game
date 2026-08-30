import { levelForXp, type ProgressionState } from '@/domain';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Emoji badge, kept simple so no asset pipeline is needed. */
  icon: string;
  /** The live stat this achievement tracks, read from progression state. */
  measure: (state: ProgressionState) => number;
  /** Earned once `measure(state)` reaches this value. */
  target: number;
}

/** Shared measures, so related achievements can't drift apart. */
const rounds = (s: ProgressionState) => s.stats.rounds;
const perfects = (s: ProgressionState) => s.stats.perfectRounds;
const streak = (s: ProgressionState) => s.stats.bestStreak;
const games = (s: ProgressionState) => s.stats.gamesPlayed;
const dailyStreak = (s: ProgressionState) => s.stats.bestDailyStreak;
const coins = (s: ProgressionState) => s.coins;
const level = (s: ProgressionState) => levelForXp(s.xp);
const artefacts = (s: ProgressionState) => Object.keys(s.collection).length;

/**
 * The catalogue of unlockable achievements. Each is a pure measure over
 * `ProgressionState` plus a target, so unlocking is just a scan — no event
 * bus, no ordering concerns — and the UI can show how close each one is.
 */
export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-round',
    title: 'First Steps',
    description: 'Answer your first question.',
    icon: '👣',
    measure: rounds,
    target: 1,
  },
  {
    id: 'bullseye',
    title: 'Bullseye',
    description: 'Nail a year exactly.',
    icon: '🎯',
    measure: perfects,
    target: 1,
  },
  {
    id: 'sharpshooter',
    title: 'Sharpshooter',
    description: 'Land 25 perfect guesses.',
    icon: '🏹',
    measure: perfects,
    target: 25,
  },
  {
    id: 'on-a-roll',
    title: 'On a Roll',
    description: 'Reach a 5-guess combo.',
    icon: '🔥',
    measure: streak,
    target: 5,
  },
  {
    id: 'unstoppable',
    title: 'Unstoppable',
    description: 'Reach a 10-guess combo.',
    icon: '⚡',
    measure: streak,
    target: 10,
  },
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Answer 100 questions.',
    icon: '💯',
    measure: rounds,
    target: 100,
  },
  {
    id: 'level-5',
    title: 'Rising Historian',
    description: 'Reach level 5.',
    icon: '📚',
    measure: level,
    target: 5,
  },
  {
    id: 'level-10',
    title: 'Master of Time',
    description: 'Reach level 10.',
    icon: '⏳',
    measure: level,
    target: 10,
  },
  {
    id: 'coin-hoarder',
    title: 'Coin Hoarder',
    description: 'Bank 500 coins at once.',
    icon: '🪙',
    measure: coins,
    target: 500,
  },
  {
    id: 'dedicated',
    title: 'Dedicated',
    description: 'Finish 20 games.',
    icon: '🎖️',
    measure: games,
    target: 20,
  },
  {
    id: 'warming-up',
    title: 'Warming Up',
    description: 'Finish your first game.',
    icon: '🌅',
    measure: games,
    target: 1,
  },
  {
    id: 'deadeye',
    title: 'Deadeye',
    description: 'Land 5 perfect guesses.',
    icon: '🎪',
    measure: perfects,
    target: 5,
  },
  {
    id: 'time-lord',
    title: 'Time Lord',
    description: 'Land 100 perfect guesses.',
    icon: '🌀',
    measure: perfects,
    target: 100,
  },
  {
    id: 'flow-state',
    title: 'Flow State',
    description: 'Reach a 20-guess combo.',
    icon: '🌊',
    measure: streak,
    target: 20,
  },
  {
    id: 'daily-streak-3',
    title: 'Creature of Habit',
    description: 'Keep a 3-day Daily streak.',
    icon: '🔥',
    measure: dailyStreak,
    target: 3,
  },
  {
    id: 'daily-streak-7',
    title: 'Week of Wisdom',
    description: 'Keep a 7-day Daily streak.',
    icon: '📆',
    measure: dailyStreak,
    target: 7,
  },
  {
    id: 'daily-streak-30',
    title: 'Historian in Residence',
    description: 'Keep a 30-day Daily streak.',
    icon: '🏵️',
    measure: dailyStreak,
    target: 30,
  },
  {
    id: 'first-artefact',
    title: 'First Exhibit',
    description: 'Add your first artefact to the museum.',
    icon: '🏺',
    measure: artefacts,
    target: 1,
  },
  {
    id: 'curator',
    title: 'Curator',
    description: 'Collect 25 museum artefacts.',
    icon: '🏛️',
    measure: artefacts,
    target: 25,
  },
  {
    id: 'grand-curator',
    title: 'Grand Curator',
    description: 'Collect 100 museum artefacts.',
    icon: '🏰',
    measure: artefacts,
    target: 100,
  },
  {
    id: 'scholar',
    title: 'Scholar',
    description: 'Answer 250 questions.',
    icon: '🎓',
    measure: rounds,
    target: 250,
  },
  {
    id: 'chronicler',
    title: 'Chronicler',
    description: 'Answer 500 questions.',
    icon: '📜',
    measure: rounds,
    target: 500,
  },
  {
    id: 'living-legend',
    title: 'Living Legend',
    description: 'Answer 1,000 questions.',
    icon: '🏛️',
    measure: rounds,
    target: 1000,
  },
  {
    id: 'marathoner',
    title: 'Marathoner',
    description: 'Finish 50 games.',
    icon: '🏃',
    measure: games,
    target: 50,
  },
  {
    id: 'completionist',
    title: 'Completionist',
    description: 'Finish 100 games.',
    icon: '🏆',
    measure: games,
    target: 100,
  },
  {
    id: 'treasure-vault',
    title: 'Treasure Vault',
    description: 'Hold 2,000 coins at once.',
    icon: '💰',
    measure: coins,
    target: 2000,
  },
  {
    id: 'level-20',
    title: 'Chronomancer',
    description: 'Reach level 20.',
    icon: '🔮',
    measure: level,
    target: 20,
  },
  {
    id: 'level-30',
    title: 'Timeless',
    description: 'Reach level 30.',
    icon: '♾️',
    measure: level,
    target: 30,
  },
];

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** True once the given progression state satisfies the achievement. */
export function isAchievementEarned(a: Achievement, state: ProgressionState): boolean {
  return a.measure(state) >= a.target;
}

/**
 * How close the state is to earning the achievement, clamped so the UI can
 * never show "27 / 25".
 */
export function achievementProgress(
  a: Achievement,
  state: ProgressionState,
): { current: number; target: number } {
  return { current: Math.min(a.measure(state), a.target), target: a.target };
}

/**
 * Every achievement id the state currently satisfies. Combined with the stored
 * `unlocked` set, this lets the provider detect *newly* earned achievements.
 */
export function earnedAchievementIds(state: ProgressionState): readonly string[] {
  return ACHIEVEMENTS.filter((a) => isAchievementEarned(a, state)).map((a) => a.id);
}

/** Ids satisfied now but not yet recorded in `state.unlocked`. */
export function newlyEarnedAchievements(state: ProgressionState): readonly string[] {
  const already = new Set(state.unlocked);
  return earnedAchievementIds(state).filter((id) => !already.has(id));
}
