import { t } from '@/i18n';

/**
 * Pure price maths for the paywall. Every figure is derived from the store's
 * own numbers (RevenueCat package prices), never from hard-coded amounts.
 */

/** A store price: the numeric amount in an ISO 4217 currency. */
export interface Money {
  amount: number;
  currencyCode: string;
}

/**
 * `money` in its own currency, e.g. "£1.25", "¥250". Uses the device locale
 * for separators; falls back to "GBP 1.25" if the runtime lacks the currency.
 */
export function formatMoney({ amount, currencyCode }: Money, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(
      amount,
    );
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

/** "£1.25/month, billed yearly" for a yearly price. */
export function yearlyPerMonthLabel(yearly: Money, locale?: string): string {
  const perMonth = formatMoney({ amount: yearly.amount / 12, currencyCode: yearly.currencyCode }, locale);
  return t('paywall.perMonthBilledYearly', { price: perMonth });
}

/**
 * Whole-percent saving of the yearly plan over twelve months of the monthly
 * plan, rounded down so the claim is never overstated. Null when the two are
 * in different currencies, a price is missing, or there is no saving.
 */
export function savePercent(monthly: Money | undefined, yearly: Money | undefined): number | null {
  if (!monthly || !yearly || monthly.currencyCode !== yearly.currencyCode) return null;
  const fullYear = monthly.amount * 12;
  if (!(fullYear > 0) || !(yearly.amount > 0) || yearly.amount >= fullYear) return null;
  const pct = Math.floor((1 - yearly.amount / fullYear) * 100);
  return pct >= 1 ? pct : null;
}

/** How many days before a trial ends the player is reminded. */
export const TRIAL_REMINDER_LEAD_DAYS = 2;

/** The day (counting today as day 0) the trial reminder fires. */
export function trialReminderDay(trialDays: number): number {
  return Math.max(1, trialDays - TRIAL_REMINDER_LEAD_DAYS);
}

export interface TrialStep {
  when: string;
  what: string;
}

/**
 * The three beats of a free trial: unlocked today, a reminder shortly before
 * it ends, then the first charge. `priceLabel` is the store's cadence label,
 * e.g. "£14.99 / year".
 */
export function trialTimeline(trialDays: number, priceLabel: string): TrialStep[] {
  const steps: TrialStep[] = [
    { when: t('paywall.trialTimeline.today'), what: t('paywall.trialTimeline.unlocked') },
  ];
  const remind = trialReminderDay(trialDays);
  if (remind < trialDays) {
    steps.push({
      when: t('paywall.trialTimeline.day', { day: remind }),
      what: t('paywall.trialTimeline.remind'),
    });
  }
  steps.push({
    when: t('paywall.trialTimeline.day', { day: trialDays }),
    what: t('paywall.trialTimeline.charge', { price: priceLabel }),
  });
  return steps;
}

/** "Start my free week" / "Start my 3-day free trial". */
export function trialCtaText(trialDays: number): string {
  return trialDays === 7
    ? t('paywall.cta.trialWeek')
    : t('paywall.cta.trialDays', { count: trialDays });
}
