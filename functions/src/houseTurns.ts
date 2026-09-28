/**
 * When a house player takes their turn, and what it writes.
 *
 * The app ranks the Today and Week boards by each player's own calendar day,
 * so at any moment the world is on two different days (and, around Sunday
 * night, two different weeks). Stamping every house row with one zone's day
 * left the boards empty for anyone west of it. Each house row therefore lives
 * in a home zone and plays on its own clock, the way real players do.
 */

/** Home zones, repeated by weight: most players are in the UK and Europe. */
export const HOUSE_ZONES = [
  'Europe/London',
  'Europe/London',
  'Europe/London',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Berlin',
  'America/New_York',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Bogota',
  'Africa/Lagos',
  'Asia/Kolkata',
  'Australia/Sydney',
] as const;

/**
 * Latest local hour by which a house player has had their turn. Early, so a
 * board is already busy by the time most real players open it in the morning.
 */
const LAST_TURN_HOUR = 6;

/** Small deterministic hash in [0, 1) so the same seed always rolls the same way. */
export function roll(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** Local calendar day (YYYY-MM-DD) and hour in the given IANA zone. */
export function localClock(date: Date, timeZone: string): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

/** ISO week as YYYY-Www for a YYYY-MM-DD day key. */
export function weekKeyForDay(day: string): string {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dow);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${`${week}`.padStart(2, '0')}`;
}

/**
 * Score for eight Daily rounds, matched to what real players score (median
 * about 3,500, best just under 6,000). Keep in step with the app's
 * src/features/leaderboard/houseRows.ts.
 */
export function dailyScoreFor(skill: number, r: number): number {
  const score = Math.round((1500 + skill * 3900 + (r - 0.5) * 600) / 10) * 10;
  return Math.min(5600, Math.max(1200, score));
}

export function homeZone(id: string): string {
  return HOUSE_ZONES[Math.floor(roll(`${id}:zone`) * HOUSE_ZONES.length)] ?? 'Europe/London';
}

/** The fields of a house row this job reads. */
export interface HouseFields {
  xp?: unknown;
  weekKey?: unknown;
  weekXp?: unknown;
  /** The local day this row last took its turn on. */
  houseDay?: unknown;
}

export interface HouseTurn {
  xp: number;
  weekKey: string;
  weekXp: number;
  houseDay: string;
  updatedAt: number;
  dailyDate?: string;
  dailyScore?: number;
}

/**
 * What to write for one house row right now, or null when it is not its turn:
 * it has already gone today, or its hour has not come round yet. `skill` is
 * 0…1, higher for stronger rows.
 */
export function houseTurn(
  id: string,
  fields: HouseFields,
  skill: number,
  now: Date,
): HouseTurn | null {
  const { day, hour } = localClock(now, homeZone(id));
  if (fields.houseDay === day) return null;
  const turnHour = Math.floor(roll(`${id}:${day}:hour`) * (LAST_TURN_HOUR + 1));
  if (hour < turnHour) return null;

  const r = roll(`${id}:${day}`);
  const playsToday = r < 0.55;
  const week = weekKeyForDay(day);
  // Weekly XP accumulates through the week and resets on Monday.
  const priorWeek = fields.weekKey === week ? Number(fields.weekXp) || 0 : 0;
  const gain = playsToday ? Math.round(40 + r * 260) : 0;
  const turn: HouseTurn = {
    xp: (Number(fields.xp) || 0) + gain,
    weekKey: week,
    weekXp: priorWeek + gain,
    houseDay: day,
    updatedAt: now.getTime(),
  };
  if (playsToday) {
    turn.dailyDate = day;
    turn.dailyScore = dailyScoreFor(skill, r);
  }
  return turn;
}
