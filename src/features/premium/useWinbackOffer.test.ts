jest.mock('@/features/reminders/scheduler', () => ({ scheduleWinbackReminder: jest.fn(async () => {}) }));
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));

// eslint-disable-next-line import/first
import { scheduleWinbackReminder } from '@/features/reminders/scheduler';
// eslint-disable-next-line import/first
import { recordPaywallDismissal } from './useWinbackOffer';
// eslint-disable-next-line import/first
import { WINBACK_DELAY_DAYS, winbackStore } from './winback';

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_800_000_000_000;

describe('recordPaywallDismissal', () => {
  beforeEach(async () => {
    await winbackStore.clear();
    jest.mocked(scheduleWinbackReminder).mockClear();
  });

  it('starts the clock on the first dismissal and schedules the reminder for when it opens', async () => {
    await recordPaywallDismissal(40, T0);
    expect(await winbackStore.read()).toEqual({ dismissedAt: T0 });
    expect(scheduleWinbackReminder).toHaveBeenCalledWith({
      at: new Date(T0 + WINBACK_DELAY_DAYS * DAY),
      percentOff: 40,
    });
  });

  it('does nothing on later dismissals', async () => {
    await recordPaywallDismissal(40, T0);
    jest.mocked(scheduleWinbackReminder).mockClear();
    await recordPaywallDismissal(40, T0 + DAY);
    expect((await winbackStore.read()).dismissedAt).toBe(T0);
    expect(scheduleWinbackReminder).not.toHaveBeenCalled();
  });

  it('schedules no reminder when Play has no discount for this player', async () => {
    await recordPaywallDismissal(0, T0);
    expect((await winbackStore.read()).dismissedAt).toBe(T0);
    expect(scheduleWinbackReminder).not.toHaveBeenCalled();
  });
});
