import { dateKey, weekKey, weekKeyForDay } from './date';

describe('weekKey', () => {
  it('uses ISO weeks, Monday to Sunday', () => {
    expect(weekKey(new Date(2026, 8, 26))).toBe('2026-W39'); // Saturday
    expect(weekKey(new Date(2026, 8, 27))).toBe('2026-W39'); // Sunday, same week
    expect(weekKey(new Date(2026, 8, 28))).toBe('2026-W40'); // Monday, new week
  });

  it('assigns the days around New Year to the right ISO year', () => {
    expect(weekKey(new Date(2026, 0, 1))).toBe('2026-W01'); // Thursday → week 1
    expect(weekKey(new Date(2027, 0, 1))).toBe('2026-W53'); // Friday → still 2026's last week
  });

  it('derives the week from a YYYY-MM-DD day key', () => {
    expect(weekKeyForDay('2026-09-26')).toBe('2026-W39');
    expect(weekKeyForDay(dateKey(new Date(2026, 8, 28)))).toBe('2026-W40');
  });
});
