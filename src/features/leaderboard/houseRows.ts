// Relative imports on purpose: scripts/seedGhostLeaderboard.ts runs this under
// tsx, which does not resolve the app's `@/` alias.
import { levelForXp } from '../../domain/progression';

/** Document-id prefix for house rows, so they can be recognised and purged. */
export const HOUSE_PREFIX = 'house-';

/** A leaderboard row as the house seeds it: the write shape plus a marker. */
export interface HouseRow {
  displayName: string;
  xp: number;
  level: number;
  updatedAt: number;
  weekKey: string;
  weekXp: number;
  dailyDate: string;
  dailyScore: number;
  /** Always true; how the purge and any future filter find these rows. */
  house: true;
}

/** Player-style names in the app's own idiom, none of them real accounts. */
const FIRST = [
  'Ada', 'Bram', 'Cleo', 'Dario', 'Elif', 'Femi', 'Greta', 'Hugo', 'Ines', 'Jonas',
  'Kaia', 'Leon', 'Mira', 'Nico', 'Orla', 'Pavel', 'Quinn', 'Rosa', 'Sven', 'Tala',
  'Ugo', 'Vera', 'Wren', 'Ximena', 'Yusuf', 'Zora', 'Anouk', 'Bea', 'Casper', 'Dov',
];
const SUFFIX = ['', '', '', '_history', '99', '.k', '_', 'H', '22', 'xo', '_reads', '07'];

/** Tiny deterministic PRNG (mulberry32) so the same index always rolls the same way. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Score for eight Daily rounds: strong players land high, most in the middle. */
export function dailyScoreFor(rank: number, count: number, roll: number): number {
  const skill = 1 - rank / count; // top rows are better
  const base = 2600 + skill * 3200; // 2,600 … 5,800
  return Math.round((base + (roll - 0.5) * 900) / 10) * 10;
}

export interface HouseOptions {
  count: number;
  /** Highest XP a house row may have; keeps them under the real leaders. */
  maxXp: number;
  today: string;
  week: string;
  now: number;
}

/**
 * Deterministic set of house rows, ordered by XP descending. Same inputs, same
 * names and numbers, so re-running the seed refreshes stamps rather than
 * reshuffling who is who.
 */
export function houseRows({ count, maxXp, today, week, now }: HouseOptions): HouseRow[] {
  const rows: HouseRow[] = [];
  for (let i = 0; i < count; i++) {
    const next = rng(1000 + i * 7919);
    const roll = next();
    const roll2 = next();
    // Power-law-ish XP: a few high, a long tail. 60 XP floor keeps them above the publish gate.
    const xp = Math.max(60, Math.round(maxXp * Math.pow(1 - i / count, 2.2) * (0.85 + roll * 0.3)));
    const first = FIRST[Math.floor(next() * FIRST.length)] ?? 'Ada';
    const suffix = SUFFIX[Math.floor(next() * SUFFIX.length)] ?? '';
    // Not everyone played this week or today — about two thirds did.
    const playedWeek = roll2 < 0.7;
    const playedToday = playedWeek && roll < 0.6;
    rows.push({
      displayName: `${first}${suffix}`.slice(0, 24),
      xp,
      level: levelForXp(xp),
      updatedAt: now - Math.floor(next() * 6 * 60 * 60 * 1000),
      weekKey: playedWeek ? week : '',
      weekXp: playedWeek ? Math.round(xp * (0.05 + roll2 * 0.12)) : 0,
      dailyDate: playedToday ? today : '',
      dailyScore: playedToday ? dailyScoreFor(i, count, roll2) : 0,
      house: true,
    });
  }
  return rows.sort((a, b) => b.xp - a.xp);
}
