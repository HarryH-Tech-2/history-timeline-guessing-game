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

/** Mint a code no doc in `collection` uses yet. */
async function freshCode(collection: 'challenges' | 'groupInvites'): Promise<string> {
  const db = getFirestore();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = mintCode();
    if (!(await db.collection(collection).doc(code).get()).exists) return code;
  }
  throw new HttpsError('resource-exhausted', 'Could not mint a code, try again.');
}

export const createChallenge = onCall(opts, async (req) => {
  const uid = uidOf(req);
  const data = (req.data ?? {}) as { questionIds?: unknown; name?: unknown };
  const questionIds =
    data.questionIds === undefined ? pickQuestionIds(rotationPool()) : parseQuestionIds(data.questionIds);
  if (!questionIds) throw new HttpsError('invalid-argument', 'Unknown questions.');
  const code = await freshCode('challenges');
  const now = Date.now();
  await getFirestore().collection('challenges').doc(code).set({
    creatorUid: uid,
    creatorName: nameOf(data.name),
    questionIds,
    createdAt: now,
    expiresAt: now + CHALLENGE_TTL_MS,
  });
  await socialState(uid).set({ challengeCodes: FieldValue.arrayUnion(code) }, { merge: true });
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

  const entry = await db.runTransaction(async (tx) => {
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
    const years = c!.questionIds.map((id) => yearOf(id));
    if (years.some((y) => y === undefined)) throw new HttpsError('internal', 'Catalogue mismatch.');
    const { roundScores, total } = scoreEntry(years as number[], verdict.guessYears);
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
    return doc;
  });
  await socialState(uid).set({ challengeCodes: FieldValue.arrayUnion(data.code) }, { merge: true });
  return entry;
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
  const inviteCode = await freshCode('groupInvites');
  const groupRef = db.collection('groups').doc();
  const batch = db.batch();
  batch.set(groupRef, {
    name: check.name,
    ownerUid: uid,
    inviteCode,
    memberUids: [uid],
    createdAt: Date.now(),
  });
  batch.set(db.collection('groupInvites').doc(inviteCode), { groupId: groupRef.id });
  batch.set(socialState(uid), { groupIds: FieldValue.arrayUnion(groupRef.id) }, { merge: true });
  await batch.commit();
  return { groupId: groupRef.id, inviteCode, url: `${HOST}/g/${inviteCode}` };
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
    if (!group.exists) return;
    const g = group.data() as { ownerUid: string; memberUids: string[]; inviteCode: string };
    if (!g.memberUids.includes(uid)) return;
    const next = afterLeave(g, uid);
    if (next.kind === 'delete') {
      tx.delete(groupRef);
      tx.delete(db.collection('groupInvites').doc(g.inviteCode));
    } else {
      tx.update(groupRef, { ownerUid: next.ownerUid, memberUids: next.memberUids });
    }
    tx.set(socialState(uid), { groupIds: FieldValue.arrayRemove(groupId) }, { merge: true });
  });
  return { ok: true };
});
