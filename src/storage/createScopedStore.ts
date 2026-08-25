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

/**
 * The uid every save is filed under when there is no account: unconfigured
 * builds, and configured builds whose anonymous sign-in failed. Its saves are
 * purely local — never mirrored — and the first real uid adopts them once.
 */
export const LOCAL_UID = 'local';

export interface ScopedStore<T> {
  /**
   * A `Store<T>` for one uid. Reads/writes hit the local key `${key}:${uid}`;
   * writes are also mirrored to the cloud (debounced, last write wins) unless
   * the uid is `LOCAL_UID` or no cloud adapter is configured.
   * Hold onto the returned instance per uid — each call owns its own debounce state.
   */
  forUser(uid: string): Store<T>;
  /**
   * Prepare the local copy for `uid` before anything reads it:
   *  0. legacy unscoped data and any `${key}:local` copy are read and removed;
   *  1. a local copy with unflushed writes (dirty marker) is pushed, not replaced;
   *  2. else a valid cloud copy overwrites local (account wins);
   *  3. else an existing local scoped copy is kept;
   *  4. else the data taken in step 0 is adopted — written to the scoped key
   *     and pushed to the cloud.
   * Never rejects: cloud errors, and a cloud read slower than
   * `hydrateTimeoutMs`, fall through to the local rules.
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
  /** How long `hydrate` waits for the cloud read before playing offline. */
  hydrateTimeoutMs?: number;
}

export function scopedKey(key: string, uid: string): string {
  return `${key}:${uid}`;
}

/**
 * Flag for "this uid's local copy holds writes the cloud has not accepted".
 * Persisted, so it survives the app being killed inside the write debounce.
 */
export function dirtyKey(key: string, uid: string): string {
  return `${scopedKey(key, uid)}:dirty`;
}

function parseJson<T>(schema: z.ZodType<T>, raw: string): T | null {
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Resolve with `null` if `promise` rejects or takes longer than `ms`. */
function settleWithin<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    const done = (value: T | null) => {
      // Don't hold the event loop open once the load has settled first.
      clearTimeout(timer);
      resolve(value);
    };
    promise.then(done, () => done(null));
  });
}

export function createScopedStore<T>({
  key,
  schema,
  fallback,
  storage = asyncStorage,
  cloud,
  debounceMs = 1000,
  hydrateTimeoutMs = 4000,
}: ScopedStoreConfig<T>): ScopedStore<T> {
  /** The mirror for `uid`, or undefined when its saves stay on the device. */
  const cloudFor = (uid: string): CloudSaves | undefined =>
    uid === LOCAL_UID ? undefined : cloud;

  /** Push `value` and clear the dirty marker only once the cloud has it. */
  const push = async (remote: CloudSaves, uid: string, value: unknown): Promise<void> => {
    try {
      await remote.save(uid, key, value);
      await storage.removeItem(dirtyKey(key, uid));
    } catch {
      // Best effort: the marker stays set, so the next hydrate retries.
    }
  };

  return {
    forUser(uid) {
      const local = createStore<T>({ key: scopedKey(key, uid), schema, fallback, storage });
      const remote = cloudFor(uid);
      if (!remote) return local;

      const dirty = dirtyKey(key, uid);
      let timer: ReturnType<typeof setTimeout> | null = null;
      let pending: T | undefined;
      const flush = () => {
        timer = null;
        const value = pending;
        pending = undefined;
        if (value === undefined) return;
        void push(remote, uid, value);
      };

      return {
        read: () => local.read(),
        clear: async () => {
          if (timer !== null) clearTimeout(timer);
          timer = null;
          pending = undefined;
          await storage.removeItem(dirty);
          return local.clear();
        },
        async write(value) {
          await local.write(value);
          // Marked before the flush is even scheduled, so a kill inside the
          // debounce still leaves evidence that the cloud is behind.
          await storage.setItem(dirty, '1');
          pending = value;
          if (timer !== null) clearTimeout(timer);
          timer = setTimeout(flush, debounceMs);
        },
      };
    },

    async hydrate(uid) {
      const target = scopedKey(key, uid);
      const remote = cloudFor(uid);

      // Adoption sources are read and removed up front (unconditionally), so a
      // later uid on this device can never inherit them.
      let adopted: T | null = null;
      const legacy = await storage.getItem(key);
      if (legacy !== null) {
        await storage.removeItem(key);
        adopted = parseJson(schema, legacy);
      }
      if (uid !== LOCAL_UID) {
        const localKey = scopedKey(key, LOCAL_UID);
        const orphan = await storage.getItem(localKey);
        if (orphan !== null) {
          await storage.removeItem(localKey);
          // Legacy unscoped data takes precedence when both exist.
          adopted = adopted ?? parseJson(schema, orphan);
        }
      }

      const existing = await storage.getItem(target);

      // Branch 1: local writes the cloud never accepted win — pushed, not pulled.
      if (remote && existing !== null && (await storage.getItem(dirtyKey(key, uid))) !== null) {
        const local = parseJson(schema, existing);
        if (local !== null) {
          await push(remote, uid, local);
          return;
        }
      }

      // Branch 2: cloud wins.
      if (remote) {
        const loaded = await settleWithin(
          Promise.resolve().then(() => remote.load(uid, key)),
          hydrateTimeoutMs,
        );
        if (loaded !== null) {
          const parsed = schema.safeParse(loaded);
          if (parsed.success) {
            await storage.setItem(target, JSON.stringify(parsed.data));
            return;
          }
        }
      }

      // Branch 3: local kept.
      if (existing !== null) return;

      // Branch 4: adopted.
      if (adopted !== null) {
        await storage.setItem(target, JSON.stringify(adopted));
        if (remote) {
          await storage.setItem(dirtyKey(key, uid), '1');
          await push(remote, uid, adopted);
        }
      }
    },
  };
}
