import { z } from 'zod';

import { createScopedStore, dirtyKey, LOCAL_UID, type CloudSaves } from './createScopedStore';
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

function make(storage: Storage, cloud?: CloudSaves, hydrateTimeoutMs = 50) {
  return createScopedStore({ key, schema, fallback, storage, cloud, debounceMs: 10, hydrateTimeoutMs });
}

/** Seed a clean (already-synced) local copy: no dirty marker. */
function seedLocal(storage: Storage, uid: string, value: unknown) {
  return storage.setItem(`${key}:${uid}`, JSON.stringify(value));
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
    await seedLocal(storage, 'a', { count: 1 });
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
    await seedLocal(storage, 'a', { count: 4 });
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
  it('hydrate: a local dirty copy is pushed to the cloud instead of being overwritten by a stale one', async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud({ 'a/test.save': { count: 9 } });
    const store = make(storage, cloud);
    // An offline session: the write landed locally, the flush never reached the cloud.
    await seedLocal(storage, 'a', { count: 4 });
    await storage.setItem(dirtyKey(key, 'a'), '1');

    await store.hydrate('a');

    await expect(store.forUser('a').read()).resolves.toEqual({ count: 4 });
    expect(cloud.docs.get('a/test.save')).toEqual({ count: 4 });
    expect(storage.map.has(dirtyKey(key, 'a'))).toBe(false);
  });

  it('hydrate: a write killed inside the debounce is pushed on the next launch', async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud({ 'a/test.save': { count: 9 } });
    const store = make(storage, cloud);
    await store.forUser('a').write({ count: 4 }); // no time for the 10 ms flush

    await store.hydrate('a');

    await expect(store.forUser('a').read()).resolves.toEqual({ count: 4 });
    expect(cloud.docs.get('a/test.save')).toEqual({ count: 4 });
  });

  it('hydrate: a rejected flush leaves the marker set, so the next hydrate pushes', async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud({ 'a/test.save': { count: 9 } });
    cloud.failSave = true;
    const store = make(storage, cloud);
    await store.forUser('a').write({ count: 4 });
    await new Promise((r) => setTimeout(r, 30));
    expect(cloud.saves).toBe(1); // flushed, and rejected
    expect(storage.map.get(dirtyKey(key, 'a'))).toBe('1');

    cloud.failSave = false;
    await store.hydrate('a');

    await expect(store.forUser('a').read()).resolves.toEqual({ count: 4 });
    expect(cloud.docs.get('a/test.save')).toEqual({ count: 4 });
    expect(storage.map.has(dirtyKey(key, 'a'))).toBe(false);
  });

  it('hydrate: a successful flush clears the marker, so the next hydrate pulls the cloud', async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud();
    const store = make(storage, cloud);
    await store.forUser('a').write({ count: 4 });
    await new Promise((r) => setTimeout(r, 30));
    expect(storage.map.has(dirtyKey(key, 'a'))).toBe(false);

    // Another device moved the account on.
    cloud.docs.set('a/test.save', { count: 9 });
    await store.hydrate('a');
    await expect(store.forUser('a').read()).resolves.toEqual({ count: 9 });
  });

  it('hydrate: a cloud load that never resolves times out and keeps the local copy', async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud();
    cloud.load = () => new Promise<never>(() => {});
    const store = make(storage, cloud, 20);
    await seedLocal(storage, 'a', { count: 4 });

    await expect(store.hydrate('a')).resolves.toBeUndefined();
    await expect(store.forUser('a').read()).resolves.toEqual({ count: 4 });
  });

  it("hydrate: adopts the ':local' copy once for the first real uid, removes it, and pushes it", async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud();
    const store = make(storage, cloud);
    // A configured build whose anonymous sign-in failed filed progress under 'local'.
    await store.forUser(LOCAL_UID).write({ count: 5 });

    await store.hydrate('a');

    await expect(store.forUser('a').read()).resolves.toEqual({ count: 5 });
    expect(storage.map.has(`${key}:${LOCAL_UID}`)).toBe(false);
    expect(cloud.docs.get('a/test.save')).toEqual({ count: 5 });

    // Only once: a later uid must not inherit it.
    await store.hydrate('b');
    await expect(store.forUser('b').read()).resolves.toEqual(fallback);
  });

  it("hydrate: the legacy unscoped key wins over ':local', and both are removed", async () => {
    const storage = memoryStorage();
    const store = make(storage);
    await storage.setItem(key, JSON.stringify({ count: 7 }));
    await store.forUser(LOCAL_UID).write({ count: 5 });

    await store.hydrate('a');

    await expect(store.forUser('a').read()).resolves.toEqual({ count: 7 });
    expect(storage.map.has(key)).toBe(false);
    expect(storage.map.has(`${key}:${LOCAL_UID}`)).toBe(false);
  });

  it("forUser('local') never mirrors to the cloud", async () => {
    const storage = memoryStorage();
    const cloud = fakeCloud();
    const store = make(storage, cloud);
    await store.forUser(LOCAL_UID).write({ count: 5 });
    await store.hydrate(LOCAL_UID);
    await new Promise((r) => setTimeout(r, 30));

    expect(cloud.saves).toBe(0);
    expect(cloud.docs.size).toBe(0);
    await expect(store.forUser(LOCAL_UID).read()).resolves.toEqual({ count: 5 });
  });
});
