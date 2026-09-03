import { z } from 'zod';

import { unlockPlayGamesAchievement } from '@/services/playGames';
import { createStore, type Store } from '@/storage';

import { PLAY_GAMES_ACHIEVEMENTS, type PlayGamesAchievement } from './playGamesAchievements';

/**
 * In-app achievement ids already unlocked on Play Games from this device.
 * Device-local on purpose: Play Games is tied to the phone's Google account,
 * not to the app's own sign-in, so it must not be scoped per uid.
 */
export const playGamesSyncedStore = createStore<string[]>({
  key: 'chronos.playGamesAchievements',
  schema: z.array(z.string()),
  fallback: [],
});

export interface PendingUnlock {
  id: string;
  playId: string;
}

/** Unlocked in-app achievements that have a Console id and are not yet on Play. */
export function pendingPlayGamesUnlocks(
  unlocked: readonly string[],
  synced: readonly string[],
  catalogue: Readonly<Record<string, PlayGamesAchievement>> = PLAY_GAMES_ACHIEVEMENTS,
): PendingUnlock[] {
  const done = new Set(synced);
  const pending: PendingUnlock[] = [];
  for (const id of unlocked) {
    if (done.has(id)) continue;
    const playId = catalogue[id]?.playId;
    if (playId) pending.push({ id, playId });
  }
  return pending;
}

export interface SyncDeps {
  unlock?: (playId: string) => Promise<boolean>;
  store?: Store<string[]>;
  catalogue?: Readonly<Record<string, PlayGamesAchievement>>;
}

/**
 * Push every not-yet-synced unlock to Play Games and remember the ones that
 * took. Anything Play declines (no session, offline, module absent) stays
 * pending so the next call — next unlock, or next launch — retries it. Never
 * throws: achievements are a nicety layered on top of play, not part of it.
 *
 * @returns the in-app ids newly confirmed on Play Games.
 */
export async function syncPlayGamesAchievements(
  unlocked: readonly string[],
  {
    unlock = unlockPlayGamesAchievement,
    store = playGamesSyncedStore,
    catalogue = PLAY_GAMES_ACHIEVEMENTS,
  }: SyncDeps = {},
): Promise<readonly string[]> {
  try {
    const synced = await store.read();
    const pending = pendingPlayGamesUnlocks(unlocked, synced, catalogue);
    if (pending.length === 0) return [];

    const confirmed: string[] = [];
    for (const { id, playId } of pending) {
      if (await unlock(playId)) confirmed.push(id);
    }
    if (confirmed.length > 0) await store.write([...synced, ...confirmed]);
    return confirmed;
  } catch {
    return [];
  }
}
