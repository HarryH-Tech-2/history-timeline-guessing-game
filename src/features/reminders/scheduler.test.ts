import * as Notifications from 'expo-notifications';

import {
  DAILY_REMINDER_ID,
  requestReminderPermission,
  scheduleTrialReminder,
  syncDailyReminder,
  TRIAL_REMINDER_ID,
} from './scheduler';
import { REMINDER_DAYS, REMINDER_HOUR } from './reminderTime';

const mocked = Notifications as jest.Mocked<typeof Notifications>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true } as never);
});

describe('syncDailyReminder', () => {
  it('replaces whatever is pending with a reminder for each of the next seven mornings', async () => {
    const now = new Date(2026, 8, 21, 9, 0);
    await expect(syncDailyReminder({ enabled: true, playedToday: true, now })).resolves.toBe(true);

    // The single reminder older versions scheduled is cleared too.
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith(DAILY_REMINDER_ID);
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith(`${DAILY_REMINDER_ID}-6`);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(REMINDER_DAYS);
    const calls = mocked.scheduleNotificationAsync.mock.calls.map(([request]) => request);
    expect(calls.map((call) => call.identifier)).toEqual(
      Array.from({ length: REMINDER_DAYS }, (_, i) => `${DAILY_REMINDER_ID}-${i}`),
    );
    expect(calls.map((call) => (call.trigger as { date: Date }).date)).toEqual(
      Array.from({ length: REMINDER_DAYS }, (_, i) => new Date(2026, 8, 22 + i, REMINDER_HOUR, 0, 0, 0)),
    );
    expect(calls[0]!.trigger).toEqual({
      type: 'date',
      date: new Date(2026, 8, 22, REMINDER_HOUR, 0, 0, 0),
      channelId: 'daily-reminder',
    });
    expect(calls[0]!.content.title).toMatch(/^Your daily is ready/);
  });

  it('only cancels when reminders are off', async () => {
    await expect(
      syncDailyReminder({ enabled: false, playedToday: false, now: new Date() }),
    ).resolves.toBe(true);
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith(DAILY_REMINDER_ID);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules nothing, and says so, without notification permission', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false } as never);
    await expect(
      syncDailyReminder({ enabled: true, playedToday: false, now: new Date() }),
    ).resolves.toBe(false);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('never throws when the native side fails', async () => {
    mocked.scheduleNotificationAsync.mockRejectedValueOnce(new Error('boom'));
    await expect(
      syncDailyReminder({ enabled: true, playedToday: false, now: new Date() }),
    ).resolves.toBe(true);
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
