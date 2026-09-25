/**
 * Play Games → Firebase account bridge.
 *
 * The app's Play Games Services v2 session cannot become a Firebase login on
 * the client (the JS SDK has no Play Games provider), so the app hands us a
 * one-time server auth code instead. We prove the Play identity by exchanging
 * it with Google, look the player up, and either bind them to the calling
 * Firebase uid or mint a custom token for the uid they were bound to before.
 * See docs/superpowers/specs/2026-09-25-play-games-account-bridge-design.md.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

import { decideLink, type LinkAction } from './link';

initializeApp();

/** Web OAuth client the app passes to `requestServerSideAccess`. */
const OAUTH_CLIENT_ID = defineString('PGS_OAUTH_CLIENT_ID');
/** Its client secret, from Google Cloud Console → Credentials. */
const OAUTH_CLIENT_SECRET = defineSecret('PGS_OAUTH_CLIENT_SECRET');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PLAYER_URL = 'https://games.googleapis.com/games/v1/players/me';
const MAPPINGS = 'playGamesPlayers';

interface ExchangeRequest {
  serverAuthCode?: unknown;
  forceToken?: unknown;
}

export interface ExchangeResponse {
  action: LinkAction;
  uid: string;
  /** Custom token to sign in with, or null when the caller should stay put. */
  token: string | null;
}

async function accessTokenFor(code: string): Promise<string> {
  const body = new URLSearchParams({
    code,
    client_id: OAUTH_CLIENT_ID.value(),
    client_secret: OAUTH_CLIENT_SECRET.value(),
    grant_type: 'authorization_code',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    logger.warn('token exchange failed', { status: res.status, body: await res.text() });
    throw new HttpsError('permission-denied', 'Play Games code could not be verified.');
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new HttpsError('permission-denied', 'Play Games code could not be verified.');
  }
  return json.access_token;
}

async function playerIdFor(accessToken: string): Promise<string> {
  const res = await fetch(PLAYER_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    logger.warn('players/me failed', { status: res.status, body: await res.text() });
    throw new HttpsError('permission-denied', 'Play Games player could not be read.');
  }
  const json = (await res.json()) as { playerId?: string };
  if (!json.playerId) throw new HttpsError('internal', 'Play Games returned no player id.');
  return json.playerId;
}

export const exchangePlayGamesCode = onCall<ExchangeRequest, Promise<ExchangeResponse>>(
  { region: 'us-central1', secrets: [OAUTH_CLIENT_SECRET], maxInstances: 5 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
    const code = request.data?.serverAuthCode;
    if (typeof code !== 'string' || code.length === 0 || code.length > 2048) {
      throw new HttpsError('invalid-argument', 'serverAuthCode is required.');
    }
    const forceToken = request.data?.forceToken === true;

    const callerUid = request.auth.uid;
    const callerIsAnonymous = request.auth.token.firebase.sign_in_provider === 'anonymous';

    const playerId = await playerIdFor(await accessTokenFor(code));

    const db = getFirestore();
    const ref = db.collection(MAPPINGS).doc(playerId);
    const decision = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const mappedUid = snap.exists ? ((snap.data()?.uid as string | undefined) ?? null) : null;
      const d = decideLink({ callerUid, callerIsAnonymous, mappedUid, forceToken });
      if (d.action === 'link') {
        tx.set(ref, { uid: callerUid, linkedAt: FieldValue.serverTimestamp() });
      }
      return d;
    });

    logger.info('play games bridge', { action: decision.action, callerIsAnonymous });

    const token = decision.mintToken
      ? await getAuth().createCustomToken(decision.uid, { playGamesPlayerId: playerId })
      : null;
    return { action: decision.action, uid: decision.uid, token };
  },
);
