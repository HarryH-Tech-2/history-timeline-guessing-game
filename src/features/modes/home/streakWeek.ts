import { activeStreakCount, type StreakState } from '@/domain';
import { t } from '@/i18n';
import { dateKey } from '@/utils/date';

export interface StreakDay {
  /** Weekday initial, e.g. "M". */
  label: string;
  /** Part of the live streak. */
  lit: boolean;
  isToday: boolean;
}

/**
 * The last seven days (oldest first, today last) with the live streak lit.
 * Only the streak count is stored, not a play history, so the lit run is the
 * `count` days ending on `lastDate` — today once played, else yesterday.
 */
export function streakWeek(streak: StreakState, now: Date): StreakDay[] {
  const today = dateKey(now);
  const live = activeStreakCount(streak, today);
  // Days back from today to the newest lit day: 0 once today is played.
  const offset = streak.lastDate === today ? 0 : 1;
  // Sunday first, like Date.getDay().
  const initials = t('home.streakSheet.weekdays').split(',');

  return Array.from({ length: 7 }, (_, i) => {
    const daysAgo = 6 - i;
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    return {
      label: initials[day.getDay()] ?? '',
      lit: live > 0 && daysAgo >= offset && daysAgo < offset + live,
      isToday: daysAgo === 0,
    };
  });
}
