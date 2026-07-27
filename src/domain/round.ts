import { z } from 'zod';

import { QuestionSchema } from './question';
import { ScoreSchema } from './score';

/** A player's placement on the timeline (continuous year from `unwarp`). */
export const GuessSchema = z.object({
  year: z.number(),
});

export type Guess = z.infer<typeof GuessSchema>;

/** The outcome of a single answered question. */
export const RoundResultSchema = z.object({
  question: QuestionSchema,
  guessYear: z.number(),
  errorYears: z.number().nonnegative(),
  score: ScoreSchema,
  isPerfect: z.boolean(),
});

export type RoundResult = z.infer<typeof RoundResultSchema>;
