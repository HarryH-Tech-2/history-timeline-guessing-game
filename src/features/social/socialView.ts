import { z } from 'zod';

import { createStore } from '@/storage';

export const SOCIAL_SEGMENTS = ['global', 'groups', 'challenges'] as const;
export type SocialSegment = (typeof SOCIAL_SEGMENTS)[number];

const SocialViewSchema = z.object({
  /** The segment the player last looked at. */
  segment: z.enum(SOCIAL_SEGMENTS).default('global'),
});
export type SocialView = z.infer<typeof SocialViewSchema>;

/** Device-local memory of the last-used Social segment. */
export const socialViewStore = createStore<SocialView>({
  key: 'chronos.social.view',
  schema: SocialViewSchema,
  fallback: { segment: 'global' },
});
