import { INITIAL_PROGRESSION, STREAK_FREEZE_COST, type RoundResult } from '@/domain';

import {
  applyDailyComplete,
  applyGameComplete,
  applyRound,
  buyStreakFreeze,
  spendCoins,
} from './reducer';

const TODAY = '2026-08-23';
const YESTERDAY = '2026-08-22';

function roundResult(errorYears: number, total: number): RoundResult {
  return {
    question: {
      id: 'q-test',
      difficulty: 'medium',
      year: 2000,
    } as RoundResult['question'],
    guessYear: 2000 - errorYears,
    errorYears,
    score: { base: total, comboMultiplier: 1, streakBonus: 0, total },
    isPerfect: errorYears === 0,
  };
}

describe('applyRound', () => {
  it('banks rewards and bumps counters', () => {
    const { state, reward } = applyRound(INITIAL_PROGRESSION, roundResult(0, 1000), 1, TODAY);
    expect(reward).toEqual({ xp: 150, coins: 10 });
    expect(state.xp).toBe(150);
    expect(state.coins).toBe(10);
    expect(state.stats.rounds).toBe(1);
    expect(state.stats.perfectRounds).toBe(1);
    expect(state.stats.bestStreak).toBe(1);
  });

  it('keeps the highest streak ever seen', () => {
    const after4 = applyRound(INITIAL_PROGRESSION, roundResult(5, 800), 4, TODAY).state;
    const after2 = applyRound(after4, roundResult(5, 800), 2, TODAY).state;
    expect(after2.stats.bestStreak).toBe(4);
  });

  it('unlocks newly earned achievements once', () => {
    const first = applyRound(INITIAL_PROGRESSION, roundResult(0, 1000), 1, TODAY);
    expect(first.unlocked).toEqual(expect.arrayContaining(['first-round', 'bullseye']));
    const second = applyRound(first.state, roundResult(0, 1000), 1, TODAY);
    // Already unlocked — not reported again.
    expect(second.unlocked).not.toContain('first-round');
  });

  it('multiplies XP while a Daily streak is live', () => {
    const streaky = {
      ...INITIAL_PROGRESSION,
      streak: { count: 7, lastDate: YESTERDAY, freezes: 0 },
    };
    const { reward } = applyRound(streaky, roundResult(0, 1000), 1, TODAY);
    // 150 base XP × 1.25 for a 7-day streak.
    expect(reward.xp).toBe(188);
    expect(reward.coins).toBe(10);
  });

  it('does not multiply XP once the streak has lapsed', () => {
    const lapsed = {
      ...INITIAL_PROGRESSION,
      streak: { count: 7, lastDate: '2026-08-01', freezes: 0 },
    };
    const { reward } = applyRound(lapsed, roundResult(0, 1000), 1, TODAY);
    expect(reward.xp).toBe(150);
  });

  it('acquires the artefact when the guess is inside the threshold', () => {
    // Medium threshold is 10 years.
    const close = applyRound(INITIAL_PROGRESSION, roundResult(10, 500), 1, TODAY);
    expect(close.acquired).toBe(true);
    expect(close.state.collection['q-test']).toBe(10);

    const far = applyRound(INITIAL_PROGRESSION, roundResult(11, 500), 1, TODAY);
    expect(far.acquired).toBe(false);
    expect(far.state.collection['q-test']).toBeUndefined();
  });

  it('reports acquisition once but keeps improving the best error', () => {
    const first = applyRound(INITIAL_PROGRESSION, roundResult(8, 500), 1, TODAY);
    expect(first.acquired).toBe(true);
    const again = applyRound(first.state, roundResult(3, 500), 1, TODAY);
    expect(again.acquired).toBe(false);
    expect(again.state.collection['q-test']).toBe(3);
    const worse = applyRound(again.state, roundResult(9, 500), 1, TODAY);
    expect(worse.state.collection['q-test']).toBe(3);
  });
});

describe('applyDailyComplete', () => {
  it('starts, extends and never double-counts a day', () => {
    const started = applyDailyComplete(INITIAL_PROGRESSION, YESTERDAY);
    expect(started.count).toBe(1);
    expect(started.extended).toBe(true);

    const extended = applyDailyComplete(started.state, TODAY);
    expect(extended.count).toBe(2);
    expect(extended.state.stats.bestDailyStreak).toBe(2);

    const repeat = applyDailyComplete(extended.state, TODAY);
    expect(repeat.count).toBe(2);
    expect(repeat.extended).toBe(false);
  });

  it('reports the multiplier now in force', () => {
    const base = {
      ...INITIAL_PROGRESSION,
      streak: { count: 2, lastDate: YESTERDAY, freezes: 0 },
    };
    const outcome = applyDailyComplete(base, TODAY);
    expect(outcome.count).toBe(3);
    expect(outcome.multiplier).toBe(1.1);
  });
});

describe('applyGameComplete', () => {
  it('increments games played', () => {
    const { state } = applyGameComplete(INITIAL_PROGRESSION);
    expect(state.stats.gamesPlayed).toBe(1);
  });
});

describe('buyStreakFreeze', () => {
  it('spends coins and adds a freeze', () => {
    const rich = { ...INITIAL_PROGRESSION, coins: STREAK_FREEZE_COST };
    const { state, ok } = buyStreakFreeze(rich);
    expect(ok).toBe(true);
    expect(state.coins).toBe(0);
    expect(state.streak.freezes).toBe(1);
  });

  it('refuses when broke or at the cap', () => {
    const poor = { ...INITIAL_PROGRESSION, coins: STREAK_FREEZE_COST - 1 };
    expect(buyStreakFreeze(poor).ok).toBe(false);

    const capped = {
      ...INITIAL_PROGRESSION,
      coins: 1000,
      streak: { count: 0, lastDate: null, freezes: 2 },
    };
    expect(buyStreakFreeze(capped).ok).toBe(false);
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
