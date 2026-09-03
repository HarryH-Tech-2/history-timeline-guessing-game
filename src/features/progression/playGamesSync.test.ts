import { z } from 'zod';

import { createStore, type Storage } from '@/storage';

import type { PlayGamesAchievement } from './playGamesAchievements';
import { pendingPlayGamesUnlocks, syncPlayGamesAchievements } from './playGamesSync';

const CATALOGUE: Record<string, PlayGamesAchievement> = {
  'first-round': { playId: 'CgkI-first', points: 5 },
  bullseye: { playId: 'CgkI-bullseye', points: 10 },
  'not-in-console-yet': { playId: '', points: 5 },
};

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => {
      map.set(k, v);
    },
    removeItem: async (k) => {
      map.delete(k);
    },
  };
}

function syncedStore() {
  return createStore<string[]>({
    key: 'test.playGamesSynced',
    schema: z.array(z.string()),
    fallback: [],
    storage: memoryStorage(),
  });
}

describe('pendingPlayGamesUnlocks', () => {
  it('lists unlocked achievements that have a Console id and are not yet synced', () => {
    expect(
      pendingPlayGamesUnlocks(
        ['first-round', 'bullseye', 'not-in-console-yet', 'unknown'],
        ['first-round'],
        CATALOGUE,
      ),
    ).toEqual([{ id: 'bullseye', playId: 'CgkI-bullseye' }]);
  });
});

describe('syncPlayGamesAchievements', () => {
  it('unlocks every pending achievement once and remembers it', async () => {
    const store = syncedStore();
    const unlock = jest.fn(async (_playId: string) => true);

    const first = await syncPlayGamesAchievements(['first-round', 'bullseye'], {
      unlock,
      store,
      catalogue: CATALOGUE,
    });
    expect(first).toEqual(['first-round', 'bullseye']);
    expect(unlock.mock.calls.map((c) => c[0])).toEqual(['CgkI-first', 'CgkI-bullseye']);
    await expect(store.read()).resolves.toEqual(['first-round', 'bullseye']);

    unlock.mockClear();
    const second = await syncPlayGamesAchievements(['first-round', 'bullseye'], {
      unlock,
      store,
      catalogue: CATALOGUE,
    });
    expect(second).toEqual([]);
    expect(unlock).not.toHaveBeenCalled();
  });

  it('leaves an achievement pending when Play Games declines, so it retries later', async () => {
    const store = syncedStore();
    const unlock = jest.fn(async (playId: string) => playId === 'CgkI-first');

    const synced = await syncPlayGamesAchievements(['first-round', 'bullseye'], {
      unlock,
      store,
      catalogue: CATALOGUE,
    });
    expect(synced).toEqual(['first-round']);
    await expect(store.read()).resolves.toEqual(['first-round']);
  });

  it('never throws, even if the native call rejects', async () => {
    const store = syncedStore();
    const unlock = jest.fn(async () => {
      throw new Error('no activity');
    });
    await expect(
      syncPlayGamesAchievements(['first-round'], { unlock, store, catalogue: CATALOGUE }),
    ).resolves.toEqual([]);
  });
});
