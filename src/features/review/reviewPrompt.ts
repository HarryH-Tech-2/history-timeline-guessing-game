import * as StoreReview from 'expo-store-review';
import { z } from 'zod';

import type { RoundResult } from '@/domain';
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
const PURCHASE_DELAY_MS = 600;
/** Long enough for the run summary and its mascot to land before the sheet. */
const STRONG_RUN_DELAY_MS = 1500;

/** The most a single round can score before combo multipliers. */
const MAX_BASE_SCORE_PER_ROUND = 1000;
/** A run scoring more than this share of its maximum counts as strong. */
export const STRONG_RUN_FRACTION = 0.75;

/**
 * Ask Google Play for its in-app review sheet, once per install. Play decides
 * whether the sheet is actually displayed and never reports back, so the ask
 * is marked done as soon as the request succeeds. Silently does nothing where
 * no review flow exists (sideloads, emulators) — and stays un-done, so nothing
 * is lost if a later build gains one. Never rejects.
 */
export async function requestReviewOnce({ delayMs = 0 }: { delayMs?: number } = {}): Promise<void> {
  try {
    const state = await reviewPromptStore.read();
    if (state.done) return;
    if (!(await StoreReview.hasAction())) return;
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await StoreReview.requestReview();
    await reviewPromptStore.write({ done: true });
  } catch {
    // A review ask must never disrupt whatever triggered it.
  }
}

/** Right after the player's first Premium purchase. */
export function requestReviewAfterFirstPurchase({
  delayMs = PURCHASE_DELAY_MS,
}: { delayMs?: number } = {}): Promise<void> {
  return requestReviewOnce({ delayMs });
}

/**
 * The share of the maximum possible score a finished run achieved. Combo
 * multipliers can push it past 1; an empty run is 0.
 */
export function runScoreFraction(results: readonly RoundResult[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, r) => sum + r.score.total, 0);
  return total / (results.length * MAX_BASE_SCORE_PER_ROUND);
}

export function isStrongRun(results: readonly RoundResult[]): boolean {
  return runScoreFraction(results) > STRONG_RUN_FRACTION;
}

/**
 * After any finished run — Daily, Campaign, Topic, Category, Endless or
 * Survival — that scored over 75% of its maximum. A weak run asks nothing.
 */
export function requestReviewAfterStrongRun(
  results: readonly RoundResult[],
  { delayMs = STRONG_RUN_DELAY_MS }: { delayMs?: number } = {},
): Promise<void> {
  if (!isStrongRun(results)) return Promise.resolve();
  return requestReviewOnce({ delayMs });
}
