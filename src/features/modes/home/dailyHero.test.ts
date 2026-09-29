import { INITIAL_STREAK } from '@/domain';

import { dailyHeroStatus } from './dailyHero';

const TODAY = '2026-09-21';

describe('dailyHeroStatus', () => {
  it('invites a player who has not played today, with no streak to protect', () => {
    const status = dailyHeroStatus({
      streak: INITIAL_STREAK,
      today: TODAY,
      now: new Date(2026, 8, 21, 9, 0),
    });
    expect(status).toEqual({ done: false, streak: 0 });
  });

  it('shows a live streak from yesterday as one to keep alive', () => {
    const status = dailyHeroStatus({
      streak: { count: 3, lastDate: '2026-09-20', freezes: 0 },
      today: TODAY,
      now: new Date(2026, 8, 21, 9, 0),
    });
    expect(status).toEqual({ done: false, streak: 3 });
  });

  it('marks today done and counts down to the next Daily at local midnight', () => {
    const status = dailyHeroStatus({
      streak: { count: 4, lastDate: TODAY, freezes: 0 },
      today: TODAY,
      now: new Date(2026, 8, 21, 17, 30),
    });
    expect(status).toEqual({ done: true, streak: 4, nextIn: '6h 30m' });
  });

  it('shows whole hours without a zero-minute tail', () => {
    const status = dailyHeroStatus({
      streak: { count: 2, lastDate: TODAY, freezes: 0 },
      today: TODAY,
      now: new Date(2026, 8, 21, 21, 0),
    });
    expect(status.nextIn).toBe('3h');
  });

  it('drops the hours in the last hour and never says zero minutes', () => {
    const status = dailyHeroStatus({
      streak: { count: 1, lastDate: TODAY, freezes: 0 },
      today: TODAY,
      now: new Date(2026, 8, 21, 23, 59, 30),
    });
    expect(status).toEqual({ done: true, streak: 1, nextIn: '1m' });
  });
});
