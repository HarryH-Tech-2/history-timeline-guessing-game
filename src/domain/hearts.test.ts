import {
  formatHeartCountdown,
  HEART_REGEN_MS,
  heartsAvailable,
  INITIAL_HEARTS,
  loseHeart,
  MAX_HEARTS,
  msUntilNextHeart,
  refillHearts,
  settleHearts,
} from './hearts';

const T0 = 1_000_000_000;

describe('hearts', () => {
  it('starts full and stays full without play', () => {
    expect(heartsAvailable(INITIAL_HEARTS, T0)).toBe(MAX_HEARTS);
    expect(msUntilNextHeart(INITIAL_HEARTS, T0)).toBe(0);
  });

  it('losing a heart from full anchors the regen clock to now', () => {
    const h = loseHeart(INITIAL_HEARTS, T0);
    expect(h).toEqual({ count: MAX_HEARTS - 1, updatedAt: T0 });
    expect(msUntilNextHeart(h, T0)).toBe(HEART_REGEN_MS);
  });

  it('regenerates one heart per interval and keeps partial progress', () => {
    const h = loseHeart(loseHeart(INITIAL_HEARTS, T0), T0);
    expect(heartsAvailable(h, T0 + HEART_REGEN_MS - 1)).toBe(MAX_HEARTS - 2);
    expect(heartsAvailable(h, T0 + HEART_REGEN_MS)).toBe(MAX_HEARTS - 1);
    // 1.5 intervals in: one heart back, half an interval toward the next.
    const settled = settleHearts(h, T0 + HEART_REGEN_MS * 1.5);
    expect(settled.count).toBe(MAX_HEARTS - 1);
    expect(msUntilNextHeart(settled, T0 + HEART_REGEN_MS * 1.5)).toBe(HEART_REGEN_MS / 2);
  });

  it('caps regeneration at the maximum', () => {
    const h = loseHeart(INITIAL_HEARTS, T0);
    expect(heartsAvailable(h, T0 + HEART_REGEN_MS * 50)).toBe(MAX_HEARTS);
  });

  it('losing a heart mid-regen does not reset progress toward the next one', () => {
    const h = loseHeart(INITIAL_HEARTS, T0); // 4 hearts, clock at T0
    const later = T0 + HEART_REGEN_MS / 2;
    const h2 = loseHeart(h, later); // 3 hearts
    expect(h2.updatedAt).toBe(T0);
    expect(msUntilNextHeart(h2, later)).toBe(HEART_REGEN_MS / 2);
  });

  it('never goes below zero and refills to full', () => {
    let h = INITIAL_HEARTS;
    for (let i = 0; i < MAX_HEARTS + 2; i += 1) h = loseHeart(h, T0);
    expect(h.count).toBe(0);
    expect(refillHearts(T0).count).toBe(MAX_HEARTS);
  });

  it('formats countdowns', () => {
    expect(formatHeartCountdown(30_000)).toBe('1m');
    expect(formatHeartCountdown(12 * 60_000)).toBe('12m');
    expect(formatHeartCountdown(65 * 60_000)).toBe('1h 05m');
  });
});
