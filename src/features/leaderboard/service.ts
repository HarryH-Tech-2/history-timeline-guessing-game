import { isFirebaseConfigured } from '@/config/env';

import { LeaderboardEntrySchema, type LeaderboardEntry, type LeaderboardWrite } from './types';

const COLLECTION = 'leaderboard';

/**
 * Upsert the signed-in player's leaderboard row. Best-effort: any failure
 * (offline, rules, transient network) is swallowed so publishing a score can
 * never disrupt play. No-op when Firebase isn't configured for the build.
 */
export async function publishEntry(uid: string, entry: LeaderboardWrite): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const [{ getFirebaseDb }, { doc, setDoc }] = await Promise.all([
      import('@/services/firebase/client'),
      import('firebase/firestore'),
    ]);
    await setDoc(doc(getFirebaseDb(), COLLECTION, uid), entry, { merge: true });
  } catch {
    // Intentionally ignored — the local profile is the source of truth.
  }
}

/**
 * Fetch the top players by XP. Returns an empty list offline or on error, and
 * drops any malformed remote row rather than failing the whole board.
 */
export async function fetchTop(max = 50): Promise<readonly LeaderboardEntry[]> {
  if (!isFirebaseConfigured) return [];
  try {
    const [{ getFirebaseDb }, { collection, getDocs, limit, orderBy, query }] = await Promise.all([
      import('@/services/firebase/client'),
      import('firebase/firestore'),
    ]);
    const snapshot = await getDocs(
      query(collection(getFirebaseDb(), COLLECTION), orderBy('xp', 'desc'), limit(max)),
    );
    const entries: LeaderboardEntry[] = [];
    for (const docSnap of snapshot.docs) {
      const parsed = LeaderboardEntrySchema.safeParse({ uid: docSnap.id, ...docSnap.data() });
      if (parsed.success) entries.push(parsed.data);
    }
    return entries;
  } catch {
    return [];
  }
}
