# Account-scoped cloud saves — design

**Date:** 2026-08-25
**Status:** approved in chat, pending implementation plan

## Problem

All player progress lives in four device-local AsyncStorage keys that ignore
who is signed in:

| Store | Key | Contents |
|---|---|---|
| `progressionStore` | `chronos.progression` | XP, coins, achievements, stats, streak, museum collection, hearts |
| `bestScoresStore` | `chronos.bestScores` | Endless / Survival bests |
| `dailyStore` | `chronos.daily` | Today's Daily record |
| `campaignStore` | `chronos.campaign` | Per-stage stars and best score |

`ProgressionProvider` reads its store once at launch and never re-reads on auth
changes. Signing into a different account on the same device therefore shows
the device's progress (observed: the fresh Play-reviewer account saw museum
unlocks), and progress never follows an account to another device or survives
a reinstall.

## Goals

- Progress belongs to the signed-in Firebase uid, not the device.
- Signing into an account shows *that account's* progress; the account's saved
  state wins over whatever the device holds ("account wins").
- Progress is mirrored to Firestore so it survives reinstall and follows the
  player across devices.
- Offline play, and builds with no Firebase config, behave exactly as today.
- Guest → account upgrade (credential linking, uid preserved) keeps progress
  with no special handling.

## Non-goals

- Merging two progress sets. Guest progress is parked under the guest uid, not
  merged into the account.
