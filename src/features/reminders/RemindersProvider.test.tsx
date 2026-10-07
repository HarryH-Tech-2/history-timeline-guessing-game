import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ReactNode } from 'react';

import { INITIAL_PROGRESSION } from '@/domain';
import { ProgressionProvider, progressionStore } from '@/features/progression';
import { dateKey } from '@/utils/date';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

// eslint-disable-next-line import/first
import { RemindersProvider, remindersStore, useReminders } from './RemindersProvider';
// eslint-disable-next-line import/first
import { REMINDER_DAYS } from './reminderTime';
// eslint-disable-next-line import/first
import { DAILY_REMINDER_ID } from './scheduler';

const mocked = Notifications as jest.Mocked<typeof Notifications>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <ProgressionProvider>
    <RemindersProvider>{children}</RemindersProvider>
  </ProgressionProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true } as never);
});

afterEach(async () => {
  await progressionStore.clear();
  await remindersStore.clear();
});

describe('RemindersProvider', () => {
  it('starts off and un-asked', async () => {
    const view = renderHook(useReminders, { wrapper });
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));
    expect(view.result.current.enabled).toBe(false);
    expect(view.result.current.asked).toBe(false);
  });

  it('enable asks permission, then persists and schedules the reminder', async () => {
    const view = renderHook(useReminders, { wrapper });
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    let granted = false;
    await act(async () => {
      granted = await view.result.current.enable();
    });

    expect(granted).toBe(true);
    expect(view.result.current.enabled).toBe(true);
    expect(view.result.current.asked).toBe(true);
    await expect(remindersStore.read()).resolves.toEqual({ enabled: true, asked: true });
    await waitFor(() => expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(REMINDER_DAYS));
  });

  it('stays off when the player declines, but remembers it asked', async () => {
    mocked.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
    } as never);
    const view = renderHook(useReminders, { wrapper });
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    await act(async () => {
      await view.result.current.enable();
    });

    expect(view.result.current.enabled).toBe(false);
    expect(view.result.current.asked).toBe(true);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('disable cancels the pending reminder', async () => {
    await remindersStore.write({ enabled: true, asked: true });
    const view = renderHook(useReminders, { wrapper });
    await waitFor(() => expect(view.result.current.enabled).toBe(true));

    await act(async () => {
      view.result.current.disable();
    });

    expect(view.result.current.enabled).toBe(false);
    mocked.scheduleNotificationAsync.mockClear();
    await waitFor(() =>
      expect(mocked.cancelScheduledNotificationAsync).toHaveBeenLastCalledWith(
        `${DAILY_REMINDER_ID}-${REMINDER_DAYS - 1}`,
      ),
    );
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('re-schedules for tomorrow once today’s Daily is played', async () => {
    await remindersStore.write({ enabled: true, asked: true });
    await progressionStore.write({
      ...INITIAL_PROGRESSION,
      streak: { count: 1, lastDate: dateKey(), freezes: 0 },
    });
    const view = renderHook(useReminders, { wrapper });
    await waitFor(() => expect(view.result.current.enabled).toBe(true));

    await waitFor(() => expect(mocked.scheduleNotificationAsync).toHaveBeenCalled());
    const first = mocked.scheduleNotificationAsync.mock.calls.at(-REMINDER_DAYS)![0];
    const date = (first.trigger as { date: Date }).date;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(dateKey(date)).toBe(dateKey(tomorrow));
  });

  it('reads as off while the system permission is missing, and back on once it returns', async () => {
    await remindersStore.write({ enabled: true, asked: true });
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false } as never);
    const view = renderHook(useReminders, { wrapper });
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));
    await waitFor(() => expect(mocked.getPermissionsAsync).toHaveBeenCalled());
    await waitFor(() => expect(view.result.current.enabled).toBe(false));
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();

    // The player allows notifications in system settings and comes back.
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true } as never);
    const onChange = jest.mocked(AppState.addEventListener).mock.calls.at(-1)![1] as (s: 'active') => void;
    act(() => onChange('active'));
    await waitFor(() => expect(view.result.current.enabled).toBe(true));
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(REMINDER_DAYS);
  });

  it('opens system settings when the permission prompt can no longer be shown', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const refused = { status: 'denied', granted: false, canAskAgain: false } as never;
    mocked.getPermissionsAsync.mockResolvedValue(refused);
    mocked.requestPermissionsAsync.mockResolvedValueOnce(refused);
    const view = renderHook(useReminders, { wrapper });
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    let granted = true;
    await act(async () => {
      granted = await view.result.current.enable();
    });

    expect(granted).toBe(false);
    expect(openSettings).toHaveBeenCalled();
    expect(view.result.current.enabled).toBe(false);
    // The choice is kept for when the player allows notifications.
    await expect(remindersStore.read()).resolves.toEqual({ enabled: true, asked: true });
    openSettings.mockRestore();
  });
});
