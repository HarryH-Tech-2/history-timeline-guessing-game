import { INITIAL_PROGRESSION } from '@/domain';

import { boardValue, movementFor, myBoardValue, ranksOf } from './boards';

const ctx = { today: '2026-09-26', week: '2026-W39' };

describe('boardValue', () => {
  const row = {
    xp: 1200,
    weekKey: '2026-W39',
    weekXp: 300,
    dailyDate: '2026-09-26',
    dailyScore: 4100,
  };

  it('ranks all-time by XP, this week by weekly XP, today by Daily score', () => {
    expect(boardValue(row, 'all', ctx)).toBe(1200);
    expect(boardValue(row, 'week', ctx)).toBe(300);
    expect(boardValue(row, 'today', ctx)).toBe(4100);
  });

  it('drops a row from a scoped board when its keys are stale or missing', () => {
    expect(boardValue({ ...row, weekKey: '2026-W38' }, 'week', ctx)).toBeNull();
    expect(boardValue({ ...row, dailyDate: '2026-09-25' }, 'today', ctx)).toBeNull();
    expect(boardValue({ xp: 50 }, 'week', ctx)).toBeNull();
    expect(boardValue({ xp: 50 }, 'today', ctx)).toBeNull();
    expect(boardValue({ xp: 50 }, 'all', ctx)).toBe(50);
  });

  it('reads the player’s own standing from progression state', () => {
    const state = {
      ...INITIAL_PROGRESSION,
      xp: 900,
      weekly: { key: '2026-W39', xp: 120 },
      lastDaily: { date: '2026-09-26', score: 3000 },
    };
    expect(myBoardValue(state, 'all', ctx)).toBe(900);
    expect(myBoardValue(state, 'week', ctx)).toBe(120);
    expect(myBoardValue(state, 'today', ctx)).toBe(3000);
    expect(myBoardValue({ ...state, lastDaily: null }, 'today', ctx)).toBeNull();
  });
});

describe('movement', () => {
  it('maps a ranking to uid → rank with an offset', () => {
    expect(ranksOf([{ uid: 'a' }, { uid: 'b' }], 4)).toEqual({ a: 4, b: 5 });
  });

  it('reports places gained as positive and lost as negative', () => {
    const previous = { a: 5, b: 2 };
    expect(movementFor(previous, 'a', 3)).toBe(2);
    expect(movementFor(previous, 'b', 4)).toBe(-2);
    expect(movementFor(previous, 'b', 2)).toBe(0);
    expect(movementFor(previous, 'new', 1)).toBeNull();
    expect(movementFor(undefined, 'a', 1)).toBeNull();
  });
});
