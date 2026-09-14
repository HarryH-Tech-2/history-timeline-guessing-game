import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Question, RoundResult } from '@/domain';
import { evaluateGuess, type ScoreModifiers } from '@/features/timeline/math';
import { track, type GameMode } from '@/services/analytics';

export type SessionPhase = 'guessing' | 'revealed';
export type SessionStatus = 'active' | 'finished';

export interface GameSessionConfig {
  /** Which mode this is, as reported on usage events. */
  mode: GameMode;
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
  const { mode, first, next, shouldEnd, modifiers } = config;

  const [question, setQuestion] = useState<Question>(first);
  const [phase, setPhase] = useState<SessionPhase>('guessing');
  const [status, setStatus] = useState<SessionStatus>('active');
  const [result, setResult] = useState<RoundResult | null>(null);
  const [results, setResults] = useState<readonly RoundResult[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);

  // Usage events, one each per session start and finish.
  useEffect(() => {
    track('mode_started', { mode });
  }, [mode]);
  const reportedFinish = useRef(false);
  useEffect(() => {
    if (status !== 'finished' || reportedFinish.current) return;
    reportedFinish.current = true;
    track('run_completed', {
      mode,
      rounds: results.length,
      total_score: results.reduce((sum, r) => sum + r.score.total, 0),
      exact: results.filter((r) => r.errorYears === 0).length,
    });
  }, [status, results, mode]);

  const submit = useCallback(
    (guessYear: number): RoundResult => {
      // A double-tap on Submit must not score the same question twice (which
      // would also skip the next question in a fixed queue).
      if (phase === 'revealed' && result !== null) return result;
      const evaluated = evaluateGuess(question, guessYear, modifiers?.(results));
      track('round_submitted', {
        mode,
        question_id: question.id,
        category_id: question.categoryId,
        round: roundNumber,
        guess_year: Math.round(guessYear),
        answer_year: question.year,
        error_years: evaluated.errorYears,
        score: evaluated.score.total,
      });
      setResult(evaluated);
      setResults((prev) => [...prev, evaluated]);
      setPhase('revealed');
      return evaluated;
    },
    [question, results, modifiers, phase, result, mode, roundNumber],
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
