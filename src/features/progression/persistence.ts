import { INITIAL_PROGRESSION, ProgressionStateSchema, type ProgressionState } from '@/domain';
import { createStore } from '@/storage';

/**
 * A player's XP, coins, achievements, and lifetime stats. A single key keeps the
 * whole progression atomic, and the Zod-validated store falls back to a fresh
 * profile if an older/corrupt shape is ever read.
 */
export const progressionStore = createStore<ProgressionState>({
  key: 'chronos.progression',
  schema: ProgressionStateSchema,
  fallback: INITIAL_PROGRESSION,
});
