import { MAX_DISPLAY_NAME, MIN_LEADERBOARD_XP } from './types';
import { houseRows } from './houseRows';

const opts = { count: 40, maxXp: 6000, today: '2026-09-26', week: '2026-W39', now: 1_000_000 };

describe('houseRows', () => {
  it('is deterministic and sorted by XP descending', () => {
    const a = houseRows(opts);
    const b = houseRows(opts);
    expect(a).toEqual(b);
    for (let i = 1; i < a.length; i++) expect(a[i - 1]!.xp).toBeGreaterThanOrEqual(a[i]!.xp);
  });

  it('stays under the XP cap, above the publish gate, and marked as house rows', () => {
    const rows = houseRows(opts);
    expect(rows).toHaveLength(40);
    for (const r of rows) {
      expect(r.house).toBe(true);
      expect(r.xp).toBeLessThanOrEqual(6000 * 1.15);
      expect(r.xp).toBeGreaterThanOrEqual(MIN_LEADERBOARD_XP);
      expect(r.displayName.length).toBeLessThanOrEqual(MAX_DISPLAY_NAME);
      expect(r.displayName.length).toBeGreaterThan(0);
    }
  });

  it('stamps only some rows for today and this week, with consistent keys', () => {
    const rows = houseRows(opts);
    const today = rows.filter((r) => r.dailyDate === '2026-09-26');
    const week = rows.filter((r) => r.weekKey === '2026-W39');
    expect(today.length).toBeGreaterThan(5);
    expect(today.length).toBeLessThan(40);
    expect(week.length).toBeGreaterThanOrEqual(today.length);
    for (const r of rows) {
      if (r.dailyDate === '') expect(r.dailyScore).toBe(0);
      else expect(r.dailyScore).toBeGreaterThan(2000);
      if (r.weekKey === '') expect(r.weekXp).toBe(0);
    }
  });
});
