import { anyTrialDays, benefitOrder, founderLine, paywallHeadline, trialHeadline } from './paywallCopy';
import { PAYWALL_SOURCES } from './paywallSource';

describe('paywall copy', () => {
  it('leads with the benefit that matches where the player came from', () => {
    expect(benefitOrder('hearts').lead[0]!.id).toBe('hearts');
    expect(benefitOrder('campaign').lead[0]!.id).toBe('campaign');
    expect(benefitOrder('locked_category').lead[0]!.id).toBe('categories');
    expect(benefitOrder('locked_mode').lead[0]!.id).toBe('endless');
  });

  it('always shows three leads and the other three below, without repeats', () => {
    for (const source of PAYWALL_SOURCES) {
      const { lead, rest } = benefitOrder(source);
      expect(lead).toHaveLength(3);
      expect(rest).toHaveLength(3);
      expect(new Set([...lead, ...rest].map((b) => b.id)).size).toBe(6);
    }
  });

  it('picks a headline per source', () => {
    expect(paywallHeadline('hearts')).toBe('Never wait for a heart again');
    expect(paywallHeadline('campaign')).toBe('Continue your journey through history');
    expect(paywallHeadline('locked_category')).toBe('Unlock every category');
    expect(paywallHeadline('locked_mode')).toBe('Play Endless with unlimited lives');
    expect(paywallHeadline('onboarding', 7)).toBe('Welcome! Try everything free for a week');
    expect(paywallHeadline('onboarding')).toBe(paywallHeadline('unknown'));
    expect(paywallHeadline('profile')).toBe(
      'Everything in the museum, and never wait for a heart again',
    );
  });

  it('leads the title with the trial whenever any plan offers one', () => {
    expect(anyTrialDays({ monthly: 7 })).toBe(7);
    expect(anyTrialDays({})).toBeUndefined();
    expect(trialHeadline(7)).toBe('Start My Free Week');
    expect(trialHeadline(3)).toBe('Start My 3-Day Free Trial');
  });

  it('keeps the founder line short enough for two lines', () => {
    for (const source of PAYWALL_SOURCES) {
      for (const trial of [undefined, 7]) {
        expect(founderLine(source, false, trial).length).toBeLessThanOrEqual(76);
      }
    }
    expect(founderLine('hearts', true)).toMatch(/thank you/i);
  });
});
