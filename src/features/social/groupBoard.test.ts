import { rankGroup } from './groupBoard';

describe('rankGroup', () => {
  const fallback = (uid: string) => `Player ${uid}`;

  it('ranks by this week’s XP, zeroing stale weeks and missing rows', () => {
    const board = rankGroup(
      ['a', 'b', 'c', 'house-1'],
      [
        { uid: 'a', displayName: 'Ann', weekKey: '2026-W40', weekXp: 120 },
        { uid: 'b', displayName: 'Ben', weekKey: '2026-W39', weekXp: 900 },
        { uid: 'house-1', displayName: 'Ghost', weekKey: '2026-W40', weekXp: 5000 },
      ],
      '2026-W40',
      fallback,
    );
    expect(board.map((m) => [m.name, m.weekXp, m.rank])).toEqual([
      ['Ann', 120, 1],
      ['Ben', 0, 2],
      ['Player c', 0, 2],
    ]);
  });

  it('never crashes on rows from older builds or members with no row at all', () => {
    const board = rankGroup(
      ['a', 'b', 'c'],
      [
        { uid: 'a', displayName: '' }, // no weekKey/weekXp, blank name
        { uid: 'b', displayName: 'Ben', weekKey: '2026-W40' }, // weekXp missing
        { uid: 'zz', displayName: 'Not a member', weekKey: '2026-W40', weekXp: 50 },
      ],
      '2026-W40',
      fallback,
    );
    expect(board.map((m) => [m.uid, m.name, m.weekXp, m.rank])).toEqual([
      ['b', 'Ben', 0, 1],
      ['a', 'Player a', 0, 1],
      ['c', 'Player c', 0, 1],
    ]);
  });

  it('drops house rows even when they are the only members', () => {
    expect(
      rankGroup(['house-9'], [{ uid: 'house-9', displayName: 'H', weekKey: 'w', weekXp: 1 }], 'w', fallback),
    ).toEqual([]);
  });
});
