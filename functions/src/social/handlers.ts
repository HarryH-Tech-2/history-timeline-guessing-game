import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';

import { hasQuestion, rotationPool, yearOf } from './catalogue';
import { isValidCode, mintCode } from './codes';
import { validateGroupName } from './names';
import {
  afterLeave,
  canJoinGroup,
  CHALLENGE_SIZE,
  CHALLENGE_TTL_MS,
  entryVerdict,
  MAX_GROUPS_PER_PLAYER,
  pickQuestionIds,
  validateGuessYears,
} from './rules';
import { scoreEntry } from './scoring';

const REGION = 'us-central1';
const HOST = 'https://history-date-timeline-guesser.web.app';
const opts = { region: REGION, maxInstances: 10 } as const;

export interface ChallengeEntryDoc {
  name: string;
  guessYears: number[];
  roundScores: number[];
  total: number;
  finishedAt: number;
}

function uidOf(req: CallableRequest<unknown>): string {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
  return uid;
}

function nameOf(raw: unknown): string {
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim().slice(0, 24) : 'A player';
}

export function parseQuestionIds(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length !== CHALLENGE_SIZE) return null;
  if (!raw.every((id): id is string => typeof id === 'string' && hasQuestion(id))) return null;
  return new Set(raw).size === CHALLENGE_SIZE ? raw : null;
}

const socialState = (uid: string) =>
  getFirestore().collection('users').doc(uid).collection('social').doc('state');

const MAX_CODE_ATTEMPTS = 8;

/** Firestore's ALREADY_EXISTS (gRPC 6): a create() hit a doc that is already there. */
function isAlreadyExists(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  return code === 6 || code === 'already-exists';
}

/**
 * Run `write` with a freshly minted code. `write` must create() the coded doc,
 * so a collision fails the write itself (no check-then-write race); it is
 * retried with a new code a bounded number of times.
 */
export async function withFreshCode<T>(
  write: (code: string) => Promise<T>,
  mint: () => string = mintCode,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await write(mint());
    } catch (e) {
      if (!isAlreadyExists(e)) throw e;
    }
  }
  throw new HttpsError('resource-exhausted', 'Could not mint a code, try again.');
}

export type CreateRequest =
  | { kind: 'ok'; questionIds: string[]; guessYears: number[] | null }
  | { kind: 'invalid'; reason: string };

/**
 * No ids: a random challenge. Ids from a finished run may bring that run's
 * guesses, which become the creator's entry; guesses alone mean nothing.
 */
export function parseCreateChallenge(data: { questionIds?: unknown; guessYears?: unknown }): CreateRequest {
  if (data.questionIds === undefined) {
    if (data.guessYears !== undefined) return { kind: 'invalid', reason: 'Guesses need their questions.' };
    return { kind: 'ok', questionIds: pickQuestionIds(rotationPool()), guessYears: null };
  }
  const questionIds = parseQuestionIds(data.questionIds);
  if (!questionIds) return { kind: 'invalid', reason: 'Unknown questions.' };
  if (data.guessYears === undefined) return { kind: 'ok', questionIds, guessYears: null };
  const guessYears = validateGuessYears(data.guessYears);
  if (!guessYears) return { kind: 'invalid', reason: 'Bad guesses.' };
  return { kind: 'ok', questionIds, guessYears };
}

/** Server-side score of guesses against the catalogue's true years. */
export function scoreGuesses(
  questionIds: readonly string[],
  guessYears: readonly number[],
): { roundScores: number[]; total: number } {
  const years = questionIds.map((id) => yearOf(id));
  if (years.some((y) => y === undefined)) throw new HttpsError('internal', 'Catalogue mismatch.');
  return scoreEntry(years as number[], guessYears);
}

export const createChallenge = onCall(opts, async (req) => {
  const uid = uidOf(req);
  const data = (req.data ?? {}) as { questionIds?: unknown; guessYears?: unknown; name?: unknown };
  const parsed = parseCreateChallenge(data);
  if (parsed.kind === 'invalid') throw new HttpsError('invalid-argument', parsed.reason);
  const { questionIds, guessYears } = parsed;
  const name = nameOf(data.name);
  const db = getFirestore();
  const code = await withFreshCode(async (code) => {
    const now = Date.now();
    const challengeRef = db.collection('challenges').doc(code);
    // One batch: the challenge, the creator's entry (when they already played
    // these questions) and their list of codes land together or not at all.
    const batch = db.batch();
    batch.create(challengeRef, {
      creatorUid: uid,
      creatorName: name,
      questionIds,
      createdAt: now,
      expiresAt: now + CHALLENGE_TTL_MS,
    });
    if (guessYears) {
      const entry: ChallengeEntryDoc = {
        name,
        guessYears,
        ...scoreGuesses(questionIds, guessYears),
        finishedAt: now,
      };
      batch.create(challengeRef.collection('entries').doc(uid), entry);
    }
    batch.set(socialState(uid), { challengeCodes: FieldValue.arrayUnion(code) }, { merge: true });
    await batch.commit();
    return code;
  });
  return { code, url: `${HOST}/c/${code}` };
});

