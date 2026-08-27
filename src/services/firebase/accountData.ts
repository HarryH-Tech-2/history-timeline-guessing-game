import { isFirebaseConfigured } from '@/config/env';

/** The per-player Firestore documents the app owns, as deletable ports. */
export interface AccountDocs {
  /** Keys of every `users/{uid}/saves/{key}` document. */
  listSaveKeys(uid: string): Promise<string[]>;
  deleteSave(uid: string, key: string): Promise<void>;
  deleteLeaderboardEntry(uid: string): Promise<void>;
  deleteUserDoc(uid: string): Promise<void>;
}

/**
 * Remove everything Firestore holds for `uid`: cloud saves, the public
 * leaderboard row, and the user document itself. Rejects on the first failed
 * delete — callers must not remove the auth account while data is left behind.
 */
export async function wipeAccountDocs(uid: string, docs: AccountDocs): Promise<void> {
  const keys = await docs.listSaveKeys(uid);
  for (const key of keys) {
    await docs.deleteSave(uid, key);
  }
  await docs.deleteLeaderboardEntry(uid);
  await docs.deleteUserDoc(uid);
}

/** Firestore-backed ports; `firebase/firestore` is imported lazily like the other adapters. */
async function firestoreDocs(): Promise<AccountDocs> {
  const [{ getFirebaseDb }, { collection, deleteDoc, doc, getDocs }] = await Promise.all([
    import('@/services/firebase/client'),
    import('firebase/firestore'),
  ]);
  const db = getFirebaseDb();
  return {
    async listSaveKeys(uid) {
      const snapshot = await getDocs(collection(db, 'users', uid, 'saves'));
      return snapshot.docs.map((d) => d.id);
    },
    deleteSave: (uid, key) => deleteDoc(doc(db, 'users', uid, 'saves', key)),
    deleteLeaderboardEntry: (uid) => deleteDoc(doc(db, 'leaderboard', uid)),
    deleteUserDoc: (uid) => deleteDoc(doc(db, 'users', uid)),
  };
}

/** Delete all of `uid`'s cloud data. No-op when Firebase isn't configured. */
export async function deleteCloudAccountData(uid: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  await wipeAccountDocs(uid, await firestoreDocs());
}
