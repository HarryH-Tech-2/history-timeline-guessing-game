/**
 * How each in-app achievement maps onto Google Play Games Services.
 *
 * Play Console assigns every achievement an opaque id (looks like
 * `CgkIxxxxxxxxEAIQAQ`) when it is created there. Paste those ids into
 * `playId` below; until an entry has one it is simply skipped by the sync, so
 * shipping this file with blanks is safe. Names, descriptions and points are
 * also what `scripts/achievementsCsv.ts` exports for typing into the Console.
 *
 * Points follow Play's rules: 5–200 per achievement, in steps of 5, and no
 * more than 1,000 across the whole game — guarded by playGamesAchievements.test.
 */
export interface PlayGamesAchievement {
  /** Play Console achievement id, or '' while not yet created there. */
  playId: string;
  /** Play Games XP awarded on unlock (5–200, multiple of 5). */
  points: number;
}

export const MAX_TOTAL_POINTS = 1000;

export const PLAY_GAMES_ACHIEVEMENTS: Readonly<Record<string, PlayGamesAchievement>> = {
  // Starters — 50
  'first-round': { playId: '', points: 5 },
  'warming-up': { playId: '', points: 5 },
  bullseye: { playId: '', points: 10 },
  'first-artefact': { playId: '', points: 10 },
  'on-a-roll': { playId: '', points: 10 },
  'daily-streak-3': { playId: '', points: 10 },
  // A few sessions in — 190
  deadeye: { playId: '', points: 20 },
  'level-5': { playId: '', points: 20 },
  'coin-hoarder': { playId: '', points: 20 },
  centurion: { playId: '', points: 25 },
  dedicated: { playId: '', points: 25 },
  unstoppable: { playId: '', points: 25 },
  'daily-streak-7': { playId: '', points: 25 },
  curator: { playId: '', points: 30 },
  // Committed players — 300
  sharpshooter: { playId: '', points: 40 },
  'level-10': { playId: '', points: 40 },
  scholar: { playId: '', points: 40 },
  marathoner: { playId: '', points: 40 },
  'flow-state': { playId: '', points: 40 },
  'treasure-vault': { playId: '', points: 40 },
  'level-20': { playId: '', points: 60 },
  // The long haul — 460
  'time-lord': { playId: '', points: 60 },
  chronicler: { playId: '', points: 60 },
  'grand-curator': { playId: '', points: 60 },
  completionist: { playId: '', points: 60 },
  'daily-streak-30': { playId: '', points: 60 },
  'living-legend': { playId: '', points: 80 },
  'level-30': { playId: '', points: 80 },
};

/** The Play Console id for an in-app achievement, or null if it has none yet. */
export function playGamesIdFor(id: string): string | null {
  const playId = PLAY_GAMES_ACHIEVEMENTS[id]?.playId;
  return playId ? playId : null;
}
