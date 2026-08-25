import { INITIAL_PROGRESSION, ProgressionStateSchema, type ProgressionState } from '@/domain';
import { isFirebaseConfigured } from '@/config/env';
import { cloudSaves } from '@/storage/cloudSaves';
import { createScopedStore, type Store } from '@/storage';

/** The uid every save is filed under when Firebase is not configured. */
export const LOCAL_UID = 'local';

/**
 * A player's XP, coins, achievements, and lifetime stats, kept per uid so an
 * account never sees another account's (or the device's) progress. A single
 * key keeps the whole progression atomic, and the Zod-validated store falls
 * back to a fresh profile if an older/corrupt shape is ever read.
 */
export const progressionSaves = createScopedStore<ProgressionState>({
  key: 'chronos.progression',
  schema: ProgressionStateSchema,
  fallback: INITIAL_PROGRESSION,
  cloud: isFirebaseConfigured ? cloudSaves : undefined,
});

/** The offline/local-uid store: what `useSaves()` yields without a provider, and what tests seed. */
export const progressionStore: Store<ProgressionState> = progressionSaves.forUser(LOCAL_UID);
