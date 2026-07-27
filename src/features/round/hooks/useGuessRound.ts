import { useCallback, useMemo, useRef, useState } from 'react';

import { getRandomQuestion } from '@/data';
import type { Question, RoundResult } from '@/domain';
import { evaluateGuess } from '@/features/timeline/math';

export type RoundPhase = 'guessing' | 'revealed';

export interface GuessRound {
  question: Question;
  phase: RoundPhase;
  result: RoundResult | null;
  /** Running totals for the session. */
  roundNumber: number;
  totalScore: number;
  submit: (guessYear: number) => RoundResult;
  next: () => void;
}

/**
 * Owns the state of a single-question loop: which question is showing, whether
 * it has been answered, the scored result, and simple session totals. Purely
 * local — persistence and game-mode rules arrive in later slices.
 */
export function useGuessRound(): GuessRound {
  const seen = useRef<Set<string>>(new Set());

  const [question, setQuestion] = useState<Question>(() => {
    const first = getRandomQuestion();
    seen.current.add(first.id);
    return first;
  });
  const [phase, setPhase] = useState<RoundPhase>('guessing');
  const [result, setResult] = useState<RoundResult | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalScore, setTotalScore] = useState(0);

  const submit = useCallback(
    (guessYear: number): RoundResult => {
      const evaluated = evaluateGuess(question, guessYear);
      setResult(evaluated);
      setPhase('revealed');
      setTotalScore((prev) => prev + evaluated.score.total);
      return evaluated;
    },
    [question],
  );

  const next = useCallback(() => {
    if (seen.current.size >= 1000) seen.current.clear();
    const upcoming = getRandomQuestion(seen.current);
    seen.current.add(upcoming.id);
    setQuestion(upcoming);
    setResult(null);
    setPhase('guessing');
    setRoundNumber((prev) => prev + 1);
  }, []);

  return useMemo(
    () => ({ question, phase, result, roundNumber, totalScore, submit, next }),
    [question, phase, result, roundNumber, totalScore, submit, next],
  );
}