- Resurrecting an old guest session after sign-out (sign-out creates a *new*
  anonymous uid; the old guest's data stays on disk but is orphaned).
- Real-time multi-device sync or conflict resolution beyond last-write-wins.
- Any Firestore rules change — `users/{uid}/**` is already owner-only.

## Design

### 1. Storage layer — `createScopedStore`

New `src/storage/createScopedStore.ts`, built on the existing `createStore`
and `Storage` contract:

```ts
interface ScopedStoreConfig<T> {
  key: string;            // e.g. 'chronos.progression'
  schema: z.ZodType<T>;
  fallback: T;
  storage?: Storage;      // defaults to asyncStorage
  cloud?: CloudSaves;     // absent → local-only (offline builds, tests)
  debounceMs?: number;    // write → cloud trailing debounce, default 1000
  hydrateTimeoutMs?: number; // cloud read bound, default 4000
}

interface ScopedStore<T> {
  /** A Store<T> whose local key is `${key}:${uid}`; writes mirror to cloud. */
  forUser(uid: string): Store<T>;
  /**
   * Pull the account's cloud copy (cloud wins) before any reader sees the uid,
   * adopting legacy unscoped data once if neither cloud nor scoped-local exist.
   */
  hydrate(uid: string): Promise<void>;
}
```

`forUser(uid).write(v)` writes the local scoped key first, sets a **dirty
marker** at `${key}:${uid}:dirty`, then schedules a cloud `save(uid, key, v)`
with a ~1 s trailing debounce per (uid, key); last write wins. The marker is
cleared only when `cloud.save` resolves, so a rejected flush — or the app being
killed inside the debounce — leaves durable evidence that the cloud is behind.
Cloud failures are otherwise swallowed (same policy as
`leaderboard/publishEntry`): the local copy is always the source of truth for
this session.

`uid === 'local'` (`LOCAL_UID`, exported from `createScopedStore`) is the
no-account uid: unconfigured builds, and configured builds whose anonymous
sign-in failed. Its saves are **never** mirrored — `forUser('local')` returns
the plain local store even when a `cloud` adapter is configured — so progress
can't be filed against a cloud document nobody owns and then orphaned.

`hydrate(uid)`:

0. Read and remove the adoption sources: the **legacy unscoped key** (`key`),
   and — for a real uid — any `${key}:local` copy left by a session that ran
   without an account. Both are removed whichever (if either) is used, so a
   later uid on the same device can never inherit them. Legacy unscoped data
   takes precedence when both exist.
1. If the dirty marker is set **and** a local scoped copy exists → push that
   copy to the cloud (clearing the marker on success) and stop. **Unflushed
   local writes win**; pulling here would silently discard a whole offline
   session.
2. Else `cloud.load(uid, key)`, raced against `hydrateTimeoutMs` (4 s) → if a
   doc exists and validates against `schema`, write it to the local scoped key.
   **Cloud wins.**
3. Else if the local scoped key exists → keep it (offline, or a cloud write
   that never landed).
4. Else if step 0 captured valid data → copy it to the scoped key, mark it
   dirty and push it to the cloud (clearing the marker on success). This runs
   at most once per device per key because the sources were removed.
5. Else → nothing; `read()` returns `fallback`.

Cloud reads that fail, or that are slower than the 4 s bound, fall through to
step 3, so an offline launch still loads the last local state promptly. A late
result from a timed-out read is ignored.

A `CloudSaves` adapter (`src/storage/cloudSaves.ts`) wraps Firestore:

```ts
interface CloudSaves {
  load(uid: string, key: string): Promise<unknown | null>;
  save(uid: string, key: string, value: unknown): Promise<void>;
}
```

Documents live at `users/{uid}/saves/{key}` with shape
`{ data: <blob>, updatedAt: <ms> }`. The adapter imports
`firebase/firestore` lazily, like the leaderboard service, so offline builds
never load it.

### 2. Ownership of the uid — `SaveProvider`

New `src/features/save/SaveProvider.tsx`, mounted in `app/_layout.tsx` below
`AuthProvider` and above `PremiumProvider`/`ProgressionProvider`:

```ts
interface SaveContext {
  uid: string;           // Firebase uid, or 'local' when Firebase is not configured
  isReady: boolean;      // false until every store has hydrated for this uid
  progression: Store<ProgressionState>;
  bestScores: Store<BestScores>;
  daily: Store<DailyRecord | null>;
  campaign: Store<CampaignProgress>;
}
```

On every `useAuth().uid` change it calls `hydrate(uid)` on all four scoped
stores in parallel, then publishes the `forUser(uid)` stores with
`isReady = true`. A stale hydration (uid changed mid-flight) is discarded.
The context switches to the *new* uid's stores immediately with
`isReady = false`; consumers must not `read()` until `isReady` is true, so no
reader ever sees the previous account's data or a pre-hydration copy.

Offline builds (`!isFirebaseConfigured`) use uid `'local'` and stores with no
`cloud` adapter — byte-for-byte the same local behaviour as today apart from
the key suffix (handled by the legacy adoption step).

### 3. Consumers

- `ProgressionProvider` takes `progression` and `isReady` from `useSaves()`.
  Its load effect depends on `[uid, isReady]`: it resets to
  `INITIAL_PROGRESSION` + `isLoading = true` when the uid changes, then reads
  the new store. Mutators commit through the store for the *current* uid (the
  ref-mirror pattern stays).
- `useDailySession`, `useEndlessSession`, `useSurvivalSession`,
  `useCampaignSession`, `CampaignMapScreen` swap the module-level singleton
  for `useSaves().<store>`; their `read()/write()` calls are unchanged.
- `modes/persistence.ts` and `progression/persistence.ts` export the
  *scoped* stores (schemas and fallbacks unchanged). Nothing else imports the
  old singletons.

### 4. Account-switch semantics

| Event | uid | Result |
|---|---|---|
| First launch | new anonymous uid | Legacy device data adopted (if any), else fresh |
| Guest links email/Google | unchanged | Progress continues; already in cloud |
| Sign in to existing account | account uid | Cloud save for that account replaces the view (account wins) |
| Sign out | new anonymous uid | Fresh guest; old guest data parked on disk |
| Reinstall, sign in | account uid | Cloud save restored |

### 5. Failure handling

- Cloud unreachable on hydrate → local scoped copy (or fallback). Play continues.
- Cloud slow on hydrate → after 4 s the read is abandoned (its late result is
  ignored) and hydration continues offline. Launch is never blocked on the network.
- Cloud write fails → ignored, and the dirty marker stays set; retried on the
  next write of that key *and* pushed by the next `hydrate` for that uid, so an
  offline session, a flush rejected at sign-out, or a kill inside the debounce
  is not lost.
- Malformed cloud doc → ignored (Zod), local used. Never overwrite a good local
  copy with an invalid cloud one.
- Firestore denies (rules) → treated as unreachable.
- Anonymous sign-in fails in a configured build → the session runs under
  `'local'` with no cloud mirror at all; the first real uid adopts that copy
  once (moving it to its own key and pushing it) rather than leaving it stranded.

### 6. Testing

- `createScopedStore.test.ts` with an in-memory `Storage` and a fake
  `CloudSaves`: key scoping; hydrate cloud-wins; hydrate keeps local when cloud
  empty; legacy adoption happens once and pushes to cloud; invalid cloud doc
  ignored; write debounces and flushes last value; cloud failure doesn't reject.
- `SaveProvider.test.tsx`: uid change re-hydrates and flips `isReady`; stale
  hydration discarded; offline build yields uid `'local'`.
- `ProgressionProvider.test.tsx`: existing cases pass through a test
  `SaveProvider`; new case — switching uid shows the other account's state.
- Manual: on the dev device, sign in as `playreviewer@…` → fresh profile
  (no museum items); sign out → guest progress returns; reinstall → signed-in
  progress restored from cloud.

## Files

- New: `src/storage/createScopedStore.ts` (+ test), `src/storage/cloudSaves.ts`,
  `src/features/save/SaveProvider.tsx` (+ test), `src/features/save/index.ts`
- Changed: `src/storage/index.ts`, `src/features/progression/persistence.ts`,
  `src/features/progression/ProgressionProvider.tsx` (+ test),
  `src/features/modes/persistence.ts`, the four mode session hooks,
  `src/features/modes/campaign/CampaignMapScreen.tsx`, `app/_layout.tsx`
