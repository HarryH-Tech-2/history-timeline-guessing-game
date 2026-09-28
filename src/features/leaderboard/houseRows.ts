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
/**
 * A wider pool for rows added after the first seed. Kept separate so the
 * original rows still roll the names they were seeded with.
 */
const MORE_FIRST = [
  ...FIRST,
  'Arlo', 'Birgit', 'Cyrus', 'Dalia', 'Emeka', 'Freya', 'Goran', 'Hana', 'Idris', 'Juno',
  'Kofi', 'Lucia', 'Mateo', 'Nadia', 'Otto', 'Priya', 'Rafa', 'Signe', 'Tomas', 'Uma',
  'Viktor', 'Willa', 'Xavi', 'Yara', 'Zeno', 'Amara', 'Bodhi', 'Carys', 'Dmitri', 'Esme',
];
const MORE_SUFFIX = [
  ...SUFFIX, '', '', '_dates', '1066', '.b', 'J', '88', '_m', '1789', 'xx', '_past', '42', '.r',
];

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

/**
 * Score for eight Daily rounds, matched to what real players score (Dailies
 * to 2026-09-27: median about 3,500, a quarter under 1,500, best just under
 * 6,000), so a typical real run lands mid-table rather than near the bottom.
 * Keep in step with functions/src/houseTurns.ts.
 */
export function dailyScoreFor(rank: number, count: number, roll: number): number {
  const skill = 1 - rank / count; // top rows are better
  const base = 1500 + skill * 3900; // 1,500 … 5,400
  const score = Math.round((base + (roll - 0.5) * 600) / 10) * 10;
  return Math.min(5600, Math.max(1200, score));
}

export interface HouseOptions {
  count: number;
  /** Highest XP a house row may have; keeps them under the real leaders. */
  maxXp: number;
  today: string;
  week: string;
  now: number;
  /**
   * How many house rows already exist. The new rows roll from the next seeds
   * on, so topping the boards up never re-rolls the rows already there.
   */
  offset?: number;
  /** Names already on the board; no new row repeats one, or another new row. */
  taken?: ReadonlySet<string>;
}

/**
 * Deterministic set of house rows, ordered by XP descending. Same inputs, same
 * names and numbers, so re-running the seed refreshes stamps rather than
 * reshuffling who is who.
 */
export function houseRows({
  count,
  maxXp,
  today,
  week,
  now,
  offset = 0,
  taken,
}: HouseOptions): HouseRow[] {
  const rows: HouseRow[] = [];
  const topUp = offset > 0 || taken !== undefined;
  const firsts = topUp ? MORE_FIRST : FIRST;
  const suffixes = topUp ? MORE_SUFFIX : SUFFIX;
  const used = new Set(taken);
  for (let i = 0; i < count; i++) {
    const next = rng(1000 + (i + offset) * 7919);
    const roll = next();
    const roll2 = next();
    // Power-law-ish XP: a few high, a long tail. 60 XP floor keeps them above the publish gate.
    const xp = Math.max(60, Math.round(maxXp * Math.pow(1 - i / count, 2.2) * (0.85 + roll * 0.3)));
    let first = firsts[Math.floor(next() * firsts.length)] ?? 'Ada';
    let suffix = suffixes[Math.floor(next() * suffixes.length)] ?? '';
    // Two players with the same name is the giveaway: re-roll until it is new.
    for (let tries = 0; topUp && used.has(`${first}${suffix}`) && tries < 50; tries++) {
      first = firsts[Math.floor(next() * firsts.length)] ?? 'Ada';
      suffix = suffixes[Math.floor(next() * suffixes.length)] ?? '';
    }
    used.add(`${first}${suffix}`);
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
