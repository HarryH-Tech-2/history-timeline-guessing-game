import type { z } from 'zod';

import { asyncStorage } from './asyncStorage';
import { createStore, type Store } from './createStore';
import type { Storage } from './types';

/** Remote mirror for a save. Implementations must never throw synchronously. */
export interface CloudSaves {
  /** The stored blob for (uid, key), or null when there is none. */
  load(uid: string, key: string): Promise<unknown | null>;
  save(uid: string, key: string, value: unknown): Promise<void>;
}

export interface ScopedStore<T> {
  /**
   * A `Store<T>` for one uid. Reads/writes hit the local key `${key}:${uid}`;
   * writes are also mirrored to the cloud (debounced, last write wins).
   */
  forUser(uid: string): Store<T>;
  /**
   * Prepare the local copy for `uid` before anything reads it:
   *  1. a valid cloud copy overwrites local (account wins);
   *  2. else an existing local scoped copy is kept;
   *  3. else legacy unscoped data (pre-accounts builds) is adopted once —
   *     copied to the scoped key, pushed to the cloud, and the legacy key removed.
   * Never rejects: cloud errors fall through to the local rules.
   */
  hydrate(uid: string): Promise<void>;
}

interface ScopedStoreConfig<T> {
  key: string;
  schema: z.ZodType<T>;
  fallback: T;
  storage?: Storage;
  /** Omit for local-only behaviour (offline builds, tests). */
  cloud?: CloudSaves;
  debounceMs?: number;
}

export function scopedKey(key: string, uid: string): string {
  return `${key}:${uid}`;
}

function parseJson<T>(schema: z.ZodType<T>, raw: string): T | null {
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function createScopedStore<T>({
  key,
  schema,
  fallback,
  storage = asyncStorage,
  cloud,
  debounceMs = 1000,
}: ScopedStoreConfig<T>): ScopedStore<T> {
  return {
    forUser(uid) {
      const local = createStore<T>({ key: scopedKey(key, uid), schema, fallback, storage });
      if (!cloud) return local;

      let timer: ReturnType<typeof setTimeout> | null = null;
      let pending: T | undefined;
      const flush = () => {
        timer = null;
        const value = pending;
        pending = undefined;
        if (value === undefined) return;
        cloud.save(uid, key, value).catch(() => {
          // Best effort: the local copy is the source of truth for this session.
        });
      };

      return {
        read: () => local.read(),
        clear: () => local.clear(),
        async write(value) {
          await local.write(value);
          pending = value;
          if (timer !== null) clearTimeout(timer);
          timer = setTimeout(flush, debounceMs);
        },
      };
    },

    async hydrate(uid) {
      const target = scopedKey(key, uid);

      if (cloud) {
        let remote: unknown = null;
        try {
          remote = await cloud.load(uid, key);
        } catch {
          remote = null;
        }
        if (remote !== null) {
          const parsed = schema.safeParse(remote);
          if (parsed.success) {
            await storage.setItem(target, JSON.stringify(parsed.data));
            return;
          }
        }
      }

      if ((await storage.getItem(target)) !== null) return;

      const legacy = await storage.getItem(key);
      if (legacy === null) return;
      await storage.removeItem(key);
      const adopted = parseJson(schema, legacy);
      if (adopted === null) return;
      await storage.setItem(target, JSON.stringify(adopted));
      if (cloud) {
        try {
          await cloud.save(uid, key, adopted);
        } catch {
          // Will be retried by the next write of this key.
        }
      }
    },
  };
}
