import {
  masteryTier,
  acquireThreshold,
  isAcquiringGuess,
} from './collection';
import {
  activeStreakCount,
  applyDailyCompletion,
  INITIAL_STREAK,
  previousDateKey,
  streakMultiplier,
  type StreakState,
} from './streak';

describe('previousDateKey', () => {
  it('steps back within a month', () => {
    expect(previousDateKey('2026-08-23')).toBe('2026-08-22');
  });

  it('crosses month and year boundaries', () => {
    expect(previousDateKey('2026-08-01')).toBe('2026-07-31');
    expect(previousDateKey('2026-03-01')).toBe('2026-02-28');
    expect(previousDateKey('2024-03-01')).toBe('2024-02-29');
    expect(previousDateKey('2026-01-01')).toBe('2025-12-31');
  });
});

describe('streakMultiplier', () => {
  it('tiers by streak length', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(2)).toBe(1);
    expect(streakMultiplier(3)).toBe(1.1);
    expect(streakMultiplier(6)).toBe(1.1);
    expect(streakMultiplier(7)).toBe(1.25);
    expect(streakMultiplier(13)).toBe(1.25);
    expect(streakMultiplier(14)).toBe(1.5);
    expect(streakMultiplier(100)).toBe(1.5);
  });
});

describe('activeStreakCount', () => {
  const streak: StreakState = { count: 5, lastDate: '2026-08-22', freezes: 0 };

  it('counts a streak last fed today or yesterday', () => {
    expect(activeStreakCount(streak, '2026-08-22')).toBe(5);
    expect(activeStreakCount(streak, '2026-08-23')).toBe(5);
  });

  it('reads 0 once the streak has lapsed', () => {
    expect(activeStreakCount(streak, '2026-08-24')).toBe(0);
    expect(activeStreakCount(INITIAL_STREAK, '2026-08-23')).toBe(0);
  });
});

describe('applyDailyCompletion', () => {
  it('starts a streak at 1', () => {
    const { streak, extended } = applyDailyCompletion(INITIAL_STREAK, '2026-08-23');
    expect(streak).toEqual({ count: 1, lastDate: '2026-08-23', freezes: 0 });
    expect(extended).toBe(true);
  });

  it('extends on consecutive days and is idempotent within a day', () => {
    const day1 = applyDailyCompletion(INITIAL_STREAK, '2026-08-22').streak;
    const day2 = applyDailyCompletion(day1, '2026-08-23');
    expect(day2.streak.count).toBe(2);

    const repeat = applyDailyCompletion(day2.streak, '2026-08-23');
    expect(repeat.streak).toBe(day2.streak);
    expect(repeat.extended).toBe(false);
  });

  it('bridges exactly one missed day with a freeze', () => {
    const held: StreakState = { count: 6, lastDate: '2026-08-21', freezes: 1 };
    const { streak, usedFreeze } = applyDailyCompletion(held, '2026-08-23');
    expect(usedFreeze).toBe(true);
    expect(streak).toEqual({ count: 7, lastDate: '2026-08-23', freezes: 0 });
  });

  it('resets after a missed day without a freeze, or a longer gap', () => {
    const noFreeze: StreakState = { count: 6, lastDate: '2026-08-21', freezes: 0 };
    expect(applyDailyCompletion(noFreeze, '2026-08-23').streak.count).toBe(1);

    const longGap: StreakState = { count: 6, lastDate: '2026-08-10', freezes: 2 };
    const after = applyDailyCompletion(longGap, '2026-08-23');
    expect(after.streak.count).toBe(1);
    // A freeze only bridges a single missed day — none is consumed here.
    expect(after.streak.freezes).toBe(2);
  });
});

describe('collection', () => {
  it('thresholds scale with difficulty', () => {
    expect(acquireThreshold('easy')).toBeLessThan(acquireThreshold('medium'));
    expect(acquireThreshold('medium')).toBeLessThan(acquireThreshold('hard'));
    expect(acquireThreshold('hard')).toBeLessThan(acquireThreshold('expert'));
    expect(isAcquiringGuess(10, 'medium')).toBe(true);
    expect(isAcquiringGuess(11, 'medium')).toBe(false);
  });

  it('tiers mastery by acquired fraction', () => {
    expect(masteryTier(0, 30)).toBeNull();
    expect(masteryTier(9, 30)).toBeNull();
    expect(masteryTier(10, 30)).toBe('bronze');
    expect(masteryTier(19, 30)).toBe('bronze');
    expect(masteryTier(20, 30)).toBe('silver');
    expect(masteryTier(29, 30)).toBe('silver');
    expect(masteryTier(30, 30)).toBe('gold');
    expect(masteryTier(0, 0)).toBeNull();
  });
});
