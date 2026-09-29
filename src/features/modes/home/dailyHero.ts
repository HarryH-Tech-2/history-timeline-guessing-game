import { activeStreakCount, type StreakState } from '@/domain';

export interface DailyHeroStatus {
  /** Today's Daily has been finished. */
  done: boolean;
  /** The streak the player is on (or would extend by playing today). */
  streak: number;
  /** "6h 30m" until the next Daily unlocks at local midnight; only when done. */
  nextIn?: string;
}

const MINUTE_MS = 60 * 1000;

/** Minutes rounded up so the label never reads "0m" before the Daily flips. */
function formatUntil(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/**
 * What the home hero card says about today's Daily, derived from the
 * progression streak alone: `recordDailyCompleted` stamps `lastDate` with the
 * day key, so "played today" needs no extra store read.
 */
export function dailyHeroStatus({
  streak,
  today,
  now,
}: {
  streak: StreakState;
  today: string;
  now: Date;
}): DailyHeroStatus {
  const live = activeStreakCount(streak, today);
  if (streak.lastDate !== today) return { done: false, streak: live };
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { done: true, streak: live, nextIn: formatUntil(midnight.getTime() - now.getTime()) };
}
