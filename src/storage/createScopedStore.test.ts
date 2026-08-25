import { z } from 'zod';

import { createScopedStore, type CloudSaves } from './createScopedStore';
import type { Storage } from './types';

function memoryStorage(): Storage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
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

function fakeCloud(initial: Record<string, unknown> = {}) {
  const docs = new Map<string, unknown>(Object.entries(initial));
  const cloud: CloudSaves & { docs: Map<string, unknown>; saves: number; failLoad: boolean; failSave: boolean } = {
    docs,
    saves: 0,
    failLoad: false,
    failSave: false,
    load: (uid, key) => {
      if (cloud.failLoad) return Promise.reject(new Error('offline'));
      return Promise.resolve(docs.get(`${uid}/${key}`) ?? null);
    },
    save: (uid, key, value) => {
      cloud.saves += 1;
      if (cloud.failSave) return Promise.reject(new Error('offline'));
      docs.set(`${uid}/${key}`, value);
      return Promise.resolve();
    },
  };
  return cloud;
}

const schema = z.object({ count: z.number() });
const fallback = { count: 0 };
const key = 'test.save';

function make(storage: Storage, cloud?: CloudSaves) {
  return createScopedStore({ key, schema, fallback, storage, cloud, debounceMs: 10 });
}

describe('createScopedStore', () => {
  it('keeps each uid in its own local key', async () => {
    const storage = memoryStorage();
    const store = make(storage);
    await store.forUser('a').write({ count: 1 });
    await store.forUser('b').write({ count: 2 });
    await expect(store.forUser('a').read()).resolves.toEqual({ count: 1 });
    await expect(store.forUser('b').read()).resolves.toEqual({ count: 2 });
    expect(storage.map.has('test.save:a')).toBe(true);
    expect(storage.map.has('test.save:b')).toBe(true);
  });

  it('returns the fallback for a uid that has nothing stored', async () => {
    const store = make(memoryStorage());
    await store.hydrate('nobody');
    await expect(store.forUser('nobody').read()).resolves.toEqual(fallback);
  });

  it('hydrate: a valid cloud copy overwrites the local scoped copy (account wins)', async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud({ 'a/test.save': { count: 9 } });
    const store = make(storage, cloud);
    await store.forUser('a').write({ count: 1 });
    await store.hydrate('a');
    await expect(store.forUser('a').read()).resolves.toEqual({ count: 9 });
  });

  it('hydrate: keeps the local scoped copy when the cloud has nothing', async () => {
    const storage = memoryStorage();
    const store = make(storage, fakeCloud());
    await store.forUser('a').write({ count: 4 });
    await store.hydrate('a');
    await expect(store.forUser('a').read()).resolves.toEqual({ count: 4 });
  });

  it('hydrate: keeps the local scoped copy when the cloud read fails', async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud({ 'a/test.save': { count: 9 } });
    cloud.failLoad = true;
    const store = make(storage, cloud);
    await store.forUser('a').write({ count: 4 });
    await expect(store.hydrate('a')).resolves.toBeUndefined();
    await expect(store.forUser('a').read()).resolves.toEqual({ count: 4 });
  });

  it('hydrate: ignores a malformed cloud copy', async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud({ 'a/test.save': { count: 'nope' } });
    const store = make(storage, cloud);
    await store.forUser('a').write({ count: 4 });
    await store.hydrate('a');
    await expect(store.forUser('a').read()).resolves.toEqual({ count: 4 });
  });

  it('hydrate: adopts legacy unscoped data once, pushes it to the cloud, and removes the legacy key', async () => {
    const storage = memoryStorage();
    await storage.setItem(key, JSON.stringify({ count: 7 }));
    const cloud = fakeCloud();
    const store = make(storage, cloud);

    await store.hydrate('first');
    await expect(store.forUser('first').read()).resolves.toEqual({ count: 7 });
    expect(storage.map.has(key)).toBe(false);
    expect(cloud.docs.get('first/test.save')).toEqual({ count: 7 });

    // A later uid on the same device must NOT inherit it.
    await store.hydrate('second');
    await expect(store.forUser('second').read()).resolves.toEqual(fallback);
  });

  it('hydrate: does not let legacy data beat an existing scoped copy', async () => {
    const storage = memoryStorage();
    await storage.setItem(key, JSON.stringify({ count: 7 }));
    const store = make(storage);
    await store.forUser('a').write({ count: 2 });
    await store.hydrate('a');
    await expect(store.forUser('a').read()).resolves.toEqual({ count: 2 });
  });

  it('hydrate: discards corrupt legacy data but still removes the key', async () => {
    const storage = memoryStorage();
    await storage.setItem(key, '{not json');
    const store = make(storage);
    await store.hydrate('a');
    await expect(store.forUser('a').read()).resolves.toEqual(fallback);
    expect(storage.map.has(key)).toBe(false);
  });

  it('write: persists locally at once and mirrors the last value to the cloud after the debounce', async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud();
    const user = make(storage, cloud).forUser('a');

    await user.write({ count: 1 });
    await user.write({ count: 2 });
    await user.write({ count: 3 });
    expect(storage.map.get('test.save:a')).toBe(JSON.stringify({ count: 3 }));
    expect(cloud.saves).toBe(0);

    await new Promise((r) => setTimeout(r, 30));
    expect(cloud.saves).toBe(1);
    expect(cloud.docs.get('a/test.save')).toEqual({ count: 3 });
  });

  it('write: a failing cloud save never rejects', async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud();
    cloud.failSave = true;
    const user = make(storage, cloud).forUser('a');
    await expect(user.write({ count: 1 })).resolves.toBeUndefined();
    await new Promise((r) => setTimeout(r, 30));
    expect(cloud.saves).toBe(1);
    await expect(user.read()).resolves.toEqual({ count: 1 });
  });

  it('write: without a cloud adapter nothing is scheduled', async () => {
    const user = make(memoryStorage()).forUser('a');
    await user.write({ count: 1 });
    await expect(user.read()).resolves.toEqual({ count: 1 });
  });

  it("clear: removes only that uid's local copy", async () => {
    const storage = memoryStorage();
    const store = make(storage);
    await store.forUser('a').write({ count: 1 });
    await store.forUser('b').write({ count: 2 });
    await store.forUser('a').clear();
    await expect(store.forUser('a').read()).resolves.toEqual(fallback);
    await expect(store.forUser('b').read()).resolves.toEqual({ count: 2 });
  });

  it('clear: cancels pending cloud flush', async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud();
    const user = make(storage, cloud).forUser('a');
    await user.write({ count: 1 });
    await user.clear();
    await new Promise((r) => setTimeout(r, 30));
    expect(cloud.saves).toBe(0);
  });

  it('hydrate: cloud wins and legacy is discarded, second uid gets fallback', async () => {
    const storage = memoryStorage();
    await storage.setItem(key, JSON.stringify({ count: 7 }));
    const cloud = fakeCloud({ 'a/test.save': { count: 9 } });
    const store = make(storage, cloud);

    await store.hydrate('a');
    await expect(store.forUser('a').read()).resolves.toEqual({ count: 9 });
    expect(storage.map.has(key)).toBe(false);

    // Legacy key was removed, so second uid gets fallback.
    await store.hydrate('b');
    await expect(store.forUser('b').read()).resolves.toEqual(fallback);
  });

  it('hydrate: local kept and legacy is discarded, second uid gets fallback', async () => {
    const storage = memoryStorage();
    await storage.setItem(key, JSON.stringify({ count: 7 }));
    const store = make(storage);
    await store.forUser('a').write({ count: 3 });

    await store.hydrate('a');
    await expect(store.forUser('a').read()).resolves.toEqual({ count: 3 });
    expect(storage.map.has(key)).toBe(false);

    // Legacy key was removed, so second uid gets fallback.
    await store.hydrate('b');
    await expect(store.forUser('b').read()).resolves.toEqual(fallback);
  });
});
