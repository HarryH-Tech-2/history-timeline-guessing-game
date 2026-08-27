import { z } from 'zod';

import { createStore } from '@/storage';

/** Store-facing price copy. Keep in step with the Play Console product. */
export const PREMIUM_PRICE_LABEL = '$2.99 / month';
export const PREMIUM_PRODUCT_ID = 'premium_monthly';

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
