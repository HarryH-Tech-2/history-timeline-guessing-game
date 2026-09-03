import {
  markSignInNudgeShown,
  shouldShowSignInNudge,
  SIGN_IN_NUDGE_COOLDOWN_MS,
  type SignInNudgeState,
} from './signInNudgeRules';

const DAY_MS = 24 * 60 * 60 * 1000;
const T0 = 1_700_000_000_000;
const EMPTY: SignInNudgeState = { shown: {} };

describe('sign-in nudge rules', () => {
  it('shows for a milestone that has never nudged before', () => {
    expect(shouldShowSignInNudge(EMPTY, 'campaign-first-stage', T0)).toBe(true);
  });

  it('never shows the same milestone twice', () => {
    const shown = markSignInNudgeShown(EMPTY, 'campaign-first-stage', T0);
    expect(shouldShowSignInNudge(shown, 'campaign-first-stage', T0 + 365 * DAY_MS)).toBe(false);
  });

  it('rests for three days after any nudge before a different milestone may nudge', () => {
    expect(SIGN_IN_NUDGE_COOLDOWN_MS).toBe(3 * DAY_MS);
    const shown = markSignInNudgeShown(EMPTY, 'campaign-first-stage', T0);
    expect(shouldShowSignInNudge(shown, 'level-up', T0 + 2 * DAY_MS)).toBe(false);
    expect(shouldShowSignInNudge(shown, 'level-up', T0 + 3 * DAY_MS)).toBe(true);
  });

  it('records the time a milestone nudged without touching earlier ones', () => {
    const first = markSignInNudgeShown(EMPTY, 'campaign-first-stage', T0);
    const second = markSignInNudgeShown(first, 'level-up', T0 + 5 * DAY_MS);
    expect(second.shown).toEqual({
      'campaign-first-stage': T0,
      'level-up': T0 + 5 * DAY_MS,
    });
  });
});
