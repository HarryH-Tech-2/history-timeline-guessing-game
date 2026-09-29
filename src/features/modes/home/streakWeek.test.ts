import { streakWeek } from './streakWeek';

// Monday 21 September 2026.
const TODAY = new Date(2026, 8, 21, 10, 0);

describe('streakWeek', () => {
  it('lays out the seven days ending today, oldest first, with weekday initials', () => {
    const week = streakWeek({ count: 0, lastDate: null, freezes: 0 }, TODAY);
    expect(week.map((d) => d.label)).toEqual(['T', 'W', 'T', 'F', 'S', 'S', 'M']);
    expect(week[6]?.isToday).toBe(true);
    expect(week.some((d) => d.lit)).toBe(false);
  });

  it('lights the streak ending today once the Daily is played', () => {
    const week = streakWeek({ count: 3, lastDate: '2026-09-21', freezes: 0 }, TODAY);
    expect(week.map((d) => d.lit)).toEqual([false, false, false, false, true, true, true]);
  });

  it('lights the streak ending yesterday while today is still open', () => {
    const week = streakWeek({ count: 2, lastDate: '2026-09-20', freezes: 0 }, TODAY);
    expect(week.map((d) => d.lit)).toEqual([false, false, false, false, true, true, false]);
  });

  it('fills the whole week for long streaks', () => {
    const week = streakWeek({ count: 40, lastDate: '2026-09-21', freezes: 0 }, TODAY);
    expect(week.every((d) => d.lit)).toBe(true);
  });

  it('lights nothing for a lapsed streak', () => {
    const week = streakWeek({ count: 9, lastDate: '2026-09-10', freezes: 0 }, TODAY);
    expect(week.some((d) => d.lit)).toBe(false);
  });
});
