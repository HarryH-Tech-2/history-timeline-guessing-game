import type { DailyRecord } from '../persistence';
import { DAILY_EPOCH, dailyNumber, dailyShareData } from './shareCard';

describe('dailyNumber', () => {
  it('starts at #1 on the epoch day and counts up by calendar day', () => {
    expect(dailyNumber(DAILY_EPOCH)).toBe(1);
    expect(dailyNumber('2026-09-02')).toBe(2);
    expect(dailyNumber('2026-10-01')).toBe(31);
    expect(dailyNumber('2027-09-01')).toBe(366);
  });
});

describe('dailyShareData', () => {
  it('numbers and dates the card and passes the rounds through', () => {
    const record: DailyRecord = {
      date: '2026-09-03',
      totalScore: 4321,
      perfectCount: 2,
      rounds: [{ questionId: 'a', errorYears: 0, score: 1000, guessYear: 1066 }],
    };
    expect(dailyShareData(record)).toEqual({
      heading: 'Daily #3',
      subheading: '3 Sep 2026',
      totalScore: 4321,
      rounds: record.rounds,
    });
  });
});
