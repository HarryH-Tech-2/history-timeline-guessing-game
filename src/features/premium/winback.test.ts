import {
  afterDismissal,
  afterPurchase,
  afterShown,
  daysLeft,
  percentOff,
  WINBACK_DELAY_DAYS,
  WINBACK_WINDOW_DAYS,
  winbackPhase,
} from './winback';

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_800_000_000_000;

describe('win-back offer timing', () => {
  it('offers nothing to a player who never closed the paywall', () => {
    expect(winbackPhase({}, T0)).toEqual({ kind: 'none' });
  });

  it('waits a few days after the first dismissal, then opens', () => {
    const state = afterDismissal({}, T0);
    expect(winbackPhase(state, T0 + DAY)).toEqual({
      kind: 'waiting',
      opensAt: T0 + WINBACK_DELAY_DAYS * DAY,
    });
    expect(winbackPhase(state, T0 + WINBACK_DELAY_DAYS * DAY).kind).toBe('open');
  });

  it('only starts the clock on the first dismissal', () => {
    const first = afterDismissal({}, T0);
    expect(afterDismissal(first, T0 + 2 * DAY)).toBe(first);
  });

  it('runs for a week from when it is first shown, then is gone for good', () => {
    const opened = afterShown(afterDismissal({}, T0), T0 + 4 * DAY);
    expect(winbackPhase(opened, T0 + 5 * DAY)).toEqual({
      kind: 'open',
      endsAt: T0 + 4 * DAY + WINBACK_WINDOW_DAYS * DAY,
    });
    expect(winbackPhase(opened, T0 + 4 * DAY + WINBACK_WINDOW_DAYS * DAY)).toEqual({ kind: 'expired' });
    // Showing it again never restarts the week.
    expect(afterShown(opened, T0 + 20 * DAY)).toBe(opened);
  });

  it('never offers again once Premium is bought', () => {
    const bought = afterPurchase(afterShown(afterDismissal({}, T0), T0 + 4 * DAY));
    expect(winbackPhase(bought, T0 + 5 * DAY)).toEqual({ kind: 'none' });
    expect(afterDismissal(afterPurchase({}), T0).dismissedAt).toBeUndefined();
  });

  it('counts whole days left, rounding up', () => {
    expect(daysLeft(T0 + 3 * DAY, T0)).toBe(3);
    expect(daysLeft(T0 + 2.2 * DAY, T0)).toBe(3);
    expect(daysLeft(T0 + 60_000, T0)).toBe(1);
  });

  it('rounds the discount down so it is never overstated', () => {
    expect(percentOff(19.99, 11.99)).toBe(40);
    expect(percentOff(19.99, 9.99)).toBe(50);
    expect(percentOff(19.99, 19.99)).toBe(0);
    expect(percentOff(0, 5)).toBe(0);
  });
});
