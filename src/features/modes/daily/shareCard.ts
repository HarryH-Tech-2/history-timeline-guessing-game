import { palette } from '@/theme/tokens';

import type { DailyRecord } from '../persistence';

/** Store link appended to every share so the card doubles as an invite. */
export const STORE_URL =
  'https://play.google.com/store/apps/details?id=com.harryhh.historydateguesser';

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

/**
 * How a round is graded on the card. The bands follow the scoring curve:
 * exact, within 5 (800+ pts), within 20 (keeps a combo), within 50, under
 * 100, and 100+ (scores nothing).
 */
export type Tier = 'exact' | 'close' | 'near' | 'far' | 'wide' | 'miss';

export function tierForError(errorYears: number): Tier {
  const e = Math.abs(errorYears);
  if (e === 0) return 'exact';
  if (e <= 5) return 'close';
  if (e <= 20) return 'near';
  if (e <= 50) return 'far';
  if (e < 100) return 'wide';
  return 'miss';
}

/** Emoji tile per tier for the pasteable text card. */
const TIER_TILES: Record<Tier, string> = {
  exact: '🎯',
  close: '🟩',
  near: '🟨',
  far: '🟧',
  wide: '🟥',
  miss: '⬛',
};

/** Square colour per tier for the image card — the same greens/yellows as the emoji. */
export const TIER_COLOURS: Record<Tier, string> = {
  exact: palette.accent.default,
  close: palette.success,
  near: '#E4C34A',
  far: '#E58A3C',
  wide: palette.danger,
  miss: '#2C251C',
};

export function tileForError(errorYears: number): string {
  return TIER_TILES[tierForError(errorYears)];
}

function pluralYears(n: number): string {
  return `${n} ${n === 1 ? 'yr' : 'yrs'}`;
}

/** Score, exact count and average miss for a record — shared by both cards. */
export function summariseRecord(record: DailyRecord): {
  totalScore: number;
  exact: number;
  rounds: number;
  avgError: number;
} {
  const rounds = record.rounds;
  const avgError =
    rounds.length === 0
      ? 0
      : Math.round(rounds.reduce((sum, r) => sum + r.errorYears, 0) / rounds.length);
  return {
    totalScore: record.totalScore,
    exact: rounds.filter((r) => r.errorYears === 0).length,
    rounds: rounds.length,
    avgError,
  };
}

/** The one-line stats summary, e.g. "4,321 pts · 2/8 exact · avg 29 yrs off". */
export function summaryLine(record: DailyRecord): string {
  const { totalScore, exact, rounds, avgError } = summariseRecord(record);
  return [
    `${totalScore.toLocaleString()} pts`,
    `${exact}/${rounds} exact`,
    `avg ${pluralYears(avgError)} off`,
  ].join(' · ');
}

/**
 * The Wordle-style text card: title with the puzzle number, an emoji row that
 * spoils nothing, a one-line score summary, and the store link.
 */
export function buildShareMessage(record: DailyRecord): string {
  const tiles = record.rounds.map((r) => tileForError(r.errorYears)).join('');
  return [
    `📜 Date Guesser Daily #${dailyNumber(record.date)}`,
    tiles,
    summaryLine(record),
    STORE_URL,
  ].join('\n');
}
