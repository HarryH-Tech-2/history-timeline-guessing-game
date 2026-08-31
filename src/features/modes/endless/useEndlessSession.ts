import { useCallback, useEffect, useRef, useState } from 'react';

import { getRandomQuestion } from '@/data';
import { useGameSession, type GameSession } from '@/features/round';
import { useSaves } from '@/features/save';
import { comboModifiers } from '@/features/timeline/math';

import { ENDLESS_LIVES, endlessLivesRemaining, isOutOfEndlessLives } from './endlessRules';

export interface EndlessSession {
  session: GameSession;
  /** Lives left right now. */
  lives: number;
  startingLives: number;
  /** Highest total ever reached in Endless. */
  best: number;
}

/** Endless: a stream of random questions until five loose guesses end the run. */
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
    shouldEnd: isOutOfEndlessLives,
    modifiers: comboModifiers,
  });
  const lives = endlessLivesRemaining(session.results);

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

  return { session, lives, startingLives: ENDLESS_LIVES, best };
}
