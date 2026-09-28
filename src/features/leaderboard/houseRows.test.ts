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
      else {
        expect(r.dailyScore).toBeGreaterThanOrEqual(1200);
        expect(r.dailyScore).toBeLessThanOrEqual(5600);
      }
      if (r.weekKey === '') expect(r.weekXp).toBe(0);
    }
  });

  it('tops up without re-rolling the first rows or repeating a name', () => {
    const first = houseRows(opts);
    const taken = new Set(first.map((r) => r.displayName));
    const more = houseRows({ ...opts, count: 80, offset: 40, taken });

    expect(houseRows(opts)).toEqual(first);
    expect(more).toHaveLength(80);
    const names = more.map((r) => r.displayName);
    expect(new Set(names).size).toBe(80);
    for (const name of names) {
      expect(taken.has(name)).toBe(false);
      expect(name.length).toBeLessThanOrEqual(MAX_DISPLAY_NAME);
    }
    for (const r of more) expect(r.xp).toBeLessThanOrEqual(6000 * 1.15);
  });

  it('scores the Daily like real players do: middling on the whole, not all high', () => {
    const scores = houseRows({ ...opts, count: 120 })
      .filter((r) => r.dailyDate !== '')
      .map((r) => r.dailyScore)
      .sort((a, b) => a - b);
    const median = scores[Math.floor(scores.length / 2)]!;
    expect(median).toBeGreaterThan(3000);
    expect(median).toBeLessThan(4000);
    expect(scores[0]).toBeLessThan(2200);
  });
});
