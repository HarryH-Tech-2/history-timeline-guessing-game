/** Local hour (24h) the Daily reminder fires: 8am, so the fresh Daily lands
 * with the morning phone check. */
export const REMINDER_HOUR = 8;

/** Mornings queued ahead, so a player who stays away is nudged for a week, not once. */
export const REMINDER_DAYS = 7;

/**
 * When the next Daily reminder should fire. The queue is re-derived on every
 * app open and every Daily completion, so it never fires on a day already
 * played.
 */
export function nextReminderAt({ now, playedToday }: { now: Date; playedToday: boolean }): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), REMINDER_HOUR, 0, 0, 0);
  if (!playedToday && now.getTime() < today.getTime()) return today;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, REMINDER_HOUR, 0, 0, 0);
}

/** The next {@link REMINDER_DAYS} reminder times: {@link nextReminderAt}, then each morning after. */
export function reminderDates({ now, playedToday }: { now: Date; playedToday: boolean }): Date[] {
  const first = nextReminderAt({ now, playedToday });
  return Array.from(
    { length: REMINDER_DAYS },
    (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i, REMINDER_HOUR, 0, 0, 0),
  );
}
