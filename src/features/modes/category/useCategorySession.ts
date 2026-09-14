import { useCallback, useState } from 'react';

import { getQuestionsByCategory } from '@/data';
import type { RoundResult } from '@/domain';
import { useGameSession, type GameSession } from '@/features/round';
import { comboModifiers } from '@/features/timeline/math';
import { pickDeterministic } from '@/utils/rng';

export interface CategorySession {
  session: GameSession;
  /** How many questions the run holds: every question in the category. */
  totalQuestions: number;
}

/**
 * Category practice: one pass through every question in the chosen category,
 * in a fresh random order each run. The run finishes when the category is
 * exhausted — a proper "complete" summary, never recycled questions — and
 * the screen remounts the hook to play again.
 */
export function useCategorySession(categoryId: string): CategorySession {
  // Dealt once per mount (the screen remounts the hook for a new run); a
  // lazy initialiser keeps the random draw out of every render.
  const [questions] = useState(() => {
    const pool = getQuestionsByCategory(categoryId);
    return pickDeterministic(pool, pool.length, Math.floor(Math.random() * 0xffffffff));
  });

  const first = useCallback(() => {
    const q = questions[0];
    if (!q) throw new Error(`No questions available for category "${categoryId}"`);
    return q;
  }, [questions, categoryId]);

  const next = useCallback(
    (results: readonly RoundResult[]) => questions[results.length] ?? null,
    [questions],
  );

  const session = useGameSession({ mode: 'category', first, next, modifiers: comboModifiers });

  return { session, totalQuestions: questions.length };
}
