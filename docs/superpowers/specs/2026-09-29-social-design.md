# Social: challenges and groups — design

Date: 2026-09-29 · Status: approved in conversation, awaiting spec review

## Goal

Turn the Leaderboard tab into **Social** and add two ways to play against people
you know:

- **Challenges** — asynchronous head-to-head. A player sends a link; the friend
  plays the same 8 questions; both see who won, round by round. Nobody has to be
  online at the same time.
- **Groups** — private leaderboards (family, work, class) joined by invite
  link or code, ranked on this week's XP.

Success looks like: a challenge link sent over WhatsApp opens straight into the
challenge for someone who has the app, and to a landing page with the code and a
store button for someone who doesn't; results can't be faked by editing a
client; the global leaderboard keeps working exactly as today.

### Out of scope (v1)

- Push notifications ("Sam beat your score") — a follow-up once challenges are
  used. v1 shows a badge on the Social tab instead.
- Live, simultaneous duels; friend lists; chat.
- Moderation beyond the existing player-name blocklist.

## Constraints and facts this design rests on

- Every player has a Firebase uid: guests are signed in anonymously at launch;
  Google/Apple link onto the same uid. A guest's uid is lost on reinstall.
- Display names come from `resolveDisplayName` (chosen name or a generated
  handle); real Google/Apple names are never shown.
- `leaderboard/{uid}` rows already carry `weekKey` + `weekXp`; house rows
  (`house-*` ids) are fake competitors and must never appear in groups.
- Firestore rules end in a deny-all catch-all; there is no server-side score
  validation today.
- Nothing in the app handles incoming URLs; Firebase Hosting serves `web/` at
  `https://history-date-timeline-guesser.web.app`.
- Question pools can differ between builds (bundled catalogue per build), so a
  challenge stores **question ids**, never a seed.
- Cloud Functions: v2 callables in `us-central1`, Node 22, deployed with
  `firebase deploy --only functions`.

## 1. Data model

All collections below are **written only by Cloud Functions** (Admin SDK).
Clients read.

### `challenges/{code}`

`code`: 6 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I).

| field | type | notes |
|---|---|---|
| `creatorUid` | string | |
| `creatorName` | string | display name at creation |
| `questionIds` | string[8] | the questions both players get |
| `createdAt` | number (ms) | |
| `expiresAt` | number (ms) | `createdAt + 7 days`; entries rejected after |

Subcollection `challenges/{code}/entries/{uid}`:

| field | type | notes |
|---|---|---|
| `name` | string | display name at submission |
| `guessYears` | number[8] | as submitted (whole years) |
| `roundScores` | number[8] | computed server-side |
| `total` | number | sum of `roundScores` |
| `finishedAt` | number (ms) | |

