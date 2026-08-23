import { useCallback, useRef } from 'react';

import { getRandomQuestionInCategory } from '@/data';
import { useGameSession, type GameSession } from '@/features/round';
import { comboModifiers } from '@/features/timeline/math';

export interface CategorySession {
  session: GameSession;
}

/**
 * Category practice: an unbounded stream of random questions drawn from a
 * single category. Works like Endless — the player exits via navigation — but
 * every prompt matches the chosen topic. When the category runs dry the
 * seen-set resets and questions repeat.
 */
export function useCategorySession(categoryId: string): CategorySession {
  const seen = useRef<Set<string>>(new Set());

  const first = useCallback(() => {
    const q = getRandomQuestionInCategory(categoryId);
    seen.current.add(q.id);
    return q;
  }, [categoryId]);

  const next = useCallback(() => {
    const q = getRandomQuestionInCategory(categoryId, seen.current);
    if (seen.current.has(q.id)) seen.current.clear();
    seen.current.add(q.id);
    return q;
  }, [categoryId]);

  const session = useGameSession({ first, next, modifiers: comboModifiers });

  return { session };
}
