import { useCallback, useMemo } from 'react';

import { getTopicOfTheDay, getTopicRun, type Topic } from '@/data';
import type { RoundResult } from '@/domain';
import { useGameSession, type GameSession } from '@/features/round';
import { dateKey } from '@/utils/date';

export interface TopicSession {
  session: GameSession;
  topic: Topic;
  totalQuestions: number;
}

/**
 * Topic of the day: a short fixed run drawn from one themed slice of the
 * catalogue. Topic and questions are date-seeded so everyone shares them;
 * unlike the Daily it can be replayed.
 */
export function useTopicSession(): TopicSession {
  const today = useMemo(() => dateKey(), []);
  const topic = useMemo(() => getTopicOfTheDay(today), [today]);
  const questions = useMemo(() => getTopicRun(topic, today), [topic, today]);

  const first = useCallback(() => questions[0]!, [questions]);
  const next = useCallback(
    (results: readonly RoundResult[]) => questions[results.length] ?? null,
    [questions],
  );

  const session = useGameSession({ first, next });

  return { session, topic, totalQuestions: questions.length };
}
