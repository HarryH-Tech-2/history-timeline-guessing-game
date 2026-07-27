import { collection, getDocs } from 'firebase/firestore';

import type { FirestoreReader } from '@/services/content/firestoreContent';

import { getFirebaseDb } from './client';

/**
 * The live Firestore implementation of `FirestoreReader`. The document id is
 * merged onto the data (content is stored with the id as both the doc key and
 * an `id` field), so the domain schemas — which require `id` — validate cleanly.
 *
 * Isolated in its own module so the `firebase/firestore` import is only pulled
 * in when a configured build actually syncs; nothing here is referenced offline.
 */
export const firestoreReader: FirestoreReader = {
  async readCollection(name: string): Promise<readonly unknown[]> {
    const snapshot = await getDocs(collection(getFirebaseDb(), name));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
};
