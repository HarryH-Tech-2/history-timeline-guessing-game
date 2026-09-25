/** Local hour (24h) the Daily reminder fires. Early evening: after work and
 * school, before the day is written off. */
export const REMINDER_HOUR = 19;

/**
 * When the next Daily reminder should fire. A single one-shot notification is
 * kept scheduled at a time; it is re-derived on every app open and every
 * Daily completion, so it never fires on a day already played.
 */
export function nextReminderAt({ now, playedToday }: { now: Date; playedToday: boolean }): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), REMINDER_HOUR, 0, 0, 0);
  if (!playedToday && now.getTime() < today.getTime()) return today;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, REMINDER_HOUR, 0, 0, 0);
}
