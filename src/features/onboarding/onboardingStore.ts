import { z } from 'zod';

import { createStore } from '@/storage';

const OnboardingSchema = z.object({
  /** When the first-run flow was finished or skipped on this device; null = never. */
  completedAt: z.number().nullable(),
});
export type OnboardingState = z.infer<typeof OnboardingSchema>;

/**
 * Device-local on purpose: onboarding is about this phone's first launch, not
 * the account. An existing player's save is what stops it re-appearing when
 * they sign in on a new phone (see onboardingRules).
 */
export const onboardingStore = createStore<OnboardingState>({
  key: 'chronos.onboarding',
  schema: OnboardingSchema,
  fallback: { completedAt: null },
});

/** Mark the flow done so it never shows on this device again. */
export async function completeOnboarding(now = Date.now()): Promise<void> {
  await onboardingStore.write({ completedAt: now });
}
