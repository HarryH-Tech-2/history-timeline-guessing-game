import type { z } from 'zod';

import { asyncStorage } from './asyncStorage';
import type { Storage } from './types';

export interface Store<T> {
  /** Read the persisted value, or the fallback when absent/corrupt. */
  read(): Promise<T>;
  write(value: T): Promise<void>;
  clear(): Promise<void>;
}

interface StoreConfig<T> {
  key: string;
  schema: z.ZodType<T>;
  fallback: T;
  storage?: Storage;
}

/**
 * A typed, Zod-validated wrapper over a single storage key. Reads never throw:
 * missing or malformed data resolves to `fallback`, so a bad write from an old
 * app version can't wedge the mode that depends on it.
 */
export function createStore<T>({
  key,
  schema,
  fallback,
  storage = asyncStorage,
}: StoreConfig<T>): Store<T> {
  return {
    async read() {
      const raw = await storage.getItem(key);
      if (raw === null) return fallback;
      try {
        const parsed = schema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : fallback;
      } catch {
        return fallback;
      }
    },
    async write(value) {
      await storage.setItem(key, JSON.stringify(value));
    },
    async clear() {
      await storage.removeItem(key);
    },
  };
}
