# Play Games account bridge — design (2026-09-25)

## Goal

Progress follows the player's Google Play account with zero taps. Today Play
Games Services (PGS) v2 auto sign-in already runs at launch, but the Firebase
JS SDK cannot turn that session into a Firebase login, so progress stays on a
guest uid until the player taps "Continue with Google". This bridge closes the
gap with one small Cloud Function.

## Flow

1. On launch, after the existing silent Google restore has had its chance, the
   app checks `PlayGames.isAuthenticated()`. If true it asks the native module
   for a one-time server auth code (`requestServerSideAccess(webClientId)`).
2. The app calls the callable function `exchangePlayGamesCode` with that code.
   The call carries the caller's Firebase ID token (guest or real account).
3. The function exchanges the code with Google OAuth (client id + secret),
   reads the PGS `playerId` from `games/v1/players/me`, and consults
   `playGamesPlayers/{playerId}` in Firestore:
   - no mapping → write `{ uid: callerUid }`; return `action: 'link'`. The
     guest uid keeps everything; nothing migrates.
   - mapping == callerUid → `action: 'none'`.
   - mapping != callerUid and caller is anonymous → mint a custom token for
     the mapped uid; return `action: 'sign-in'`. Guest progress is parked,
     consistent with the existing "account wins" rule.
   - mapping != callerUid and caller has a real account → `action:
     'conflict'`, mapping untouched, no token. A Google-linked account keeps
     priority; Play identity does not hijack it.
   - `forceToken: true` (used for re-authentication) → a token for the
     caller's own uid when the mapping points at it.
4. If a token comes back the app calls `signInWithCustomToken`. The persisted
   session survives restarts, so this normally happens once per device.

## Security

- The function requires a Firebase-authenticated caller and verifies the PGS
  identity server-side via the code exchange; the client never sends a player
  id it chose itself.
- `playGamesPlayers` is deny-all in Firestore rules; only the Admin SDK writes
  it.
- The OAuth client secret lives in a Functions secret
  (`PGS_OAUTH_CLIENT_SECRET`); the web client id is a plain param
  (`PGS_OAUTH_CLIENT_ID`).

## Client changes

- `services/playGames.ts`: `requestPlayGamesServerAuthCode(webClientId)`.
- `services/firebase/playGamesBridge.ts`: callable wrapper (lazy
  `firebase/functions` import, so Jest never loads it).
- `services/firebase/auth.tsx`: the once-per-launch identity restore becomes
  one sequence: silent Google restore (if guest) → Play Games bridge. New
  `reauthenticate` branch for provider-less (custom token) accounts re-runs
  the bridge with `forceToken`.
- `hasAccount` is true for Play Games accounts (`isAnonymous` is false for a
  custom-token session). Profile shows "Google Play Games" as the account.
- Analytics: `sign_in_completed` gains `method: 'playgames'`.

## Console prerequisites (owner)

1. Firebase project on the Blaze plan.
2. Google Cloud Console → Credentials → the web OAuth client
   `192520909417-birsbps…` → copy its client secret →
   `firebase functions:secrets:set PGS_OAUTH_CLIENT_SECRET`.
3. Play Console → Play Games Services → Setup → Credentials → add a
   **Game server** credential pointing at that same web OAuth client.
4. Publish the Play Games Services configuration (Draft = testers only).
5. Grant the function's service account "Service Account Token Creator" on
   itself if `createCustomToken` reports a signBlob permission error.

## Out of scope

Merging guest progress into an existing account (parking stays), iOS.
