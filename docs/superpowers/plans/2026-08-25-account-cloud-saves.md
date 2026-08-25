# Account-Scoped Cloud Saves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every player save (progression, best scores, daily, campaign) belong to the signed-in Firebase uid, mirrored to Firestore, so signing into an account shows that account's progress and nothing from the device.

**Architecture:** A `createScopedStore` factory wraps the existing `createStore` so each save has a per-uid local key (`chronos.progression:<uid>`) plus a debounced Firestore write-through under `users/{uid}/saves/{key}`. A `SaveProvider` mounted under `AuthProvider` hydrates all four stores whenever the uid changes (cloud copy wins, else local, else one-time adoption of the legacy unscoped key) and hands the current uid's stores to `ProgressionProvider` and the mode hooks through context.

**Tech Stack:** Expo SDK 57 / React Native, TypeScript, Zod, `@react-native-async-storage/async-storage`, Firebase JS SDK (`firebase/firestore`, lazily imported), Jest (`jest-expo`) + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-08-25-account-cloud-saves-design.md`

## Global Constraints

- Firestore document path: `users/{uid}/saves/{key}` with shape `{ data: <blob>, updatedAt: <ms> }`. No `firestore.rules` change.
- Local scoped key format: `${key}:${uid}`. Legacy unscoped key is the bare `key`.
- Offline uid constant: `'local'`. Builds where `isFirebaseConfigured === false` must behave as today (no Firestore import, no network).
- Cloud failures are swallowed, never surfaced to the player (same policy as `src/features/leaderboard/service.ts`).
- Debounce cloud writes ~1000 ms per store instance, last write wins.
- Conflict rule: **account wins** — a valid cloud save always replaces the local scoped copy on hydrate.
- Path alias `@/` → `src/`. Tests run with `npx jest <path>`; whole suite with `npm test`. Type-check with `npx tsc --noEmit`.
- Commit after every task. Do **not** stage unrelated pre-existing uncommitted files (the working tree already has in-progress premium/billing work); `git add` only the paths each task names.
- Import the progression scoped store from `@/features/progression/persistence` (file path), never from `@/features/progression` (index), inside `src/features/save/` — the index re-exports `ProgressionProvider`, which will import `save`, and that would be a cycle.

---

### Task 1: `createScopedStore` — per-uid keys, hydrate rules, debounced cloud mirror

**Files:**
- Create: `src/storage/createScopedStore.ts`
- Create: `src/storage/createScopedStore.test.ts`
- Modify: `src/storage/index.ts`

**Interfaces:**
- Consumes: `createStore`, `Store<T>` from `src/storage/createStore.ts`; `Storage` from `src/storage/types.ts`.
- Produces:
  ```ts
  export interface CloudSaves {
    load(uid: string, key: string): Promise<unknown | null>;
    save(uid: string, key: string, value: unknown): Promise<void>;
  }
  export interface ScopedStore<T> {
    forUser(uid: string): Store<T>;
    hydrate(uid: string): Promise<void>;
  }
  export function createScopedStore<T>(config: {
    key: string; schema: z.ZodType<T>; fallback: T; storage?: Storage; cloud?: CloudSaves; debounceMs?: number;
  }): ScopedStore<T>;
  export function scopedKey(key: string, uid: string): string; // `${key}:${uid}`
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/storage/createScopedStore.test.ts`:

```ts
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

  it('clear: removes only that uid’s local copy', async () => {
    const storage = memoryStorage();
    const store = make(storage);
    await store.forUser('a').write({ count: 1 });
    await store.forUser('b').write({ count: 2 });
    await store.forUser('a').clear();
    await expect(store.forUser('a').read()).resolves.toEqual(fallback);
    await expect(store.forUser('b').read()).resolves.toEqual({ count: 2 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/storage/createScopedStore.test.ts`
Expected: FAIL — `Cannot find module './createScopedStore'`.

- [ ] **Step 3: Implement `createScopedStore`**

Create `src/storage/createScopedStore.ts`:

```ts
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
```

- [ ] **Step 4: Export from the storage barrel**

Modify `src/storage/index.ts` to:

```ts
export type { Storage } from './types';
export { asyncStorage } from './asyncStorage';
export { createStore, type Store } from './createStore';
export {
  createScopedStore,
  scopedKey,
  type CloudSaves,
  type ScopedStore,
} from './createScopedStore';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/storage`
Expected: PASS — all `createScopedStore` and existing `createStore` cases.

- [ ] **Step 6: Commit**

```bash
git add src/storage/createScopedStore.ts src/storage/createScopedStore.test.ts src/storage/index.ts
git commit -m "feat(storage): createScopedStore with per-uid keys, hydrate rules and cloud mirror"
```

---

### Task 2: `cloudSaves` — the Firestore adapter

**Files:**
- Create: `src/storage/cloudSaves.ts`
- Create: `src/storage/cloudSaves.test.ts`

**Interfaces:**
- Consumes: `CloudSaves` from Task 1; `isFirebaseConfigured` from `src/config/env.ts`; `getFirebaseDb` from `src/services/firebase/client.ts`.
- Produces: `export const cloudSaves: CloudSaves` — Firestore docs at `users/{uid}/saves/{key}`, shape `{ data, updatedAt }`.

- [ ] **Step 1: Write the failing test**

Create `src/storage/cloudSaves.test.ts`:

```ts
import { cloudSaves } from './cloudSaves';

describe('cloudSaves (Firebase not configured)', () => {
  // The test env has no EXPO_PUBLIC_FIREBASE_* vars, so the adapter must be a
  // no-op that never touches the Firestore SDK.
  it('load resolves null', async () => {
    await expect(cloudSaves.load('uid', 'chronos.progression')).resolves.toBeNull();
  });

  it('save resolves without doing anything', async () => {
    await expect(cloudSaves.save('uid', 'chronos.progression', { xp: 1 })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/storage/cloudSaves.test.ts`
Expected: FAIL — `Cannot find module './cloudSaves'`.

- [ ] **Step 3: Implement the adapter**

Create `src/storage/cloudSaves.ts`:

```ts
import { isFirebaseConfigured } from '@/config/env';

import type { CloudSaves } from './createScopedStore';

const COLLECTION = 'users';
const SUBCOLLECTION = 'saves';

/**
 * Firestore mirror for player saves: `users/{uid}/saves/{key}` holding
 * `{ data, updatedAt }`. `firebase/firestore` is imported lazily, like the
 * leaderboard service, so unconfigured builds never load it. Callers treat
 * every failure as "cloud unreachable" — these methods reject, they never
 * swallow, so `createScopedStore` can apply its own fallback rules.
 */
export const cloudSaves: CloudSaves = {
  async load(uid, key) {
    if (!isFirebaseConfigured) return null;
    const [{ getFirebaseDb }, { doc, getDoc }] = await Promise.all([
      import('@/services/firebase/client'),
      import('firebase/firestore'),
    ]);
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTION, uid, SUBCOLLECTION, key));
    if (!snapshot.exists()) return null;
    const stored = snapshot.data() as { data?: unknown } | undefined;
    return stored?.data ?? null;
  },

  async save(uid, key, value) {
    if (!isFirebaseConfigured) return;
    const [{ getFirebaseDb }, { doc, setDoc }] = await Promise.all([
      import('@/services/firebase/client'),
      import('firebase/firestore'),
    ]);
    // Firestore rejects `undefined` anywhere in a document; a JSON round-trip
    // strips optional fields that were never set (e.g. an old DailyRound).
    const data: unknown = JSON.parse(JSON.stringify(value));
    await setDoc(doc(getFirebaseDb(), COLLECTION, uid, SUBCOLLECTION, key), {
      data,
      updatedAt: Date.now(),
    });
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/storage/cloudSaves.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (pre-existing errors, if any, must be unrelated to `src/storage`).

- [ ] **Step 6: Commit**

```bash
git add src/storage/cloudSaves.ts src/storage/cloudSaves.test.ts
git commit -m "feat(storage): Firestore cloudSaves adapter for users/{uid}/saves"
```

---

### Task 3: Scoped save definitions in the two persistence modules

**Files:**
- Modify: `src/features/progression/persistence.ts`
- Modify: `src/features/modes/persistence.ts:48-66`

**Interfaces:**
- Consumes: `createScopedStore`, `cloudSaves`, `ScopedStore`, `Store` from Task 1–2.
- Produces:
  ```ts
  // progression/persistence.ts
  export const LOCAL_UID = 'local';
  export const progressionSaves: ScopedStore<ProgressionState>;
  export const progressionStore: Store<ProgressionState>; // = progressionSaves.forUser(LOCAL_UID); kept for tests/offline
  // modes/persistence.ts
  export const bestScoresSaves: ScopedStore<BestScores>;
  export const dailySaves: ScopedStore<DailyRecord | null>;
  export const campaignSaves: ScopedStore<CampaignProgress>;
  ```
  The old `bestScoresStore` / `dailyStore` / `campaignStore` exports are **removed** (Task 6 migrates their consumers; the build is red in between, which is why Tasks 3–6 are committed together only after Task 6 passes).

- [ ] **Step 1: Rewrite `src/features/progression/persistence.ts`**

```ts
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
```

- [ ] **Step 2: Rewrite the store definitions in `src/features/modes/persistence.ts`**

Replace the `import { createStore } from '@/storage';` line with:

```ts
import { isFirebaseConfigured } from '@/config/env';
import { cloudSaves } from '@/storage/cloudSaves';
import { createScopedStore } from '@/storage';
```

and replace everything from `export const bestScoresStore = createStore<BestScores>({` to the end of the file with:

```ts
const cloud = isFirebaseConfigured ? cloudSaves : undefined;

export const bestScoresSaves = createScopedStore<BestScores>({
  key: 'chronos.bestScores',
  schema: BestScoresSchema,
  fallback: BEST_SCORES_FALLBACK,
  cloud,
});

export const dailySaves = createScopedStore<DailyRecord | null>({
  key: 'chronos.daily',
  schema: DailyRecordSchema.nullable(),
  fallback: null,
  cloud,
});

export const campaignSaves = createScopedStore<CampaignProgress>({
  key: 'chronos.campaign',
  schema: CampaignProgressSchema,
  fallback: {},
  cloud,
});
```

- [ ] **Step 3: Confirm the progression tests still pass (they use `progressionStore`)**

Run: `npx jest src/features/progression src/features/modes/hints`
Expected: PASS — `progressionStore` now writes `chronos.progression:local`, which `ProgressionProvider` (unchanged so far) does not read yet, so if `awards a round and persists it` fails on the persisted-value assertion that is expected until Task 5; every other case must pass. Note the result; do not commit yet.

---

### Task 4: `SaveProvider` — hydrate on uid change and expose the current stores

**Files:**
- Create: `src/features/save/SaveProvider.tsx`
- Create: `src/features/save/index.ts`
- Create: `src/features/save/SaveProvider.test.tsx`
- Modify: `app/_layout.tsx:53-59`

**Interfaces:**
- Consumes: `useAuth()` (`uid: string | null`, `isLoading: boolean`) from `src/services/firebase/auth.tsx`; `isFirebaseConfigured`; `progressionSaves`, `LOCAL_UID` from `@/features/progression/persistence`; `bestScoresSaves`, `dailySaves`, `campaignSaves` from `@/features/modes/persistence`.
- Produces:
  ```ts
  export interface SaveContextValue {
    uid: string;
    isReady: boolean;
    progression: Store<ProgressionState>;
    bestScores: Store<BestScores>;
    daily: Store<DailyRecord | null>;
    campaign: Store<CampaignProgress>;
  }
  export function SaveProvider({ children }: { children: ReactNode }): JSX.Element;
  export function useSaves(): SaveContextValue; // without a provider: uid 'local', isReady true, local stores
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/features/save/SaveProvider.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { INITIAL_PROGRESSION } from '@/domain';
import { progressionSaves } from '@/features/progression/persistence';

import { SaveProvider, useSaves } from './SaveProvider';

// Pretend Firebase is configured so SaveProvider follows the auth uid...
jest.mock('@/config/env', () => ({ isFirebaseConfigured: true, firebaseConfig: {} }));

// ...but stub the Firestore adapter so nothing touches the SDK.
const cloud = { docs: new Map<string, unknown>() };
jest.mock('@/storage/cloudSaves', () => ({
  cloudSaves: {
    load: (uid: string, key: string) => Promise.resolve(cloud.docs.get(`${uid}/${key}`) ?? null),
    save: (uid: string, key: string, value: unknown) => {
      cloud.docs.set(`${uid}/${key}`, value);
      return Promise.resolve();
    },
  },
}));

const auth = { uid: null as string | null, isLoading: true };
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => auth }));

function Probe() {
  const { uid, isReady } = useSaves();
  return <Text>{`uid:${uid} ready:${isReady}`}</Text>;
}

describe('SaveProvider', () => {
  beforeEach(() => {
    cloud.docs.clear();
    auth.uid = null;
    auth.isLoading = true;
  });

  it('is not ready while auth is still resolving', () => {
    render(
      <SaveProvider>
        <Probe />
      </SaveProvider>,
    );
    expect(screen.getByText('uid:local ready:false')).toBeOnTheScreen();
  });

  it('hydrates the auth uid and becomes ready', async () => {
    auth.uid = 'user-a';
    auth.isLoading = false;
    render(
      <SaveProvider>
        <Probe />
      </SaveProvider>,
    );
    await screen.findByText('uid:user-a ready:true');
  });

  it('switching uid re-hydrates and serves that account’s cloud save', async () => {
    cloud.docs.set('user-b/chronos.progression', { ...INITIAL_PROGRESSION, xp: 777 });
    auth.uid = 'user-a';
    auth.isLoading = false;

    function XpProbe() {
      const { uid, isReady, progression } = useSaves();
      const [xp, setXp] = useState<number | null>(null);
      useEffect(() => {
        if (!isReady) return;
        void progression.read().then((s) => setXp(s.xp));
      }, [uid, isReady, progression]);
      return <Text>{`uid:${uid} ready:${isReady} xp:${xp ?? '-'}`}</Text>;
    }

    const view = render(
      <SaveProvider>
        <XpProbe />
      </SaveProvider>,
    );
    await screen.findByText('uid:user-a ready:true xp:0');

    auth.uid = 'user-b';
    view.rerender(
      <SaveProvider>
        <XpProbe />
      </SaveProvider>,
    );
    await screen.findByText('uid:user-b ready:true xp:777');
    await waitFor(async () => {
      expect((await progressionSaves.forUser('user-b').read()).xp).toBe(777);
    });
  });

  it('falls back to the local uid when auth finished without a user', async () => {
    auth.uid = null;
    auth.isLoading = false;
    render(
      <SaveProvider>
        <Probe />
      </SaveProvider>,
    );
    await screen.findByText('uid:local ready:true');
  });
});

describe('useSaves without a provider', () => {
  it('serves the local uid, ready immediately', () => {
    render(<Probe />);
    expect(screen.getByText('uid:local ready:true')).toBeOnTheScreen();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/save`
Expected: FAIL — `Cannot find module './SaveProvider'`.

- [ ] **Step 3: Implement `SaveProvider`**

Create `src/features/save/SaveProvider.tsx`:

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isFirebaseConfigured } from '@/config/env';
import type { ProgressionState } from '@/domain';
import {
  bestScoresSaves,
  campaignSaves,
  dailySaves,
  type BestScores,
  type CampaignProgress,
  type DailyRecord,
} from '@/features/modes/persistence';
import { LOCAL_UID, progressionSaves } from '@/features/progression/persistence';
import { useAuth } from '@/services/firebase/auth';
import type { Store } from '@/storage';

export interface SaveContextValue {
  /** The uid every save is filed under right now (`'local'` offline). */
  uid: string;
  /** False until every store has been hydrated for `uid`. Do not read before then. */
  isReady: boolean;
  progression: Store<ProgressionState>;
  bestScores: Store<BestScores>;
  daily: Store<DailyRecord | null>;
  campaign: Store<CampaignProgress>;
}

function storesFor(uid: string) {
  return {
    progression: progressionSaves.forUser(uid),
    bestScores: bestScoresSaves.forUser(uid),
    daily: dailySaves.forUser(uid),
    campaign: campaignSaves.forUser(uid),
  };
}

/** Default when no provider is mounted (isolated tests, storybook-style renders). */
const LOCAL_VALUE: SaveContextValue = { uid: LOCAL_UID, isReady: true, ...storesFor(LOCAL_UID) };

const SaveContext = createContext<SaveContextValue>(LOCAL_VALUE);

/**
 * Routes every save to the signed-in account. On each uid change it hydrates
 * all stores (cloud copy wins, else local, else one-time legacy adoption) and
 * only then flips `isReady`, so no consumer ever reads the previous account's
 * data or a pre-hydration copy. Unconfigured builds use the `'local'` uid.
 */
export function SaveProvider({ children }: { children: ReactNode }) {
  const { uid: authUid, isLoading } = useAuth();

  // null = we don't know who the player is yet.
  const uid: string | null = !isFirebaseConfigured
    ? LOCAL_UID
    : (authUid ?? (isLoading ? null : LOCAL_UID));

  const [readyUid, setReadyUid] = useState<string | null>(null);

  useEffect(() => {
    if (uid === null) return;
    let cancelled = false;
    void Promise.all([
      progressionSaves.hydrate(uid),
      bestScoresSaves.hydrate(uid),
      dailySaves.hydrate(uid),
      campaignSaves.hydrate(uid),
    ]).then(() => {
      if (!cancelled) setReadyUid(uid);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const value = useMemo<SaveContextValue>(() => {
    const effective = uid ?? LOCAL_UID;
    return {
      uid: effective,
      isReady: uid !== null && readyUid === uid,
      ...storesFor(effective),
    };
  }, [uid, readyUid]);

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
}

/** The current account's stores. Safe without a provider (local, ready). */
export function useSaves(): SaveContextValue {
  return useContext(SaveContext);
}
```

Create `src/features/save/index.ts`:

```ts
export { SaveProvider, useSaves, type SaveContextValue } from './SaveProvider';
```

- [ ] **Step 4: Mount it in the provider tree**

In `app/_layout.tsx`, add the import after the `PremiumProvider` import:

```ts
import { SaveProvider } from '@/features/save';
```

and change the tree so `SaveProvider` sits directly under `AuthProvider`:

```tsx
          <AuthProvider>
            <SaveProvider>
              <PremiumProvider>
                <ProgressionProvider>
                  <ThemedNavigator />
                </ProgressionProvider>
              </PremiumProvider>
            </SaveProvider>
          </AuthProvider>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/features/save`
Expected: PASS (5 cases).

Do not commit yet — the mode hooks still import removed exports (Task 6 restores a green build).

---

### Task 5: `ProgressionProvider` follows the account; leaderboard sync waits for it

**Files:**
- Modify: `src/features/progression/ProgressionProvider.tsx:20,78-98`
- Create: `src/features/progression/ProgressionProvider.accounts.test.tsx`
- Modify: `src/features/progression/index.ts:9`
- Modify: `src/features/leaderboard/useLeaderboardSync.ts:19,30-40`

**Interfaces:**
- Consumes: `useSaves()` from Task 4.
- Produces: unchanged `ProgressionApi`; `isLoading` is now true again for the duration of every account switch.

- [ ] **Step 1: Write the failing test**

Create `src/features/progression/ProgressionProvider.accounts.test.tsx` (its own file so the module mocks below can't leak into the existing provider tests):

```tsx
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { INITIAL_PROGRESSION } from '@/domain';
import { SaveProvider } from '@/features/save';

import { progressionSaves } from './persistence';
import { ProgressionProvider, useProgression } from './ProgressionProvider';

// Pretend Firebase is configured so SaveProvider follows the auth uid, stub the
// Firestore adapter (cloud empty → hydrate keeps each uid's local copy), and
// drive the signed-in uid from the test.
jest.mock('@/config/env', () => ({ isFirebaseConfigured: true, firebaseConfig: {} }));
jest.mock('@/storage/cloudSaves', () => ({
  cloudSaves: { load: () => Promise.resolve(null), save: () => Promise.resolve() },
}));
const auth = { uid: 'guest-1' as string | null, isLoading: false };
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => auth }));

function Probe() {
  const { state, isLoading } = useProgression();
  return <Text>{isLoading ? 'loading' : `xp:${state.xp} coins:${state.coins}`}</Text>;
}

function Tree() {
  return (
    <SaveProvider>
      <ProgressionProvider>
        <Probe />
      </ProgressionProvider>
    </SaveProvider>
  );
}

describe('ProgressionProvider across accounts', () => {
  beforeEach(() => {
    auth.uid = 'guest-1';
  });
  afterEach(async () => {
    await progressionSaves.forUser('guest-1').clear();
    await progressionSaves.forUser('account-2').clear();
  });

  it('shows the signed-in account’s own progress, never the previous one’s', async () => {
    await progressionSaves.forUser('guest-1').write({ ...INITIAL_PROGRESSION, xp: 300 });
    await progressionSaves.forUser('account-2').write({ ...INITIAL_PROGRESSION, xp: 45 });

    const view = render(<Tree />);
    await screen.findByText('xp:300 coins:0');

    auth.uid = 'account-2';
    view.rerender(<Tree />);
    await screen.findByText('xp:45 coins:0');
  });

  it('is loading again while the new account is being read', async () => {
    const view = render(<Tree />);
    await screen.findByText('xp:0 coins:0');

    auth.uid = 'account-2';
    view.rerender(<Tree />);
    // Synchronously after the switch the old numbers must be gone.
    expect(screen.queryByText('xp:0 coins:0')).toBeNull();
    await screen.findByText('xp:0 coins:0');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/features/progression/ProgressionProvider.accounts`
Expected: FAIL — the first case times out waiting for `xp:45` (the provider reads the module-level store once and ignores uid changes).

- [ ] **Step 3: Make `ProgressionProvider` read from `useSaves()`**

In `src/features/progression/ProgressionProvider.tsx`:

Replace `import { progressionStore } from './persistence';` with:

```ts
import { useSaves } from '@/features/save';
```

Replace the body from `const [state, setState] = useState<ProgressionState>(INITIAL_PROGRESSION);` through the `commit` callback with:

```tsx
  const { uid, isReady, progression: store } = useSaves();
  const [state, setState] = useState<ProgressionState>(INITIAL_PROGRESSION);
  const [isLoading, setIsLoading] = useState(true);
  const ref = useRef<ProgressionState>(INITIAL_PROGRESSION);

  // (Re)load whenever the account changes. Reset first so a screen can never
  // show the previous account's numbers while the new one is being read.
  useEffect(() => {
    ref.current = INITIAL_PROGRESSION;
    setState(INITIAL_PROGRESSION);
    setIsLoading(true);
    if (!isReady) return;

    let cancelled = false;
    void store.read().then((loaded) => {
      if (cancelled) return;
      ref.current = loaded;
      setState(loaded);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [uid, isReady, store]);

  const commit = useCallback(
    (next: ProgressionState) => {
      ref.current = next;
      setState(next);
      void store.write(next);
    },
    [store],
  );
```

Update the provider's doc comment first line to: `Owns the signed-in account's persisted progression and exposes mutators that keep`.

- [ ] **Step 4: Export `progressionSaves` from the feature index**

In `src/features/progression/index.ts` change `export { progressionStore } from './persistence';` to:

```ts
export { LOCAL_UID, progressionSaves, progressionStore } from './persistence';
```

- [ ] **Step 5: Guard the leaderboard against publishing a half-loaded profile**

In `src/features/leaderboard/useLeaderboardSync.ts`:

```ts
  const { state, isLoading } = useProgression();
```

and in the effect:

```ts
  useEffect(() => {
    if (!isFirebaseConfigured || !isSignedIn || uid === null || isLoading) return;
    const key = `${uid}:${state.xp}:${displayName}`;
    if (key === lastPublished.current) return;
    lastPublished.current = key;
    void publishEntry(uid, {
      displayName,
      xp: state.xp,
      level: levelForXp(state.xp),
      updatedAt: Date.now(),
    });
  }, [uid, isSignedIn, isLoading, state.xp, displayName]);
```

(Without this, the `INITIAL_PROGRESSION` reset during an account switch would publish `xp: 0` to the new account's leaderboard row.)

- [ ] **Step 6: Run the progression and hint tests**

Run: `npx jest src/features/progression src/features/modes/hints src/features/leaderboard`
Expected: PASS — including the Task 3 case that was expected to fail (`awards a round and persists it` now persists to `chronos.progression:local`, which `progressionStore` reads).

Do not commit yet.

---

### Task 6: Mode hooks and the campaign map read the account's stores

**Files:**
- Modify: `src/features/modes/endless/useEndlessSession.ts:7,34-46`
- Modify: `src/features/modes/survival/useSurvivalSession.ts:7,44-63`
- Modify: `src/features/modes/daily/useDailySession.ts:9,52-70`
- Modify: `src/features/modes/campaign/useCampaignSession.ts:7,41-58`
- Modify: `src/features/modes/campaign/CampaignMapScreen.tsx:10,114-125`

**Interfaces:**
- Consumes: `useSaves()` → `{ isReady, bestScores, daily, campaign }`.
- Produces: no public interface change; each hook now waits for `isReady` before its first read.

- [ ] **Step 1: `useEndlessSession`**

Replace `import { bestScoresStore } from '../persistence';` with `import { useSaves } from '@/features/save';` (place it with the other `@/` imports, alphabetically after `@/features/round`). Then replace the best-score block:

```ts
  const { isReady, bestScores } = useSaves();
  const [best, setBest] = useState(0);
  useEffect(() => {
    if (!isReady) return;
    void bestScores.read().then((b) => setBest(b.endless));
  }, [isReady, bestScores]);

  // Keep the persisted best in step as the run climbs.
  useEffect(() => {
    if (!isReady || session.totalScore <= best) return;
    setBest(session.totalScore);
    void bestScores.read().then((b) => bestScores.write({ ...b, endless: session.totalScore }));
  }, [isReady, bestScores, session.totalScore, best]);
```

- [ ] **Step 2: `useSurvivalSession`**

Same import swap. Replace the best block:

```ts
  const { isReady, bestScores } = useSaves();
  const [best, setBest] = useState<{ rounds: number; score: number } | null>(null);
  useEffect(() => {
    if (!isReady) return;
    void bestScores.read().then((b) => setBest(b.survival));
  }, [isReady, bestScores]);

  // Record the finished run if it beats the stored best (by rounds, then score).
  const saved = useRef(false);
  useEffect(() => {
    if (!isReady || session.status !== 'finished' || saved.current) return;
    saved.current = true;
    const run = { rounds: session.results.length, score: session.totalScore };
    void bestScores.read().then((b) => {
      const beaten =
        run.rounds > b.survival.rounds ||
        (run.rounds === b.survival.rounds && run.score > b.survival.score);
      if (beaten) {
        void bestScores.write({ ...b, survival: run });
        setBest(run);
      }
    });
  }, [isReady, bestScores, session.status, session.results.length, session.totalScore]);
```

- [ ] **Step 3: `useDailySession`**

Change `import { dailyStore, type DailyRecord } from '../persistence';` to `import type { DailyRecord } from '../persistence';` and add `import { useSaves } from '@/features/save';` next to the `@/features/round` import. Replace the record effects:

```ts
  const { isReady, daily } = useSaves();
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Was today already played on a previous visit?
  useEffect(() => {
    if (!isReady) return;
    void daily.read().then((stored) => {
      if (stored && stored.date === today) setRecord(stored);
      setLoading(false);
    });
  }, [isReady, daily, today]);

  // Persist the run the moment it finishes, and feed the Daily streak
  // (idempotent per calendar day, so a re-render can't double-count).
  const saved = useRef(false);
  useEffect(() => {
    if (session.status !== 'finished' || saved.current) return;
    saved.current = true;
    const rec = buildRecord(today, session.results);
    void daily.write(rec);
    setRecord(rec);
    recordDailyCompleted();
  }, [session.status, session.results, today, daily, recordDailyCompleted]);
```

- [ ] **Step 4: `useCampaignSession`**

Replace `import { campaignStore } from '../persistence';` with `import { useSaves } from '@/features/save';` (with the `@/` imports). Replace the finished effect:

```ts
  const { campaign } = useSaves();
  const [earnedStars, setEarnedStars] = useState(0);
  const saved = useRef(false);
  useEffect(() => {
    if (session.status !== 'finished' || saved.current) return;
    saved.current = true;
    const stars = starsForResults(session.results);
    setEarnedStars(stars);
    void campaign.read().then((progress) => {
      void campaign.write({
        ...progress,
        [stage.id]: {
          stars: Math.max(stars, progress[stage.id]?.stars ?? 0),
          bestScore: Math.max(session.totalScore, progress[stage.id]?.bestScore ?? 0),
        },
      });
    });
  }, [campaign, session.status, session.results, session.totalScore, stage.id]);
```

- [ ] **Step 5: `CampaignMapScreen`**

Change `import { campaignStore, type CampaignProgress } from '../persistence';` to `import type { CampaignProgress } from '../persistence';`, add `import { useSaves } from '@/features/save';` after the `@/features/premium` import, and replace the focus effect:

```tsx
  const { isReady, campaign } = useSaves();
  const [progress, setProgress] = useState<CampaignProgress>({});

  useFocusEffect(
    useCallback(() => {
      if (!isReady) return;
      let active = true;
      void campaign.read().then((p) => {
        if (active) setProgress(p);
      });
      return () => {
        active = false;
      };
    }, [isReady, campaign]),
  );
```

- [ ] **Step 6: Make sure nothing still references the removed exports**

Run: `npx tsc --noEmit`
Expected: no errors. If any file still imports `bestScoresStore`, `dailyStore` or `campaignStore`, migrate it the same way (`useSaves()` + `isReady` gate).

Also run: `grep -rn "bestScoresStore\|dailyStore\|campaignStore" src app`
Expected: no matches.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS. Any mode test that renders a hook without a provider gets the local-uid default (`isReady: true`) and behaves as before.

- [ ] **Step 8: Commit Tasks 3–6 together**

```bash
git add src/features/progression/persistence.ts src/features/modes/persistence.ts \
  src/features/save src/features/progression/ProgressionProvider.tsx \
  src/features/progression/ProgressionProvider.accounts.test.tsx src/features/progression/index.ts \
  src/features/leaderboard/useLeaderboardSync.ts \
  src/features/modes/endless/useEndlessSession.ts src/features/modes/survival/useSurvivalSession.ts \
  src/features/modes/daily/useDailySession.ts src/features/modes/campaign/useCampaignSession.ts \
  src/features/modes/campaign/CampaignMapScreen.tsx app/_layout.tsx
git status --short src app   # verify only the files above are staged
git commit -m "feat: account-scoped saves — progress follows the signed-in uid and mirrors to Firestore"
```


---

### Task 7: Verification on device

**Files:** none (manual).

- [ ] **Step 1: Confirm the rules already cover the new path**

Read `firestore.rules` lines 33-40: `match /users/{uid}` with `match /{document=**} { allow read, write: if isOwner(uid); }` covers `users/{uid}/saves/{key}`. No deploy needed.

- [ ] **Step 2: Run on the dev build and exercise the flows**

Run: `npx expo start --dev-client` and open the app on the Android device.

1. As the launch guest, play one round of Endless so the museum has an item and XP is non-zero. Check Firestore console → `users/<guest uid>/saves/chronos.progression` exists with `data.xp > 0`.
2. Profile → Account → Sign in → `playreviewer@dateguesser.app` / password from Play Console sign-in details. Expected: XP 0, empty museum, fresh hearts; the Firestore path `users/tgVL7SVsdmRTOuKTZD3XvoxYdO82/saves/*` appears after the first write.
3. Play a round as the reviewer, then Sign out. Expected: a *new* guest with XP 0 (the old guest is parked, per spec non-goals).
4. Sign back in as the reviewer. Expected: the XP from step 3 is back (restored from local scoped key or cloud).
5. Uninstall, reinstall, sign in as the reviewer. Expected: same progress restored from Firestore.
6. Airplane mode, launch, play a round, exit airplane mode, background/foreground the app, play another round. Expected: no crash; the Firestore doc catches up on the second write.

- [ ] **Step 3: Record the outcome**

Append a dated bullet to the "Manual" line of the spec's Testing section stating which of steps 1–6 passed on which build id, and commit:

```bash
git add docs/superpowers/specs/2026-08-25-account-cloud-saves-design.md
git commit -m "docs: record device verification of account-scoped saves"
```
