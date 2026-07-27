import { INITIAL_PROGRESSION, type RoundResult } from '@/domain';

import { applyGameComplete, applyRound, spendCoins } from './reducer';

function roundResult(errorYears: number, total: number): RoundResult {
  return {
    question: { year: 2000 } as RoundResult['question'],
    guessYear: 2000 - errorYears,
    errorYears,
    score: { base: total, comboMultiplier: 1, streakBonus: 0, total },
    isPerfect: errorYears === 0,
  };
}

describe('applyRound', () => {
  it('banks rewards and bumps counters', () => {
    const { state, reward } = applyRound(INITIAL_PROGRESSION, roundResult(0, 1000), 1);
    expect(reward).toEqual({ xp: 150, coins: 10 });
    expect(state.xp).toBe(150);
    expect(state.coins).toBe(10);
    expect(state.stats.rounds).toBe(1);
    expect(state.stats.perfectRounds).toBe(1);
    expect(state.stats.bestStreak).toBe(1);
  });

  it('keeps the highest streak ever seen', () => {
    const after4 = applyRound(INITIAL_PROGRESSION, roundResult(5, 800), 4).state;
    const after2 = applyRound(after4, roundResult(5, 800), 2).state;
    expect(after2.stats.bestStreak).toBe(4);
  });

  it('unlocks newly earned achievements once', () => {
    const first = applyRound(INITIAL_PROGRESSION, roundResult(0, 1000), 1);
    expect(first.unlocked).toEqual(expect.arrayContaining(['first-round', 'bullseye']));
    const second = applyRound(first.state, roundResult(0, 1000), 1);
    // Already unlocked — not reported again.
    expect(second.unlocked).not.toContain('first-round');
  });
});

describe('applyGameComplete', () => {
  it('increments games played', () => {
    const { state } = applyGameComplete(INITIAL_PROGRESSION);
    expect(state.stats.gamesPlayed).toBe(1);
  });
});

describe('spendCoins', () => {
  it('deducts when affordable', () => {
    const rich = { ...INITIAL_PROGRESSION, coins: 30 };
    const { state, ok } = spendCoins(rich, 25);
    expect(ok).toBe(true);
    expect(state.coins).toBe(5);
  });

  it('refuses when too poor or non-positive', () => {
    const poor = { ...INITIAL_PROGRESSION, coins: 5 };
    expect(spendCoins(poor, 10).ok).toBe(false);
    expect(spendCoins(poor, 0).ok).toBe(false);
    expect(spendCoins(poor, 10).state).toBe(poor);
  });
});
