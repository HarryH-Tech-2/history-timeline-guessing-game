import * as Notifications from 'expo-notifications';

import { STORE_LABEL } from '@/config/store';

import { nextReminderAt } from './reminderTime';

/** The one reminder ever pending; re-scheduling replaces it. */
export const DAILY_REMINDER_ID = 'daily-reminder';

/** Android channel; creating it is also what makes Android 13+ show the
 * system permission prompt. */
export const REMINDER_CHANNEL_ID = 'daily-reminder';

const CONTENT: Notifications.NotificationContentInput = {
  title: 'Your daily is ready 🏛️',
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

/** The pending "your free trial ends soon" reminder. */
export const TRIAL_REMINDER_ID = 'trial-reminder';

/**
 * Schedule the reminder the paywall promises for a free trial: `atDay` days
 * from `now` (at the same time of day), saying the trial ends in
 * `trialDays - atDay` days. Asks for notification permission if it hasn't
 * been granted yet. Never rejects.
 */
export async function scheduleTrialReminder({
  trialDays,
  atDay,
  now,
}: {
  trialDays: number;
  atDay: number;
  now: Date;
}): Promise<void> {
  try {
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await requestReminderPermission());
    if (!granted) return;
    const left = trialDays - atDay;
    const date = new Date(now.getTime() + atDay * 24 * 60 * 60 * 1000);
    await Notifications.scheduleNotificationAsync({
      identifier: TRIAL_REMINDER_ID,
      content: {
        title: `Your free trial ends in ${left} day${left === 1 ? '' : 's'}`,
        body: `Do nothing to keep Premium, or cancel anytime in ${STORE_LABEL}.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  } catch {
    // Best effort: a failed reminder must never break the purchase flow.
  }
}
