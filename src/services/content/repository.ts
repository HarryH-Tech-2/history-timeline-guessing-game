import type { Category, Question } from '@/domain';

/**
 * The source of game content (categories + questions). The app has two
 * implementations behind this interface — the bundled local seed and a
 * Firestore-backed remote — so the rest of the code never cares where content
 * comes from. Mirrors the `Storage`/`Store` pattern already used for persistence.
 */
export interface ContentRepository {
  fetchCategories(): Promise<readonly Category[]>;
  fetchQuestions(): Promise<readonly Question[]>;
}
