import { z } from 'zod';

import { createStore, type Store } from '@/storage';

/**
 * Guesses already revealed in a challenge run that hasn't been submitted yet,
 * in question order. Stored after every round so quitting mid-run and
 * reopening resumes at the next unanswered question: a revealed answer can
 * never be guessed again. Local only, one key per player and code.
 */
export function challengeProgress(uid: string, code: string): Store<number[]> {
  return createStore<number[]>({
    key: `chronos.challengeRun.${uid}.${code}`,
    schema: z.array(z.number().int()),
    fallback: [],
  });
}
