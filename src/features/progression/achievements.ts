import { levelForXp, type ProgressionState } from '@/domain';
// Straight from translate (not the '@/i18n' barrel): scripts/achievementsCsv.ts
// loads this file under tsx, where the barrel's storage import can't run.
import { t } from '@/i18n/translate';
import type { achievements as achievementText } from '@/i18n/locales/en/achievements';

/** The cabinet an achievement is displayed in on the Achievements tab. */
export type AchievementGroup = 'precision' | 'dedication' | 'daily' | 'museum' | 'rank';

/** Every achievement id; each has a title and description in the `achievements` translations. */
export type AchievementId = Exclude<keyof typeof achievementText, 'ui'>;

export interface Achievement {
  id: string;
  /** In the current language. Read lazily (a getter), never at import. */
  readonly title: string;
  /** In the current language. Read lazily (a getter), never at import. */
  readonly description: string;
  /** Emoji badge, kept simple so no asset pipeline is needed. */
  icon: string;
  group: AchievementGroup;
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

/** An achievement as written below: its text comes from the translations. */
type Definition = Omit<Achievement, 'id' | 'title' | 'description'> & { id: AchievementId };

/** The achievement's name in the current language. */
export function achievementTitle(id: AchievementId): string {
  return t(`achievements.${id}.title`);
}

/** What the achievement asks for, in the current language. */
export function achievementDescription(id: AchievementId): string {
  return t(`achievements.${id}.description`);
}

/**
 * The catalogue of unlockable achievements. Each is a pure measure over
 * `ProgressionState` plus a target, so unlocking is just a scan — no event
 * bus, no ordering concerns — and the UI can show how close each one is.
 */
const DEFINITIONS: readonly Definition[] = [
  {
    id: 'first-round',
    icon: '👣',
    group: 'dedication',
    measure: rounds,
    target: 1,
  },
  {
    id: 'bullseye',
    icon: '🎯',
    group: 'precision',
    measure: perfects,
    target: 1,
  },
  {
    id: 'sharpshooter',
    icon: '🏹',
    group: 'precision',
    measure: perfects,
    target: 25,
  },
  {
    id: 'on-a-roll',
    icon: '🔥',
    group: 'precision',
    measure: streak,
    target: 5,
  },
  {
    id: 'unstoppable',
    icon: '⚡',
    group: 'precision',
    measure: streak,
    target: 10,
  },
  {
    id: 'centurion',
    icon: '💯',
    group: 'dedication',
    measure: rounds,
    target: 100,
  },
  {
    id: 'level-5',
    icon: '📚',
    group: 'rank',
    measure: level,
    target: 5,
  },
  {
    id: 'level-10',
    icon: '⏳',
    group: 'rank',
    measure: level,
    target: 10,
  },
  {
    id: 'coin-hoarder',
    icon: '🪙',
    group: 'rank',
    measure: coins,
    target: 500,
  },
  {
    id: 'dedicated',
    icon: '🎖️',
    group: 'dedication',
    measure: games,
    target: 20,
  },
  {
    id: 'warming-up',
    icon: '🌅',
    group: 'dedication',
    measure: games,
    target: 1,
  },
  {
    id: 'deadeye',
    icon: '🎪',
    group: 'precision',
    measure: perfects,
    target: 5,
  },
  {
    id: 'time-lord',
    icon: '🌀',
    group: 'precision',
    measure: perfects,
    target: 100,
  },
  {
    id: 'flow-state',
    icon: '🌊',
    group: 'precision',
    measure: streak,
    target: 20,
  },
  {
    id: 'daily-streak-3',
    icon: '🌱',
    group: 'daily',
    measure: dailyStreak,
    target: 3,
  },
  {
    id: 'daily-streak-7',
    icon: '📆',
    group: 'daily',
    measure: dailyStreak,
    target: 7,
  },
  {
    id: 'daily-streak-30',
    icon: '🏵️',
    group: 'daily',
    measure: dailyStreak,
    target: 30,
  },
  {
    id: 'first-artefact',
    icon: '🏺',
    group: 'museum',
    measure: artefacts,
    target: 1,
  },
  {
    id: 'curator',
    icon: '🏛️',
    group: 'museum',
    measure: artefacts,
    target: 25,
  },
  {
    id: 'grand-curator',
    icon: '🏰',
    group: 'museum',
    measure: artefacts,
    target: 100,
  },
  {
    id: 'scholar',
    icon: '🎓',
    group: 'dedication',
    measure: rounds,
    target: 250,
  },
  {
    id: 'chronicler',
    icon: '📜',
    group: 'dedication',
    measure: rounds,
    target: 500,
  },
  {
    id: 'living-legend',
    icon: '👑',
    group: 'dedication',
    measure: rounds,
    target: 1000,
  },
  {
    id: 'marathoner',
    icon: '🏃',
    group: 'dedication',
    measure: games,
    target: 50,
  },
  {
    id: 'completionist',
    icon: '🏆',
    group: 'dedication',
    measure: games,
    target: 100,
  },
  {
    id: 'treasure-vault',
    icon: '💰',
    group: 'rank',
    measure: coins,
    target: 2000,
  },
  {
    id: 'level-20',
    icon: '🔮',
    group: 'rank',
    measure: level,
    target: 20,
  },
  {
    id: 'level-30',
    icon: '♾️',
    group: 'rank',
    measure: level,
    target: 30,
  },
];

/**
 * The definitions with `title` and `description` as getters, so the text is
 * looked up when read (in the language of the moment), not when this module
 * loads. English here is also what scripts/achievementsCsv.ts exports.
 */
export const ACHIEVEMENTS: readonly Achievement[] = DEFINITIONS.map((d) => ({
  ...d,
  get title() {
    return achievementTitle(d.id);
  },
  get description() {
    return achievementDescription(d.id);
  },
}));

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
