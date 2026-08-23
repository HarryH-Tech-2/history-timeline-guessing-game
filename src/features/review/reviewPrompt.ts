import { useEffect, useState } from 'react';
import { z } from 'zod';

import { createStore } from '@/storage';

/**
 * Rounds a player must reveal before we ask for a store review. High enough
 * that only players who are actually into the game ever see the prompt.
 */
const ROUNDS_BEFORE_PROMPT = 8;

const ReviewPromptSchema = z.object({
  /** Rounds revealed since install (or since the last "maybe later"). */
  roundsPlayed: z.number().nonnegative(),
  /** Once true the prompt never shows again. */
  done: z.boolean(),
});
type ReviewPromptState = z.infer<typeof ReviewPromptSchema>;

const FALLBACK: ReviewPromptState = { roundsPlayed: 0, done: false };

export const reviewPromptStore = createStore<ReviewPromptState>({
  key: 'chronos.reviewPrompt',
  schema: ReviewPromptSchema,
  fallback: FALLBACK,
});

/**
 * In-memory visibility flag with a tiny pub/sub, so the modal (mounted once at
 * the app root) can react to round counts recorded deep inside mode screens
 * without threading props or context through every mode.
 */
let visible = false;
const listeners = new Set<(visible: boolean) => void>();

function setVisible(next: boolean): void {
  if (visible === next) return;
  visible = next;
  for (const listener of listeners) listener(next);
}

/**
 * Count one revealed round towards the review ask. Called by the shared
 * rewards hook, so every mode contributes. When the threshold is crossed (and
 * the player hasn't already been through the flow) the modal pops.
 */
export async function recordRoundPlayed(): Promise<void> {
  const state = await reviewPromptStore.read();
  if (state.done) return;
  const next = { ...state, roundsPlayed: state.roundsPlayed + 1 };
  await reviewPromptStore.write(next);
  if (next.roundsPlayed >= ROUNDS_BEFORE_PROMPT) setVisible(true);
}

/** "Maybe later": hide and restart the round counter, so we ask again after
 * another dozen rounds rather than nagging on the very next reveal. */
export async function deferReviewPrompt(): Promise<void> {
  setVisible(false);
  const state = await reviewPromptStore.read();
  await reviewPromptStore.write({ ...state, roundsPlayed: 0 });
}

/** The player went to the review flow — never ask again. */
export async function completeReviewPrompt(): Promise<void> {
  setVisible(false);
  const state = await reviewPromptStore.read();
  await reviewPromptStore.write({ ...state, done: true });
}

/** Subscribe the modal to the visibility flag. */
export function useReviewPromptVisible(): boolean {
  const [value, setValue] = useState(visible);
  useEffect(() => {
    listeners.add(setValue);
    setValue(visible);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}
