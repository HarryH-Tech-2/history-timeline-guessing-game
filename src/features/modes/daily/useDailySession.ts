import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getDailyQuestions } from '@/data';
import type { RoundResult } from '@/domain';
import { useProgression } from '@/features/progression';
import { useGameSession, type GameSession } from '@/features/round';
import { useSaves } from '@/features/save';
import { dateKey } from '@/utils/date';

import type { DailyRecord } from '../persistence';

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

  const { isReady, daily } = useSaves();
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Was today already played on a previous visit?
  useEffect(() => {
    if (!isReady) return;
    void daily.read().then((stored) => {
      if (stored && stored.date === today) setRecord(stored);
      setLoading(false);
    });
  }, [isReady, daily, today]);

  // Persist the run the moment it finishes, and feed the Daily streak
  // (idempotent per calendar day, so a re-render can't double-count).
  const saved = useRef(false);
  useEffect(() => {
    if (session.status !== 'finished' || saved.current) return;
    // Wait for the account's store to be ready without marking this saved —
    // the effect re-runs (isReady is a dep) and banks the run once it is,
    // instead of silently dropping a Daily finished mid account-switch.
    if (!isReady) return;
    saved.current = true;
    const rec = buildRecord(today, session.results);
    void daily.write(rec);
    setRecord(rec);
    recordDailyCompleted();
  }, [isReady, session.status, session.results, today, daily, recordDailyCompleted]);

  return {
    session,
    totalQuestions: questions.length,
    loading,
    locked: record !== null,
    record,
  };
}
