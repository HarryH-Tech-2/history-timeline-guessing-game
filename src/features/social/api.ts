import { isFirebaseConfigured } from '@/config/env';
import { t } from '@/i18n';

import {
  ChallengeEntrySchema,
  ChallengeSchema,
  GroupSchema,
  SocialStateSchema,
  type Challenge,
  type ChallengeEntry,
  type Group,
  type SocialState,
} from './types';

const REGION = 'us-central1';

/** Lazily loaded so firebase/functions stays out of Jest and offline builds. */
async function call<Req, Res>(name: string, data: Req): Promise<Res> {
  if (!isFirebaseConfigured) throw new Error('offline');
  const [{ getFirebaseApp }, functions] = await Promise.all([
    import('@/services/firebase/client'),
    import('firebase/functions'),
  ]);
  const fn = functions.httpsCallable<Req, Res>(
    functions.getFunctions(getFirebaseApp(), REGION),
    name,
  );
  return (await fn(data)).data;
}

async function db() {
  const [{ getFirebaseDb }, fs] = await Promise.all([
    import('@/services/firebase/client'),
    import('firebase/firestore'),
  ]);
  return { firestore: getFirebaseDb(), fs };
}

/** `guessYears` (with `questionIds` only) records the creator's own run as their entry. */
export const createChallenge = (input: { questionIds?: string[]; guessYears?: number[]; name: string }) =>
  call<typeof input, { code: string; url: string }>('createChallenge', input);

export async function submitChallengeEntry(input: {
  code: string;
  guessYears: number[];
  name: string;
}): Promise<Omit<ChallengeEntry, 'uid'>> {
  return call('submitChallengeEntry', input);
}

export const createGroup = (name: string) =>
  call<{ name: string }, { groupId: string; inviteCode: string; url: string }>('createGroup', { name });
export const joinGroup = (inviteCode: string) =>
  call<{ inviteCode: string }, { groupId: string }>('joinGroup', { inviteCode });
export const leaveGroup = (groupId: string) =>
  call<{ groupId: string }, { ok: true }>('leaveGroup', { groupId });

export async function fetchChallenge(code: string): Promise<Challenge | null> {
  const { firestore, fs } = await db();
  const snap = await fs.getDoc(fs.doc(firestore, 'challenges', code));
  if (!snap.exists()) return null;
  const parsed = ChallengeSchema.safeParse({ code, ...snap.data() });
  return parsed.success ? parsed.data : null;
}

export async function fetchEntries(code: string): Promise<ChallengeEntry[]> {
  const { firestore, fs } = await db();
  const snap = await fs.getDocs(fs.collection(firestore, 'challenges', code, 'entries'));
  const entries: ChallengeEntry[] = [];
  for (const d of snap.docs) {
    const parsed = ChallengeEntrySchema.safeParse({ uid: d.id, ...d.data() });
    if (parsed.success) entries.push(parsed.data);
  }
  return entries;
}

export async function fetchGroup(id: string): Promise<Group | null> {
  const { firestore, fs } = await db();
  try {
    const snap = await fs.getDoc(fs.doc(firestore, 'groups', id));
    if (!snap.exists()) return null;
    const parsed = GroupSchema.safeParse({ id, ...snap.data() });
    return parsed.success ? parsed.data : null;
  } catch (e) {
    // Rules deny reads to non-members: left or removed, not a failure.
    if ((e as { code?: unknown } | null)?.code === 'permission-denied') return null;
    throw e; // offline or unavailable → the caller shows retry
  }
}

/** Members' public leaderboard rows, 30 ids per query (the group cap). */
export async function fetchMemberRows(
  uids: string[],
): Promise<{ uid: string; displayName: string; weekKey?: string; weekXp?: number }[]> {
  if (uids.length === 0) return [];
  const { firestore, fs } = await db();
  const snap = await fs.getDocs(
    fs.query(fs.collection(firestore, 'leaderboard'), fs.where(fs.documentId(), 'in', uids.slice(0, 30))),
  );
  return snap.docs.map((d) => {
    const data = d.data() as { displayName?: string; weekKey?: string; weekXp?: number };
    return { uid: d.id, displayName: data.displayName ?? '', weekKey: data.weekKey, weekXp: data.weekXp };
  });
}

export async function fetchSocialState(uid: string): Promise<SocialState> {
  const { firestore, fs } = await db();
  const snap = await fs.getDoc(fs.doc(firestore, 'users', uid, 'social', 'state'));
  return SocialStateSchema.parse(snap.data() ?? {});
}

export async function markSeen(uid: string, code: string, count: number): Promise<void> {
  const { firestore, fs } = await db();
  await fs.setDoc(
    fs.doc(firestore, 'users', uid, 'social', 'state'),
    { seen: { [code]: count } },
    { merge: true },
  );
}

/** HttpsError code with the `functions/` prefix stripped ('already-exists', 'not-found', ...), or '' if none. */
export function socialErrorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code.replace(/^functions\//, '') : '';
}

/** True when submitChallengeEntry failed because this player already played (load the head-to-head instead). */
export const isAlreadyPlayed = (error: unknown): boolean => socialErrorCode(error) === 'already-exists';

/** Friendly copy for a callable failure (FirebaseError code → sentence). */
export function socialErrorMessage(error: unknown): string {
  const code = socialErrorCode(error);
  const message = (error as Error | null)?.message;
  if (code === 'not-found') return t('social.errors.notFound');
  if (code === 'already-exists') return t('social.errors.alreadyPlayed');
  // The server's own message (English) wins when there is one.
  if (code === 'failed-precondition') return message || t('social.errors.unavailable');
  if (code === 'resource-exhausted') return t('social.errors.groupFull');
  if (code === 'invalid-argument') return message || t('social.errors.invalid');
  return t('social.errors.network');
}
