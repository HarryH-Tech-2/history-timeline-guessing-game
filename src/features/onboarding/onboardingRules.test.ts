import { decideOnboarding, shouldShowOnboarding } from './onboardingRules';

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

describe('decideOnboarding', () => {
  it('shows a fresh install straight away, without waiting for the profile', () => {
    expect(
      decideOnboarding({ completedAt: null, hasLocalSaves: false, gamesPlayed: 'loading' }),
    ).toBe('show');
  });

  it('skips straight away once the device flag is set, whatever else is loading', () => {
    expect(
      decideOnboarding({ completedAt: 1, hasLocalSaves: true, gamesPlayed: 'loading' }),
    ).toBe('skip');
  });

  it('waits for the profile only when someone has saved on this device before', () => {
    expect(
      decideOnboarding({ completedAt: null, hasLocalSaves: true, gamesPlayed: 'loading' }),
    ).toBe('wait');
  });

  it('lets the loaded profile decide for a device with saves', () => {
    expect(decideOnboarding({ completedAt: null, hasLocalSaves: true, gamesPlayed: 3 })).toBe(
      'skip',
    );
    expect(decideOnboarding({ completedAt: null, hasLocalSaves: true, gamesPlayed: 0 })).toBe(
      'show',
    );
  });
});
