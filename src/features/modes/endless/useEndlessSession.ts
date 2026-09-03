import { useCallback, useEffect, useRef, useState } from 'react';

import { getRandomQuestion } from '@/data';
import { useGameSession, type GameSession } from '@/features/round';
import { useSaves } from '@/features/save';
import { comboModifiers } from '@/features/timeline/math';

export interface EndlessSession {
  session: GameSession;
  /** Highest total ever reached in Endless. */
  best: number;
}

/**
 * Endless: an open-ended stream of random questions with no lives to lose.
 * The run only ends when the player leaves; the best score is banked live as
 * the total climbs, so nothing is lost by walking away mid-run.
 */
export function useEndlessSession(): EndlessSession {
  const seen = useRef<Set<string>>(new Set());

  const first = useCallback(() => {
    const q = getRandomQuestion();
    seen.current.add(q.id);
    return q;
  }, []);

  const next = useCallback(() => {
    if (seen.current.size >= 1000) seen.current.clear();
    const q = getRandomQuestion(seen.current);
    seen.current.add(q.id);
    return q;
  }, []);

  const session = useGameSession({
    first,
    next,
    modifiers: comboModifiers,
  });

  const { isReady, bestScores } = useSaves();
  const [best, setBest] = useState(0);
  useEffect(() => {
    if (!isReady) return;
    void bestScores.read().then((b) => setBest(b.endless));
  }, [isReady, bestScores]);

  // Keep the persisted best in step as the run climbs.
  useEffect(() => {
    if (!isReady || session.totalScore <= best) return;
    const score = session.totalScore;
    void bestScores.read().then((b) => {
      setBest(score);
      return bestScores.write({ ...b, endless: score });
    });
  }, [isReady, bestScores, session.totalScore, best]);

  return { session, best };
}
