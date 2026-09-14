import { prettyDate, type ShareCardData } from '../share';
import type { DailyRecord } from '../persistence';

/** The calendar day of Daily #1. Every later day counts up from here. */
export const DAILY_EPOCH = '2026-09-01';

function dayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  // UTC so DST changes can never make a day 23 or 25 hours long.
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Sequential puzzle number for a `YYYY-MM-DD` key: the epoch day is #1. */
export function dailyNumber(dateKey: string): number {
  return dayIndex(dateKey) - dayIndex(DAILY_EPOCH) + 1;
}

/** The share card for a banked Daily: numbered like a Wordle puzzle. */
export function dailyShareData(record: DailyRecord): ShareCardData {
  return {
    heading: `Daily #${dailyNumber(record.date)}`,
    subheading: prettyDate(record.date),
    totalScore: record.totalScore,
    rounds: record.rounds,
  };
}
