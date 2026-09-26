import { shouldShowOnboarding } from './onboardingRules';

describe('shouldShowOnboarding', () => {
  it('shows once, to a brand-new device with a brand-new profile', () => {
    expect(shouldShowOnboarding({ completedAt: null, gamesPlayed: 0 })).toBe(true);
  });

  it('never shows again once completed or skipped on this device', () => {
    expect(shouldShowOnboarding({ completedAt: 1, gamesPlayed: 0 })).toBe(false);
  });

  it('skips existing players, even on a fresh install', () => {
    expect(shouldShowOnboarding({ completedAt: null, gamesPlayed: 3 })).toBe(false);
  });
});
