import { useCallback, useMemo, useState } from 'react';

import type { Question, RoundResult } from '@/domain';
import { evaluateGuess, type ScoreModifiers } from '@/features/timeline/math';

export type SessionPhase = 'guessing' | 'revealed';
export type SessionStatus = 'active' | 'finished';

export interface GameSessionConfig {
  /** The opening question. */
  first: () => Question;
  /** Given the rounds played so far, the next question — or `null` to finish. */
  next: (results: readonly RoundResult[]) => Question | null;
  /** Optional early-exit predicate checked on advance (e.g. Survival out of lives). */
  shouldEnd?: (results: readonly RoundResult[]) => boolean;
  /** Optional per-round score modifiers (inert this slice; real in slice 5). */
  modifiers?: (results: readonly RoundResult[]) => ScoreModifiers;
}

export interface GameSession {
  question: Question;
  phase: SessionPhase;
  status: SessionStatus;
  /** The round just revealed, or null while guessing. */
  result: RoundResult | null;
  /** Every completed round this session, in order. */
  results: readonly RoundResult[];
  /** 1-based position of the current question. */
  roundNumber: number;
  totalScore: number;
  submit: (guessYear: number) => RoundResult;
  advance: () => void;
}

/**
 * The mode-agnostic heart of a play session. It owns the guess/reveal cycle,
 * the accumulated results, and the finished/active status. Modes plug in only
 * their queue policy (`first`/`next`) and end condition (`shouldEnd`).
 */
export function useGameSession(config: GameSessionConfig): GameSession {
  const { first, next, shouldEnd, modifiers } = config;

  const [question, setQuestion] = useState<Question>(first);
  const [phase, setPhase] = useState<SessionPhase>('guessing');
  const [status, setStatus] = useState<SessionStatus>('active');
  const [result, setResult] = useState<RoundResult | null>(null);
  const [results, setResults] = useState<readonly RoundResult[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);

  const submit = useCallback(
    (guessYear: number): RoundResult => {
      const evaluated = evaluateGuess(question, guessYear, modifiers?.(results));
      setResult(evaluated);
      setResults((prev) => [...prev, evaluated]);
      setPhase('revealed');
      return evaluated;
    },
    [question, results, modifiers],
  );

  const advance = useCallback(() => {
    // `results` already includes the round just revealed.
    if (shouldEnd?.(results)) {
      setStatus('finished');
      return;
    }
    const upcoming = next(results);
    if (upcoming === null) {
      setStatus('finished');
      return;
    }
    setQuestion(upcoming);
    setResult(null);
    setPhase('guessing');
    setRoundNumber((prev) => prev + 1);
  }, [next, shouldEnd, results]);

  const totalScore = useMemo(
    () => results.reduce((sum, r) => sum + r.score.total, 0),
    [results],
  );

  return useMemo(
    () => ({
      question,
      phase,
      status,
      result,
      results,
      roundNumber,
      totalScore,
      submit,
      advance,
    }),
    [question, phase, status, result, results, roundNumber, totalScore, submit, advance],
  );
}
