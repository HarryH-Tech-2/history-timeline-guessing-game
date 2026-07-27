import type { RoundResult } from './round';
import {
  BASE_XP_PER_LEVEL,
  coinsForRound,
  levelForXp,
  levelProgress,
  PERFECT_XP_BONUS,
  rewardForRound,
  xpForRound,
  xpToReachLevel,
} from './progression';

function roundResult(errorYears: number, total: number): RoundResult {
  return {
    question: { year: 2000 } as RoundResult['question'],
    guessYear: 2000 - errorYears,
    errorYears,
    score: { base: total, comboMultiplier: 1, streakBonus: 0, total },
    isPerfect: errorYears === 0,
  };
}

describe('level curve', () => {
  it('reaches levels on the triangular XP schedule', () => {
    expect(xpToReachLevel(1)).toBe(0);
    expect(xpToReachLevel(2)).toBe(BASE_XP_PER_LEVEL);
    expect(xpToReachLevel(3)).toBe(BASE_XP_PER_LEVEL * 3);
    expect(xpToReachLevel(4)).toBe(BASE_XP_PER_LEVEL * 6);
  });

  it('maps XP back to the correct level', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(BASE_XP_PER_LEVEL - 1)).toBe(1);
    expect(levelForXp(BASE_XP_PER_LEVEL)).toBe(2);
    expect(levelForXp(BASE_XP_PER_LEVEL * 3)).toBe(3);
    expect(levelForXp(-100)).toBe(1);
  });

  it('reports progress within the current level', () => {
    const p = levelProgress(BASE_XP_PER_LEVEL + 250);
    expect(p.level).toBe(2);
    expect(p.xpIntoLevel).toBe(250);
    expect(p.xpForNextLevel).toBe(xpToReachLevel(3) - xpToReachLevel(2));
    expect(p.fraction).toBeCloseTo(250 / p.xpForNextLevel);
  });
});

describe('round rewards', () => {
  it('gives a tenth of the score as XP plus a perfect bonus', () => {
    expect(xpForRound(roundResult(50, 150))).toBe(15);
    expect(xpForRound(roundResult(0, 1000))).toBe(100 + PERFECT_XP_BONUS);
  });

  it('tiers coins by accuracy', () => {
    expect(coinsForRound(roundResult(0, 1000))).toBe(10);
    expect(coinsForRound(roundResult(2, 900))).toBe(5);
    expect(coinsForRound(roundResult(10, 650))).toBe(3);
    expect(coinsForRound(roundResult(20, 450))).toBe(1);
    expect(coinsForRound(roundResult(40, 200))).toBe(0);
  });

  it('bundles xp and coins together', () => {
    expect(rewardForRound(roundResult(0, 1000))).toEqual({ xp: 150, coins: 10 });
  });
});