export const submitChallengeEntry = onCall(opts, async (req) => {
  const uid = uidOf(req);
  const data = (req.data ?? {}) as { code?: unknown; guessYears?: unknown; name?: unknown };
  if (!isValidCode(data.code)) throw new HttpsError('invalid-argument', 'Bad code.');

  const db = getFirestore();
  const challengeRef = db.collection('challenges').doc(data.code);
  // One entry doc per uid: different players never write the same doc, so
  // concurrent entries from different players cannot overwrite each other.
  // The transaction only has to serialise one uid racing itself.
  const entryRef = challengeRef.collection('entries').doc(uid);
  const code = data.code;

  return db.runTransaction(async (tx) => {
    const [challenge, existing] = await Promise.all([tx.get(challengeRef), tx.get(entryRef)]);
    const c = challenge.exists
      ? (challenge.data() as { questionIds: string[]; expiresAt: number })
      : undefined;
    const verdict = entryVerdict({
      challenge: c,
      entryExists: existing.exists,
      guessYears: data.guessYears,
      now: Date.now(),
    });
    switch (verdict.kind) {
      case 'invalid-guesses':
        throw new HttpsError('invalid-argument', 'Bad guesses.');
      case 'not-found':
        throw new HttpsError('not-found', 'No such challenge.');
      case 'expired':
        throw new HttpsError('failed-precondition', 'Challenge expired.');
      case 'already-entered':
        throw new HttpsError('already-exists', 'Already played.');
      case 'ok':
        break;
    }
    const { roundScores, total } = scoreGuesses(c!.questionIds, verdict.guessYears);
    const doc: ChallengeEntryDoc = {
      name: nameOf(data.name),
      guessYears: verdict.guessYears,
      roundScores,
      total,
      finishedAt: Date.now(),
    };
    // create(), not set(): the write itself fails if an entry already exists,
    // so a stored entry can never be replaced.
    tx.create(entryRef, doc);
    tx.set(socialState(uid), { challengeCodes: FieldValue.arrayUnion(code) }, { merge: true });
    return doc;
  });
});

export const createGroup = onCall(opts, async (req) => {
  const uid = uidOf(req);
  const check = validateGroupName((req.data as { name?: unknown } | undefined)?.name);
  if (!check.ok) throw new HttpsError('invalid-argument', check.reason);
  const db = getFirestore();
  const state = await socialState(uid).get();
  const groupIds = (state.data()?.groupIds as string[] | undefined) ?? [];
  if (groupIds.length >= MAX_GROUPS_PER_PLAYER) {
    throw new HttpsError('failed-precondition', 'You are in too many groups.');
  }
  return withFreshCode(async (inviteCode) => {
    const groupRef = db.collection('groups').doc();
    const batch = db.batch();
    batch.set(groupRef, {
      name: check.name,
      ownerUid: uid,
      inviteCode,
      memberUids: [uid],
      createdAt: Date.now(),
    });
    // create(): a taken invite code fails the whole batch, which retries with a new code.
    batch.create(db.collection('groupInvites').doc(inviteCode), { groupId: groupRef.id });
    batch.set(socialState(uid), { groupIds: FieldValue.arrayUnion(groupRef.id) }, { merge: true });
    await batch.commit();
    return { groupId: groupRef.id, inviteCode, url: `${HOST}/g/${inviteCode}` };
  });
});

export const joinGroup = onCall(opts, async (req) => {
  const uid = uidOf(req);
  const inviteCode = (req.data as { inviteCode?: unknown } | undefined)?.inviteCode;
  if (!isValidCode(inviteCode)) throw new HttpsError('invalid-argument', 'Bad code.');
  const db = getFirestore();
  const invite = await db.collection('groupInvites').doc(inviteCode).get();
  const groupId = invite.data()?.groupId as string | undefined;
  if (!groupId) throw new HttpsError('not-found', 'No such group.');
  const groupRef = db.collection('groups').doc(groupId);

  await db.runTransaction(async (tx) => {
    const [group, state] = await Promise.all([tx.get(groupRef), tx.get(socialState(uid))]);
    if (!group.exists) throw new HttpsError('not-found', 'No such group.');
    const count = ((state.data()?.groupIds as string[] | undefined) ?? []).length;
    const verdict = canJoinGroup(group.data() as { memberUids: string[] }, uid, count);
    if (verdict === 'already-member') return;
    if (verdict === 'full') throw new HttpsError('resource-exhausted', 'Group is full.');
    if (verdict === 'too-many-groups') {
      throw new HttpsError('failed-precondition', 'You are in too many groups.');
    }
    tx.update(groupRef, { memberUids: FieldValue.arrayUnion(uid) });
    tx.set(socialState(uid), { groupIds: FieldValue.arrayUnion(groupId) }, { merge: true });
  });
  return { groupId };
});

export const leaveGroup = onCall(opts, async (req) => {
  const uid = uidOf(req);
  const groupId = (req.data as { groupId?: unknown } | undefined)?.groupId;
  if (typeof groupId !== 'string' || groupId.length === 0) {
    throw new HttpsError('invalid-argument', 'Bad group.');
  }
  const db = getFirestore();
  const groupRef = db.collection('groups').doc(groupId);
  await db.runTransaction(async (tx) => {
    const group = await tx.get(groupRef);
    const g = group.exists
      ? (group.data() as { ownerUid: string; memberUids: string[]; inviteCode: string })
      : undefined;
    const next = afterLeave(g, uid);
    if (next.kind === 'delete') {
      tx.delete(groupRef);
      tx.delete(db.collection('groupInvites').doc(g!.inviteCode));
    } else if (next.kind === 'update') {
      tx.update(groupRef, { ownerUid: next.ownerUid, memberUids: next.memberUids });
    }
    // Always, even when the group is gone or already left, so a stale id clears.
    tx.set(socialState(uid), { groupIds: FieldValue.arrayRemove(groupId) }, { merge: true });
  });
  return { ok: true };
});
