import { z } from 'zod';

import { DifficultySchema, HexColorSchema } from './common';

/**
 * A category groups questions by theme (Battles, Technology, ...). Shaped to
 * match the future Firestore `categories/{id}` document exactly, so seed data
 * can migrate to the backend with zero changes.
 */
export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Name of an icon glyph (resolved by the UI layer). */
  icon: z.string().min(1),
  colour: HexColorSchema,
  description: z.string().min(1),
  difficulty: DifficultySchema,
  active: z.boolean(),
  premiumOnly: z.boolean(),
  displayOrder: z.number().int().nonnegative(),
  image: z.string().url().optional(),
});

export type Category = z.infer<typeof CategorySchema>;
