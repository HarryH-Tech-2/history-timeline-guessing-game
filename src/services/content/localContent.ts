import { getCategories, getQuestions } from '@/data';

import type { ContentRepository } from './repository';

/**
 * Serves the bundled seed dataset. This is what powers the app offline and
 * whenever Firebase isn't configured — it resolves synchronously-fast and can
 * never fail, so it doubles as the guaranteed fallback for the remote source.
 */
export const localContentRepository: ContentRepository = {
  fetchCategories: () => Promise.resolve(getCategories()),
  fetchQuestions: () => Promise.resolve(getQuestions()),
};
