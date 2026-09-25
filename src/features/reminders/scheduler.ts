import * as Notifications from 'expo-notifications';

import { nextReminderAt } from './reminderTime';

/** The one reminder ever pending; re-scheduling replaces it. */
export const DAILY_REMINDER_ID = 'daily-reminder';

/** Android channel; creating it is also what makes Android 13+ show the
 * system permission prompt. */
export const REMINDER_CHANNEL_ID = 'daily-reminder';

const CONTENT: Notifications.NotificationContentInput = {
  title: "Today's Daily is ready 🏛️",
  body: 'Eight new dates. Keep your streak.',
  data: { route: '/daily' },
};

/**
 * Create the Android channel, then ask for permission. Resolves true when
 * notifications may be shown. Never rejects.
 */
export async function requestReminderPermission(): Promise<boolean> {
  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Daily reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    const result = await Notifications.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

/**
 * Bring the pending reminder in line with the player's state: cancel whatever
 * is scheduled, then (if reminders are on and allowed) schedule one at the
 * next reminder time — tomorrow if today's Daily is already played. Idempotent
 * and safe to call on every app open and every Daily completion. Never rejects.
 */
export async function syncDailyReminder({
  enabled,
  playedToday,
  now,
}: {
  enabled: boolean;
  playedToday: boolean;
  now: Date;
}): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
    if (!enabled) return;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: CONTENT,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextReminderAt({ now, playedToday }),
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  } catch {
    // A reminder must never break the screen that asked for it.
  }
}
