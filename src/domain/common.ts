import { z } from 'zod';

/**
 * Difficulty is shared by both categories and questions. Ordered from easiest
 * to hardest so it can drive progression and adaptive difficulty later.
 */
export const DifficultySchema = z.enum(['easy', 'medium', 'hard', 'expert']);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const DIFFICULTY_ORDER: readonly Difficulty[] = [
  'easy',
  'medium',
  'hard',
  'expert',
] as const;

/** A hex colour string such as `#5B8CFF`. */
export const HexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, 'Expected a 6-digit hex colour like #5B8CFF');
