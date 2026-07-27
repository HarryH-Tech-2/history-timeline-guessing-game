import { isFirebaseConfigured } from '@/config/env';
import { hydrateContent } from '@/data';

import { createFirestoreContentRepository } from './firestoreContent';

export type { ContentRepository } from './repository';
export { localContentRepository } from './localContent';
export {
  createFirestoreContentRepository,
  COLLECTIONS,
  type FirestoreReader,
} from './firestoreContent';

/**
 * Fetch the latest content from Firestore and swap it into the live catalogue.
 *
 * Offline-first: the local seed is already showing by the time this runs, so
 * this is a background refresh. A no-op when Firebase isn't configured, and any
 * fetch failure is swallowed — a flaky network must never degrade the bundled
 * content the player already has. `hydrateContent` itself ignores empty results.
 */
export async function syncRemoteContent(): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    // Loaded lazily so the firebase/firestore bundle stays out of offline builds.
    const { firestoreReader } = await import('@/services/firebase/firestoreReader');
    const repository = createFirestoreContentRepository(firestoreReader);
    const [categories, questions] = await Promise.all([
      repository.fetchCategories(),
      repository.fetchQuestions(),
    ]);
    hydrateContent(categories, questions);
  } catch {
    // Keep the seed content; remote refresh will be retried next launch.
  }
}
