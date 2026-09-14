import type { RoundResult } from '@/domain';
import { palette } from '@/theme/tokens';

/** Store link appended to every share so the card doubles as an invite. */
export const STORE_URL =
  'https://play.google.com/store/apps/details?id=com.harryhh.historydateguesser';

/** One round as it appears on a share card. Spoiler-light: ids, not titles. */
export interface ShareRound {
  questionId: string;
  errorYears: number;
  score: number;
  /** Absent on Daily records saved by builds before guesses were recorded. */
  guessYear?: number;
}

/**
 * Everything a share card needs, whichever mode produced it. `heading` names
 * the run ("Daily #12", "Survival · 9 rounds", "Battles complete") and
 * `subheading` dates or qualifies it.
 */
export interface ShareCardData {
  heading: string;
  subheading: string;
  totalScore: number;
  rounds: readonly ShareRound[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-09-03` → `3 Sep 2026`. */
export function prettyDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Card data for a run played through the live session (every mode but Daily). */
export function shareDataFromResults(
  heading: string,
  subheading: string,
  results: readonly RoundResult[],
): ShareCardData {
  return {
    heading,
    subheading,
    totalScore: results.reduce((sum, r) => sum + r.score.total, 0),
    rounds: results.map((r) => ({
      questionId: r.question.id,
      errorYears: r.errorYears,
      score: r.score.total,
      guessYear: r.guessYear,
    })),
  };
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

/** Score, exact count and average miss for a card — shared by both formats. */
export function summariseRounds(data: ShareCardData): {
  totalScore: number;
  exact: number;
  rounds: number;
  avgError: number;
} {
  const rounds = data.rounds;
  const avgError =
    rounds.length === 0
      ? 0
      : Math.round(rounds.reduce((sum, r) => sum + r.errorYears, 0) / rounds.length);
  return {
    totalScore: data.totalScore,
    exact: rounds.filter((r) => r.errorYears === 0).length,
    rounds: rounds.length,
    avgError,
  };
}

/** The one-line stats summary, e.g. "4,321 pts · 2/8 exact · avg 29 yrs off". */
export function summaryLine(data: ShareCardData): string {
  const { totalScore, exact, rounds, avgError } = summariseRounds(data);
  return [
    `${totalScore.toLocaleString()} pts`,
    `${exact}/${rounds} exact`,
    `avg ${pluralYears(avgError)} off`,
  ].join(' · ');
}

/**
 * The Wordle-style text card: title with the run's heading, an emoji row that
 * spoils nothing, a one-line score summary, and the store link. Only used
 * when the image card cannot be captured or shared.
 */
export function buildShareMessage(data: ShareCardData): string {
  const tiles = data.rounds.map((r) => tileForError(r.errorYears)).join('');
  return [`📜 Date Guesser · ${data.heading}`, tiles, summaryLine(data), STORE_URL].join('\n');
}
