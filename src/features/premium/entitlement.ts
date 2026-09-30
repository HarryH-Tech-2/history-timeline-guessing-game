import { z } from 'zod';

import { t } from '@/i18n';
import { createStore } from '@/storage';

import type { PremiumPlan } from './billing';

/**
 * Store-facing fallback prices, shown until the store's own localized prices
 * load. Keep in step with the Play Console products.
 */
export const PREMIUM_FALLBACK_PRICES: Record<PremiumPlan, string> = {
  monthly: '$2.99',
  yearly: '$19.99',
  lifetime: '$34.99',
};

/** A plan's bare store price ("£2.49") as a cadence label ("£2.49 / month"). */
export function planPriceLabel(plan: PremiumPlan, price: string): string {
  return `${price} ${t(`paywall.period.${plan}`)}`;
}

/**
 * Every plan's cadence label in the current language, from the store's bare
 * prices where known and the fallbacks otherwise. A function so the cadence
 * words follow the language.
 */
export function premiumPlanLabels(
  prices: Partial<Record<PremiumPlan, string>> = {},
): Record<PremiumPlan, string> {
  const plans = Object.keys(PREMIUM_FALLBACK_PRICES) as PremiumPlan[];
  return Object.fromEntries(
    plans.map((plan) => [plan, planPriceLabel(plan, prices[plan] ?? PREMIUM_FALLBACK_PRICES[plan])]),
  ) as Record<PremiumPlan, string>;
}

export const PREMIUM_PRODUCT_IDS: Record<PremiumPlan, string> = {
  monthly: 'premium_monthly',
  yearly: 'premium_yearly',
  lifetime: 'premium_lifetime',
};

/**
 * The locally cached entitlement. The store (billing provider) is the source
 * of truth; this cache lets the app gate content instantly on launch and stay
 * unlocked offline. `source` records how it was granted so a dev unlock can
 * never be mistaken for a real subscription.
 */
export const PremiumStateSchema = z.object({
  active: z.boolean(),
  source: z.enum(['none', 'store', 'dev']),
  /** Epoch ms when the current period ends, when the store reports one. */
  expiresAt: z.number().optional(),
});
export type PremiumState = z.infer<typeof PremiumStateSchema>;

export const INITIAL_PREMIUM: PremiumState = { active: false, source: 'none' };

export const premiumStore = createStore<PremiumState>({
  key: 'chronos.premium',
  schema: PremiumStateSchema,
  fallback: INITIAL_PREMIUM,
});
