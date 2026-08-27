import * as StoreReview from 'expo-store-review';
import { z } from 'zod';

import { createStore } from '@/storage';

const ReviewPromptSchema = z.object({
  /** Once true the native review sheet is never requested again. */
  done: z.boolean(),
});
type ReviewPromptState = z.infer<typeof ReviewPromptSchema>;

const FALLBACK: ReviewPromptState = { done: false };

/**
 * Same key as the retired round-counter prompt; its `{ roundsPlayed, done }`
 * records parse here too (unknown keys are stripped), so a player who already
 * went through the old flow is not asked twice.
 */
export const reviewPromptStore = createStore<ReviewPromptState>({
  key: 'chronos.reviewPrompt',
  schema: ReviewPromptSchema,
  fallback: FALLBACK,
});

/** Long enough for the paywall modal to finish sliding away first. */
const DEFAULT_DELAY_MS = 600;

/**
 * Ask Google Play for its in-app review sheet, once per install, right after
 * the player's first Premium purchase. Play decides whether the sheet is
 * actually displayed and never reports back, so the ask is marked done as
 * soon as the request succeeds. Silently does nothing where no review flow
 * exists (sideloads, emulators) — and stays un-done, so nothing is lost if
 * a later build gains one. Never rejects.
 */
export async function requestReviewAfterFirstPurchase({
  delayMs = DEFAULT_DELAY_MS,
}: { delayMs?: number } = {}): Promise<void> {
  try {
    const state = await reviewPromptStore.read();
    if (state.done) return;
    if (!(await StoreReview.hasAction())) return;
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await StoreReview.requestReview();
    await reviewPromptStore.write({ done: true });
  } catch {
    // A review ask must never disrupt the purchase that triggered it.
  }
}
