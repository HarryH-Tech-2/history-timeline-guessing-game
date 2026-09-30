import {
  formatMoney,
  savePercent,
  trialCtaText,
  trialReminderDay,
  trialTimeline,
  yearlyPerMonthLabel,
} from './paywallPricing';

describe('paywall price maths', () => {
  it('formats money in the store currency', () => {
    expect(formatMoney({ amount: 1.25, currencyCode: 'GBP' }, 'en-GB')).toBe('£1.25');
    expect(formatMoney({ amount: 2.99, currencyCode: 'USD' }, 'en-US')).toBe('$2.99');
  });

  it('shows the yearly price per month', () => {
    expect(yearlyPerMonthLabel({ amount: 19.99, currencyCode: 'USD' }, 'en-US')).toBe(
      '$1.67/month, billed yearly',
    );
    expect(yearlyPerMonthLabel({ amount: 14.99, currencyCode: 'GBP' }, 'en-GB')).toBe(
      '£1.25/month, billed yearly',
    );
  });

  it('computes the yearly saving against twelve months, rounded down', () => {
    // 19.99 vs 35.88 → 44.28 % → 44
    expect(
      savePercent({ amount: 2.99, currencyCode: 'USD' }, { amount: 19.99, currencyCode: 'USD' }),
    ).toBe(44);
    // 14.99 vs 29.88 → 49.83 % → 49
    expect(
      savePercent({ amount: 2.49, currencyCode: 'GBP' }, { amount: 14.99, currencyCode: 'GBP' }),
    ).toBe(49);
  });

  it('claims no saving when it cannot be computed honestly', () => {
    const usd = (amount: number) => ({ amount, currencyCode: 'USD' });
    expect(savePercent(undefined, usd(19.99))).toBeNull();
    expect(savePercent(usd(2.99), undefined)).toBeNull();
    expect(savePercent(usd(2.99), { amount: 19.99, currencyCode: 'GBP' })).toBeNull();
    expect(savePercent(usd(1), usd(12))).toBeNull();
    expect(savePercent(usd(1), usd(13))).toBeNull();
  });

  it('lays out the trial from its length', () => {
    expect(trialTimeline(7, '£14.99 / year')).toEqual([
      { when: 'Today', what: 'Everything unlocked' },
      { when: 'Day 5', what: 'We’ll remind you' },
      { when: 'Day 7', what: '£14.99 / year, cancel anytime' },
    ]);
    expect(trialReminderDay(14)).toBe(12);
    expect(trialTimeline(3, 'x').map((s) => s.when)).toEqual(['Today', 'Day 1', 'Day 3']);
    // Too short to fit a reminder before the charge.
    expect(trialTimeline(1, 'x').map((s) => s.when)).toEqual(['Today', 'Day 1']);
  });

  it('names the trial on the button', () => {
    expect(trialCtaText(7)).toBe('Start my free week');
    expect(trialCtaText(3)).toBe('Start my 3-day free trial');
    expect(trialCtaText(14)).toBe('Start my 14-day free trial');
  });
});
