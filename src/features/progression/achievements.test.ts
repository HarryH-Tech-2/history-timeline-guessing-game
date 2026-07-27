import { INITIAL_PROGRESSION, xpToReachLevel, type ProgressionState } from '@/domain';

import {
  ACHIEVEMENTS,
  achievementById,
  earnedAchievementIds,
  newlyEarnedAchievements,
} from './achievements';

function state(overrides: Partial<ProgressionState> = {}): ProgressionState {
  return {
    ...INITIAL_PROGRESSION,
    ...overrides,
    stats: { ...INITIAL_PROGRESSION.stats, ...overrides.stats },
  };
}

describe('achievements', () => {
  it('has unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('earns nothing from the initial state', () => {
    expect(earnedAchievementIds(INITIAL_PROGRESSION)).toEqual([]);
  });

  it('earns the round/perfect achievements as stats climb', () => {
    const earned = earnedAchievementIds(
      state({ stats: { rounds: 1, perfectRounds: 1, gamesPlayed: 0, bestStreak: 0 } }),
    );
    expect(earned).toContain('first-round');
    expect(earned).toContain('bullseye');
    expect(earned).not.toContain('sharpshooter');
  });

  it('derives level-based achievements from xp', () => {
    expect(earnedAchievementIds(state({ xp: xpToReachLevel(5) }))).toContain('level-5');
    expect(earnedAchievementIds(state({ xp: xpToReachLevel(4) }))).not.toContain('level-5');
  });

  it('reports only achievements not already unlocked', () => {
    const s = state({ stats: { rounds: 1, perfectRounds: 0, gamesPlayed: 0, bestStreak: 0 }, unlocked: ['first-round'] });
    expect(newlyEarnedAchievements(s)).not.toContain('first-round');

    const s2 = state({ stats: { rounds: 1, perfectRounds: 0, gamesPlayed: 0, bestStreak: 0 } });
    expect(newlyEarnedAchievements(s2)).toContain('first-round');
  });

  it('looks achievements up by id', () => {
    expect(achievementById('bullseye')?.title).toBe('Bullseye');
    expect(achievementById('nope')).toBeUndefined();
  });
});
