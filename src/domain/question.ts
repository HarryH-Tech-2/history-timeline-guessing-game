import { z } from 'zod';

import { DifficultySchema } from './common';

/**
 * A single historical prompt the player must place on the timeline.
 *
 * `year` is a signed integer where negative values are BCE (e.g. -776 = 776
 * BCE). Month/day are optional because many historical dates are only known to
 * the year. Shaped to match the future Firestore `questions/{id}` document.
 */
export const QuestionSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
  difficulty: DifficultySchema,
  country: z.string(),
  region: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  shortDescription: z.string(),
  longDescription: z.string(),
  image: z.string().url().optional(),
  source: z.string().url().optional(),
  tags: z.array(z.string()),
  verified: z.boolean(),
  featured: z.boolean(),
});

export type Question = z.infer<typeof QuestionSchema>;
