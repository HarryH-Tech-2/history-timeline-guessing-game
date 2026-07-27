import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getQuestionById } from '@/data';
import type { Question, RoundResult } from '@/domain';
import { useGameSession, type GameSession } from '@/features/round';

import { campaignStore } from '../persistence';
import { getStage, starsForResults, type CampaignStage } from './campaignMap';

export interface CampaignSession {
  session: GameSession;
  stage: CampaignStage;
  totalQuestions: number;
  /** Stars earned this run, once finished (0 while active). */
  earnedStars: number;
}

/**
 * Play a single campaign stage: a short fixed queue of questions. On completion
 * the stage's star rating and best score are merged into persisted progress
 * (never downgraded).
 */
export function useCampaignSession(stage: CampaignStage): CampaignSession {
  const questions = useMemo(
    () =>
      stage.questionIds
        .map((id) => getQuestionById(id))
        .filter((q): q is Question => q !== undefined),
    [stage],
  );

  const first = useCallback(() => questions[0]!, [questions]);
  const next = useCallback(
    (results: readonly RoundResult[]) => questions[results.length] ?? null,
    [questions],
  );

  const session = useGameSession({ first, next });

  const [earnedStars, setEarnedStars] = useState(0);
  const saved = useRef(false);
  useEffect(() => {
    if (session.status !== 'finished' || saved.current) return;
    saved.current = true;
    const stars = starsForResults(session.results);
    setEarnedStars(stars);
    void campaignStore.read().then((progress) => {
      const prev = progress[stage.id];
      campaignStore.write({
        ...progress,
        [stage.id]: {
          stars: Math.max(stars, prev?.stars ?? 0),
          bestScore: Math.max(session.totalScore, prev?.bestScore ?? 0),
        },
      });
    });
  }, [session.status, session.results, session.totalScore, stage.id]);

  return { session, stage, totalQuestions: questions.length, earnedStars };
}

export { getStage };
