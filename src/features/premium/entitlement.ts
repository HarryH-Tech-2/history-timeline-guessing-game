import { z } from 'zod';

import { createStore } from '@/storage';

import type { PremiumPlan } from './billing';

/**
 * Store-facing fallback price copy, shown until the store's own localized
 * prices load. Keep in step with the Play Console products.
 */
export const PREMIUM_PLAN_LABELS: Record<PremiumPlan, string> = {
  monthly: '$2.99 / month',
  yearly: '$17.99 / year',
  lifetime: '$49.99 once',
};

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
