import * as Notifications from 'expo-notifications';

import { STORE_LABEL } from '@/config/store';
import { t } from '@/i18n';

import { REMINDER_DAYS, reminderDates } from './reminderTime';

/**
 * Prefix of the pending Daily reminders, one per queued morning
 * (`daily-reminder-0` …). The bare id is the single reminder older versions
 * scheduled; it is still cancelled so an update doesn't leave it behind.
 */
export const DAILY_REMINDER_ID = 'daily-reminder';

const DAILY_REMINDER_IDS: readonly string[] = [
  DAILY_REMINDER_ID,
  ...Array.from({ length: REMINDER_DAYS }, (_, i) => `${DAILY_REMINDER_ID}-${i}`),
];

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
 * True when the system will no longer show the permission prompt (the player
 * refused it for good), so only the app's settings page can switch
 * notifications on. Never rejects.
 */
export async function reminderPermissionBlocked(): Promise<boolean> {
  try {
    const permission = await Notifications.getPermissionsAsync();
    return !permission.granted && permission.canAskAgain === false;
  } catch {
    return false;
  }
}

/**
 * Bring the pending reminders in line with the player's state: cancel whatever
 * is scheduled, then (if reminders are on and allowed) queue one for each of
 * the next mornings, starting tomorrow if today's Daily is already played.
 * Idempotent and safe to call on every app open and every Daily completion.
 * Resolves false when reminders are on but the system won't show them (the
 * permission is missing), true otherwise. Never rejects.
 */
export async function syncDailyReminder({
  enabled,
  playedToday,
  now,
}: {
  enabled: boolean;
  playedToday: boolean;
  now: Date;
}): Promise<boolean> {
  try {
    await Promise.all(DAILY_REMINDER_IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    if (!enabled) return true;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return false;
    await Promise.all(
      reminderDates({ now, playedToday }).map((date, i) =>
        Notifications.scheduleNotificationAsync({
          identifier: `${DAILY_REMINDER_ID}-${i}`,
          content: dailyContent(),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: REMINDER_CHANNEL_ID,
          },
        }),
      ),
    );
    return true;
  } catch {
    // A reminder must never break the screen that asked for it.
    return true;
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

/**
 * Re-write the pending trial reminder so it says how much the player has
 * played with Premium so far. Only when notifications are already allowed
 * (the purchase asked), and only while `at` is still ahead. Never rejects.
 */
export async function refreshTrialReminder({
  at,
  daysLeft,
  rounds,
}: {
  at: Date;
  daysLeft: number;
  rounds: number;
}): Promise<void> {
  try {
    if (at.getTime() <= Date.now()) return;
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted) return;
    await Notifications.cancelScheduledNotificationAsync(TRIAL_REMINDER_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: TRIAL_REMINDER_ID,
      content: {
        title: t('reminders.trial.title', { count: daysLeft }),
        body: t('reminders.trial.bodyStats', { count: rounds, store: STORE_LABEL }),
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
