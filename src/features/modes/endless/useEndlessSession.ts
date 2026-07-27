import { useCallback, useEffect, useRef, useState } from 'react';

import { getRandomQuestion } from '@/data';
import { useGameSession, type GameSession } from '@/features/round';
import { comboModifiers } from '@/features/timeline/math';

import { bestScoresStore } from '../persistence';

export interface EndlessSession {
  session: GameSession;
  /** Highest total ever reached in Endless. */
  best: number;
}

/** Endless: an unbounded stream of random questions. The player exits via nav. */
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

  const session = useGameSession({ first, next, modifiers: comboModifiers });

  const [best, setBest] = useState(0);
  useEffect(() => {
    void bestScoresStore.read().then((b) => setBest(b.endless));
  }, []);

  // Keep the persisted best in step as the run climbs.
  useEffect(() => {
    if (session.totalScore <= best) return;
    setBest(session.totalScore);
    void bestScoresStore
      .read()
      .then((b) => bestScoresStore.write({ ...b, endless: session.totalScore }));
  }, [session.totalScore, best]);

  return { session, best };
}
