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

`forUser(uid).write(v)` writes the local scoped key first, then schedules a
cloud `save(uid, key, v)` with a ~1 s trailing debounce per (uid, key);
last write wins. Cloud failures are swallowed (same policy as
`leaderboard/publishEntry`): the local copy is always the source of truth for
this session.

`hydrate(uid)`:

1. `cloud.load(uid, key)` → if a doc exists and validates against `schema`,
   write it to the local scoped key. **Cloud wins.**
2. Else if the local scoped key exists → keep it (offline, or a cloud write
   that never landed).
3. Else if the **legacy unscoped key** (`key`) exists and validates → copy it
   to the scoped key, push it to the cloud, then delete the legacy key. This
   runs at most once per device per key because the legacy key is removed.
4. Else → nothing; `read()` returns `fallback`.

Cloud reads that fail (offline) fall through to step 2, so an offline launch
still loads the last local state.

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
- Cloud write fails → ignored; retried naturally on the next write of that key.
- Malformed cloud doc → ignored (Zod), local used. Never overwrite a good local
  copy with an invalid cloud one.
- Firestore denies (rules) → treated as unreachable.

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
