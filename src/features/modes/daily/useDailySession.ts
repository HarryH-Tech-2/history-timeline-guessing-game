import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getDailyQuestions } from '@/data';
import type { RoundResult } from '@/domain';
import { useProgression } from '@/features/progression';
import { useGameSession, type GameSession } from '@/features/round';
import { dateKey } from '@/utils/date';

import { dailyStore, type DailyRecord } from '../persistence';

function buildRecord(date: string, results: readonly RoundResult[]): DailyRecord {
  return {
    date,
    totalScore: results.reduce((sum, r) => sum + r.score.total, 0),
    perfectCount: results.reduce((n, r) => n + (r.isPerfect ? 1 : 0), 0),
    rounds: results.map((r) => ({
      questionId: r.question.id,
      errorYears: r.errorYears,
      score: r.score.total,
      guessYear: r.guessYear,
    })),
  };
}

export interface DailySession {
  session: GameSession;
  totalQuestions: number;
  loading: boolean;
  /** True once today's run is done (this session or a previous one). */
  locked: boolean;
  /** Today's completed record, when locked. */
  record: DailyRecord | null;
}

/** Daily: a fixed, date-seeded set of questions, one attempt per calendar day. */
export function useDailySession(): DailySession {
  const { recordDailyCompleted } = useProgression();
  const today = useMemo(() => dateKey(), []);
  const questions = useMemo(() => getDailyQuestions(today), [today]);

  const first = useCallback(() => questions[0]!, [questions]);
  const next = useCallback(
    (results: readonly RoundResult[]) => questions[results.length] ?? null,
    [questions],
  );

  const session = useGameSession({ first, next });

  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Was today already played on a previous visit?
  useEffect(() => {
    void dailyStore.read().then((stored) => {
      if (stored && stored.date === today) setRecord(stored);
      setLoading(false);
    });
  }, [today]);

  // Persist the run the moment it finishes, and feed the Daily streak
  // (idempotent per calendar day, so a re-render can't double-count).
  const saved = useRef(false);
  useEffect(() => {
    if (session.status !== 'finished' || saved.current) return;
    saved.current = true;
    const rec = buildRecord(today, session.results);
    void dailyStore.write(rec);
    setRecord(rec);
    recordDailyCompleted();
  }, [session.status, session.results, today, recordDailyCompleted]);

  return {
    session,
    totalQuestions: questions.length,
    loading,
    locked: record !== null,
    record,
  };
}
