import * as Notifications from 'expo-notifications';

import { STORE_LABEL } from '@/config/store';
import { t } from '@/i18n';

import { nextReminderAt } from './reminderTime';

/** The one reminder ever pending; re-scheduling replaces it. */
export const DAILY_REMINDER_ID = 'daily-reminder';

/** Android channel; creating it is also what makes Android 13+ show the
 * system permission prompt. */
export const REMINDER_CHANNEL_ID = 'daily-reminder';

/** A function so the text follows the language at scheduling time. */
function dailyContent(): Notifications.NotificationContentInput {
  return {
    title: t('reminders.daily.title'),
    body: t('reminders.daily.body'),
    data: { route: '/daily' },
  };
}

/**
 * Create the Android channel, then ask for permission. Resolves true when
 * notifications may be shown. Never rejects.
 */
export async function requestReminderPermission(): Promise<boolean> {
  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: t('reminders.channel'),
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
      content: dailyContent(),
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
        title: t('reminders.trial.title', { count: left }),
        body: t('reminders.trial.body', { store: STORE_LABEL }),
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

/** The pending "your win-back discount is here" reminder. */
export const WINBACK_REMINDER_ID = 'winback-offer';

/**
 * Remind the player when their win-back offer opens (`at`), saying how much
 * is off. Only when notifications are already allowed: a paywall the player
 * has just closed is no moment to ask for permission. Never rejects.
 */
export async function scheduleWinbackReminder({
  at,
  percentOff,
}: {
  at: Date;
  percentOff: number;
}): Promise<void> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted) return;
    await Notifications.scheduleNotificationAsync({
      identifier: WINBACK_REMINDER_ID,
      content: {
        title: t('reminders.winback.title', { percent: percentOff }),
        body: t('reminders.winback.body'),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  } catch {
    // Best effort.
  }
}

/** Drop the win-back reminder (Premium was bought). Never rejects. */
export async function cancelWinbackReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(WINBACK_REMINDER_ID);
  } catch {
    // Nothing scheduled, or no notifications module: fine.
  }
}