The creator plays too (their entry is submitted like anyone else's). Any number
of friends may accept the same challenge; the head-to-head view compares the
viewer with the creator (or, for the creator, lists every challenger).

### `groups/{groupId}`

| field | type | notes |
|---|---|---|
| `name` | string | 3–24 chars, `validatePlayerName` rules + blocklist |
| `ownerUid` | string | |
| `inviteCode` | string | 6 chars, same alphabet; unique (see `groupInvites`) |
| `memberUids` | string[] | max **30** (one `documentId in` query) |
| `createdAt` | number (ms) | |

`groupInvites/{inviteCode}` → `{ groupId }` — lookup table so `joinGroup` can
resolve a code in one read. Not client-readable.

### `users/{uid}/social/state`

Owner read/write (existing `users/{uid}/**` rule already allows it):
`{ groupIds: string[], challengeCodes: string[], seen: Record<code, number> }`
— `groupIds`/`challengeCodes` are maintained by the functions (Admin SDK);
`seen` (last entry count seen per challenge) is written by the client and
drives the Social tab badge.

## 2. Cloud Functions (`functions/src/social/`)

All `onCall` v2, `us-central1`, require `request.auth`. Errors use
`HttpsError` codes the app maps to friendly copy.

- **`createChallenge({ questionIds? })`** — if `questionIds` (exactly 8 known
  ids) is given, use it ("challenge a friend with these questions" after a
  run); otherwise draw 8 at random from the server catalogue's in-rotation
  pool. Mint a unique code (retry on collision), write the doc, append the code
  to the creator's `social/state`. Returns `{ code, url }`.
- **`submitChallengeEntry({ code, guessYears })`** — reject if missing, expired,
  wrong length, non-integer years, or an entry for this uid already exists
  (transaction). Score each round with the shared `scoreForError` (no combos,
  no streak bonus, no multiple choice) against the server catalogue's years.
  Write the entry, append the code to the player's `social/state`. Returns the
  entry.
- **`createGroup({ name })`** — validate name, mint `inviteCode`, write group +
  invite, add to owner's `social/state`. Max 10 groups per player.
- **`joinGroup({ inviteCode })`** — resolve, reject if full (30) or already a
  member, add uid in a transaction.
- **`leaveGroup({ groupId })`** — remove uid; if the owner leaves, ownership
  passes to the longest-standing member; an empty group is deleted with its
  invite.

**Server catalogue.** `functions/src/social/catalogue.json` = `{ id: year }` for
every question plus an `inRotation` flag, generated by
`scripts/exportCatalogueForFunctions.ts` from `src/data` and run in the
functions `predeploy`. Scoring code is shared by copying
`src/features/timeline/math/scoring.ts`'s `scoreForError` into
`functions/src/social/scoring.ts` with a test that pins both to the same table.

## 3. Firestore rules and indexes

New blocks before the catch-all:

- `challenges/{code}`: `allow read: if isSignedIn();` `allow write: if false;`
- `challenges/{code}/entries/{uid}`: `allow read: if isSignedIn();` `allow write: if false;`
- `groups/{groupId}`: `allow read: if isSignedIn() && request.auth.uid in resource.data.memberUids;` `allow write: if false;`
- `groupInvites/{code}`: `allow read, write: if false;`

Group boards read `leaderboard` by `documentId() in memberUids` (existing
public read); no new index. Challenge lists read `challenges` by code from
`social/state`; no query index needed.

## 4. Links

- URLs: `https://history-date-timeline-guesser.web.app/c/{code}` (challenge),
  `/g/{code}` (group invite).
- Hosting: `web/c/index.html` and `web/g/index.html` (one shared script) read
  the code from the path (rewrites `/c/**` → `/c/index.html`, `/g/**` →
  `/g/index.html`) and show a generic invitation ("You've been challenged to 8
  history questions" / "You've been invited to a group"), the code in large
  type, and store buttons. No Firestore read: web visitors aren't signed in and
  the rules only allow signed-in reads.
- Android App Links: `web/.well-known/assetlinks.json` listing the three
  package names (prod, `.preview`, `.dev`) with their signing SHA-256s — prod's
  from Play Console → App integrity (**user to supply**); `android.intentFilters`
  in `app.config.ts` for `https` host `history-date-timeline-guesser.web.app`,
  path prefixes `/c/` and `/g/`, `autoVerify: true`.
- iOS: `ios.associatedDomains: ['applinks:history-date-timeline-guesser.web.app']`
  and `web/.well-known/apple-app-site-association` (served as JSON). Inert until
  an iOS build exists.
- App routes: `app/c/[code].tsx` → challenge screen; `app/g/[code].tsx` → join
  group confirmation. Both work from the in-app "Enter code" field too, so old
  builds (no link handling) and the landing page's code path still work.

## 5. App

### Social tab

`app/(tabs)/leaderboard.tsx` is renamed to `social.tsx` (tab title "Social", 👥).
Top segmented control: **Global · Groups · Challenges** (last choice remembered
in the existing view store).

- **Global** — the current `LeaderboardScreen` content, unchanged (extracted
  into `GlobalBoard`).
- **Challenges** — "⚔️ Challenge a friend" (creates a random challenge, opens the
  share sheet with the link and a one-line message), "Enter code", then the
  player's challenges newest first with status: *Waiting for friends* /
  *You won 5,120–4,380* / *Sam won* / *3 friends played*. Tapping opens the
  head-to-head screen.
- **Groups** — "Create group" / "Join with code", then the player's groups. A
  group screen shows its weekly board (members' `weekXp` for the current week,
  you highlighted, players with no row shown at 0), invite (share link) and
  leave.

### Playing a challenge

A `ChallengeScreen` reuses `RoundView` with the plain Submit button (no hearts
spent, no coins, no hint, no multiple choice; `useRoundRewards` not mounted).
On finish it calls `submitChallengeEntry` and shows the **head-to-head** screen:
both totals, a winner banner, and eight rows (question, both guesses, both
scores, ✓ on the closer guess). If the player already has an entry, opening the
link goes straight to head-to-head. Expired challenges show a friendly message.

### Entry points

- Daily and Campaign summaries: "⚔️ Challenge a friend with these questions"
  (calls `createChallenge({ questionIds })` with the run's ids).
- Social tab badge: dot when any challenge in `challengeCodes` has more entries
  than `seen` records (checked on app focus, at most once a minute).
- Guests creating or joining a group see the existing Back-up-to-Google nudge
  first (skippable).

### Offline / errors

Callables fail → toast with retry; the challenge run is kept in memory so a
failed submit can be retried from the results screen. No offline queue in v1.

### Analytics

`challenge_created {source: 'random'|'daily'|'campaign'}`,
`challenge_opened {via: 'link'|'code'}`, `challenge_completed {won}`,
`group_created`, `group_joined {via}`, `group_left` — added to `events.ts`.

## 6. Testing

- Functions (node:test, existing `functions/` setup): scoring parity with the
  app table; one entry per uid; expiry; bad codes; 30-member cap; owner
  hand-over; name validation.
- Rules: emulator test that clients cannot write any new collection and can
  read only what's listed.
- App (Jest): Social tab segments; challenge list statuses; head-to-head
  winner/ties; link routes parse codes; ChallengeScreen submits guess years and
  spends no hearts/coins.

## 7. Rollout

1. Deploy rules, indexes (none new), functions and Hosting (explicit yes at the
   time; `firebase deploy`).
2. Ship the app build (native rebuild for intent filters).
Old builds ignore the new collections; the landing page's code works for
players on builds without link handling once they update.

## Open items for the user

- Play signing SHA-256 for `assetlinks.json` (Play Console → App integrity →
  App signing key certificate).
