import { activeStreakCount, type StreakState } from '@/domain';

export interface DailyHeroStatus {
  /** Today's Daily has been finished. */
  done: boolean;
  /** The streak the player is on (or would extend by playing today). */
  streak: number;
  /** Whole hours until the next Daily unlocks at local midnight; only when done. */
  hoursUntilNext?: number;
}

const HOUR_MS = 60 * 60 * 1000;

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
  const hoursUntilNext = Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / HOUR_MS));
  return { done: true, streak: live, hoursUntilNext };
}
