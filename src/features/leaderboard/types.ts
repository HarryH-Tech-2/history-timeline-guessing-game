import { z } from 'zod';

/** Max length enforced both here and in the Firestore security rules. */
export const MAX_DISPLAY_NAME = 24;

/** The shape written to `leaderboard/{uid}` (the uid is the document id). */
export const LeaderboardWriteSchema = z.object({
  displayName: z.string().min(1).max(MAX_DISPLAY_NAME),
  xp: z.number().nonnegative(),
  level: z.number().int().nonnegative(),
  updatedAt: z.number().nonnegative(),
});
export type LeaderboardWrite = z.infer<typeof LeaderboardWriteSchema>;

/** A row as read back, with the document id folded in as `uid`. */
export const LeaderboardEntrySchema = LeaderboardWriteSchema.extend({
  uid: z.string().min(1),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

const ADJECTIVES = [
  'Ancient', 'Bold', 'Curious', 'Daring', 'Eager', 'Fabled', 'Gallant',
  'Humble', 'Intrepid', 'Jovial', 'Keen', 'Legendary', 'Mighty', 'Noble',
  'Olden', 'Proud', 'Quick', 'Regal', 'Stalwart', 'Timeless', 'Valiant', 'Wise',
];
const NOUNS = [
  'Historian', 'Scholar', 'Voyager', 'Sage', 'Chronicler', 'Explorer',
  'Archivist', 'Nomad', 'Curator', 'Pilgrim', 'Cartographer', 'Antiquary',
  'Wanderer', 'Sleuth', 'Oracle', 'Scribe',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * A stable, friendly handle derived from a uid — deterministic so a player's
 * name never changes, and requires no name-entry step for anonymous accounts.
 */
export function handleForUid(uid: string): string {
  const hash = hashString(uid);
  const adjective = ADJECTIVES[hash % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(hash / ADJECTIVES.length) % NOUNS.length];
  return `${adjective} ${noun}`;
}
