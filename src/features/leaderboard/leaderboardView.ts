import { z } from 'zod';

import { createStore } from '@/storage';

import { BOARDS, type Board } from './boards';

const LeaderboardViewSchema = z.object({
  /** Unused since the board always opens on All time; kept so saved views still parse. */
  tab: z.enum(BOARDS as [Board, ...Board[]]).default('all'),
  /** Per board, the uid → rank we last showed, so the next visit can mark movement. */
  ranks: z.record(z.string(), z.record(z.string(), z.number())).default({}),
});
export type LeaderboardView = z.infer<typeof LeaderboardViewSchema>;

/**
 * Device-local leaderboard memory. Deliberately not per account: what the
 * board looked like last time is about this phone.
 */
export const leaderboardViewStore = createStore<LeaderboardView>({
  key: 'chronos.leaderboard.view',
  schema: LeaderboardViewSchema,
  fallback: { tab: 'all', ranks: {} },
});
