import { isFirebaseConfigured } from '@/config/env';

import type { CloudSaves } from './createScopedStore';

const COLLECTION = 'users';
const SUBCOLLECTION = 'saves';

/**
 * Firestore mirror for player saves: `users/{uid}/saves/{key}` holding
 * `{ data, updatedAt }`. `firebase/firestore` is imported lazily, like the
 * leaderboard service, so unconfigured builds never load it. Callers treat
 * every failure as "cloud unreachable" — these methods reject, they never
 * swallow, so `createScopedStore` can apply its own fallback rules.
 */
export const cloudSaves: CloudSaves = {
  async load(uid, key) {
    if (!isFirebaseConfigured) return null;
    const [{ getFirebaseDb }, { doc, getDoc }] = await Promise.all([
      import('@/services/firebase/client'),
      import('firebase/firestore'),
    ]);
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTION, uid, SUBCOLLECTION, key));
    if (!snapshot.exists()) return null;
    const stored = snapshot.data() as { data?: unknown };
    return stored.data ?? null;
  },

  async save(uid, key, value) {
    if (!isFirebaseConfigured) return;
    const [{ getFirebaseDb }, { doc, setDoc }] = await Promise.all([
      import('@/services/firebase/client'),
      import('firebase/firestore'),
    ]);
    // Firestore rejects `undefined` anywhere in a document; a JSON round-trip
    // strips optional fields that were never set (e.g. an old DailyRound).
    const data: unknown = JSON.parse(JSON.stringify(value));
    await setDoc(doc(getFirebaseDb(), COLLECTION, uid, SUBCOLLECTION, key), {
      data,
      updatedAt: Date.now(),
    });
  },
};
