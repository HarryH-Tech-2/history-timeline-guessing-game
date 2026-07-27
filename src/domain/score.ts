import { z } from 'zod';

/**
 * Breakdown of a single guess's score. `comboMultiplier` and `streakBonus`
 * exist now but are inert this slice (multiplier = 1, bonus = 0); slice 5 gives
 * them real behaviour without changing this shape.
 */
export const ScoreSchema = z.object({
  base: z.number().nonnegative(),
  comboMultiplier: z.number().positive(),
  streakBonus: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

export type Score = z.infer<typeof ScoreSchema>;
