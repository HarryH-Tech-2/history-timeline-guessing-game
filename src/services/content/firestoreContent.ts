import { CategorySchema, QuestionSchema, type Category, type Question } from '@/domain';

import type { ContentRepository } from './repository';

/**
 * Minimal read surface over Firestore collections. Kept as a plain interface so
 * this module stays free of any `firebase` import — that means the validation
 * and mapping logic below is unit-testable with a fake reader, and Jest never
 * has to transform the Firebase ESM bundle. The real implementation lives in
 * `@/services/firebase/firestoreReader`.
 */
export interface FirestoreReader {
  /** Return every document's data for a top-level collection. */
  readCollection(name: string): Promise<readonly unknown[]>;
}

/** Collection names in Firestore. Kept next to the reader they key into. */
export const COLLECTIONS = {
  categories: 'categories',
  questions: 'questions',
} as const;

/**
 * Validate each raw document independently and keep only the ones that pass.
 * Content is curated, but a single malformed remote document should never break
 * the whole catalogue — so we drop bad rows rather than throwing, matching the
 * resilient "never wedge the app" stance of the local store.
 */
function parseValid<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } }, rows: readonly unknown[]): T[] {
  const valid: T[] = [];
  for (const row of rows) {
    const result = schema.safeParse(row);
    if (result.success) valid.push(result.data);
  }
  return valid;
}

/**
 * A content repository backed by Firestore. Pure with respect to Firebase: it
 * only knows how to read named collections through the injected reader and how
 * to validate what comes back against the domain schemas.
 */
export function createFirestoreContentRepository(reader: FirestoreReader): ContentRepository {
  return {
    async fetchCategories(): Promise<readonly Category[]> {
      const rows = await reader.readCollection(COLLECTIONS.categories);
      return parseValid<Category>(CategorySchema, rows);
    },
    async fetchQuestions(): Promise<readonly Question[]> {
      const rows = await reader.readCollection(COLLECTIONS.questions);
      return parseValid<Question>(QuestionSchema, rows);
    },
  };
}
