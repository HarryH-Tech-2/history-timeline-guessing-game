import { useCallback, useEffect, useRef, useState } from 'react';

import { getRandomQuestion } from '@/data';
import { useGameSession, type GameSession } from '@/features/round';
import { comboModifiers } from '@/features/timeline/math';

import { bestScoresStore } from '../persistence';
import { STARTING_LIVES, isOutOfLives, livesRemaining } from './survivalRules';

export interface SurvivalSession {
  session: GameSession;
  /** Lives left right now. */
  lives: number;
  startingLives: number;
  /** Best `{ rounds, score }` ever recorded, or null until loaded. */
  best: { rounds: number; score: number } | null;
}

/** Survival: random questions until three loose guesses drain the lives. */
export function useSurvivalSession(): SurvivalSession {
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
    shouldEnd: isOutOfLives,
    modifiers: comboModifiers,
  });
  const lives = livesRemaining(session.results);

  const [best, setBest] = useState<{ rounds: number; score: number } | null>(null);
  useEffect(() => {
    void bestScoresStore.read().then((b) => setBest(b.survival));
  }, []);

  // Record the finished run if it beats the stored best (by rounds, then score).
  const saved = useRef(false);
  useEffect(() => {
    if (session.status !== 'finished' || saved.current) return;
    saved.current = true;
    const run = { rounds: session.results.length, score: session.totalScore };
    void bestScoresStore.read().then((b) => {
      const beaten =
        run.rounds > b.survival.rounds ||
        (run.rounds === b.survival.rounds && run.score > b.survival.score);
      if (beaten) {
        bestScoresStore.write({ ...b, survival: run });
        setBest(run);
      }
    });
  }, [session.status, session.results.length, session.totalScore]);

  return { session, lives, startingLives: STARTING_LIVES, best };
}
