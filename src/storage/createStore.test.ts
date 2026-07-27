import { z } from 'zod';

import { createStore } from './createStore';
import type { Storage } from './types';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => Promise.resolve(map.get(key) ?? null),
    setItem: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      map.delete(key);
      return Promise.resolve();
    },
  };
}

const schema = z.object({ count: z.number() });
const fallback = { count: 0 };

describe('createStore', () => {
  it('returns the fallback when nothing is stored', async () => {
    const store = createStore({ key: 'k', schema, fallback, storage: memoryStorage() });
    await expect(store.read()).resolves.toEqual(fallback);
  });

  it('round-trips a written value', async () => {
    const store = createStore({ key: 'k', schema, fallback, storage: memoryStorage() });
    await store.write({ count: 7 });
    await expect(store.read()).resolves.toEqual({ count: 7 });
  });

  it('falls back on corrupt JSON', async () => {
    const storage = memoryStorage();
    await storage.setItem('k', '{not json');
    const store = createStore({ key: 'k', schema, fallback, storage });
    await expect(store.read()).resolves.toEqual(fallback);
  });

  it('falls back on schema mismatch', async () => {
    const storage = memoryStorage();
    await storage.setItem('k', JSON.stringify({ count: 'nope' }));
    const store = createStore({ key: 'k', schema, fallback, storage });
    await expect(store.read()).resolves.toEqual(fallback);
  });

  it('clears a stored value', async () => {
    const store = createStore({ key: 'k', schema, fallback, storage: memoryStorage() });
    await store.write({ count: 3 });
    await store.clear();
    await expect(store.read()).resolves.toEqual(fallback);
  });
});
