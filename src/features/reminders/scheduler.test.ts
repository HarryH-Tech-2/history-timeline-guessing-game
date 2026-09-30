import * as Notifications from 'expo-notifications';

import {
  DAILY_REMINDER_ID,
  requestReminderPermission,
  scheduleTrialReminder,
  syncDailyReminder,
  TRIAL_REMINDER_ID,
} from './scheduler';
import { REMINDER_HOUR } from './reminderTime';

const mocked = Notifications as jest.Mocked<typeof Notifications>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true } as never);
});

describe('syncDailyReminder', () => {
  it('replaces the single pending reminder with one at the next reminder time', async () => {
    const now = new Date(2026, 8, 21, 9, 0);
    await syncDailyReminder({ enabled: true, playedToday: true, now });

    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith(DAILY_REMINDER_ID);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = mocked.scheduleNotificationAsync.mock.calls[0]![0];
    expect(call.identifier).toBe(DAILY_REMINDER_ID);
    expect(call.trigger).toEqual({
      type: 'date',
      date: new Date(2026, 8, 22, REMINDER_HOUR, 0, 0, 0),
      channelId: 'daily-reminder',
    });
    expect(call.content.title).toMatch(/^Your daily is ready/);
  });

  it('only cancels when reminders are off', async () => {
    await syncDailyReminder({ enabled: false, playedToday: false, now: new Date() });
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith(DAILY_REMINDER_ID);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules nothing without notification permission', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false } as never);
    await syncDailyReminder({ enabled: true, playedToday: false, now: new Date() });
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('never throws when the native side fails', async () => {
    mocked.scheduleNotificationAsync.mockRejectedValueOnce(new Error('boom'));
    await expect(
      syncDailyReminder({ enabled: true, playedToday: false, now: new Date() }),
    ).resolves.toBeUndefined();
  });
});

describe('requestReminderPermission', () => {
  it('creates the Android channel before asking, and reports the grant', async () => {
    await expect(requestReminderPermission()).resolves.toBe(true);
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(
      'daily-reminder',
      expect.objectContaining({ name: expect.any(String) }),
    );
    expect(mocked.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('reports false when the player declines', async () => {
    mocked.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
    } as never);
    await expect(requestReminderPermission()).resolves.toBe(false);
  });
});

describe('scheduleTrialReminder', () => {
  it('schedules one reminder on the promised day', async () => {
    const now = new Date(2026, 8, 21, 9, 0);
    await scheduleTrialReminder({ trialDays: 7, atDay: 5, now });
    const call = mocked.scheduleNotificationAsync.mock.calls[0]![0];
    expect(call.identifier).toBe(TRIAL_REMINDER_ID);
    expect(call.trigger).toEqual({
      type: 'date',
      date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      channelId: 'daily-reminder',
    });
    expect(call.content.title).toBe('Your free trial ends in 2 days');
  });

  it('asks for permission, and schedules nothing if refused', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false } as never);
    await scheduleTrialReminder({ trialDays: 7, atDay: 5, now: new Date() });
    expect(mocked.requestPermissionsAsync).toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
