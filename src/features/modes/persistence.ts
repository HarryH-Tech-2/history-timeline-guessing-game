import { z } from 'zod';

import { isFirebaseConfigured } from '@/config/env';
import { cloudSaves } from '@/storage/cloudSaves';
import { createScopedStore } from '@/storage';

/** Best scores for the endurance modes. */
export const BestScoresSchema = z.object({
  endless: z.number().nonnegative(),
  survival: z.object({
    rounds: z.number().nonnegative(),
    score: z.number().nonnegative(),
  }),
});
export type BestScores = z.infer<typeof BestScoresSchema>;

const BEST_SCORES_FALLBACK: BestScores = {
  endless: 0,
  survival: { rounds: 0, score: 0 },
};

/** A spoiler-free record of the most recent Daily run. */
export const DailyRoundSchema = z.object({
  questionId: z.string(),
  errorYears: z.number().nonnegative(),
  score: z.number().nonnegative(),
  /** Added later; absent on records saved by earlier builds. */
  guessYear: z.number().optional(),
});

export const DailyRecordSchema = z.object({
  date: z.string(),
  totalScore: z.number().nonnegative(),
  perfectCount: z.number().nonnegative(),
  rounds: z.array(DailyRoundSchema),
});
export type DailyRecord = z.infer<typeof DailyRecordSchema>;

/** Per-stage campaign progress, keyed by stage id. */
export const StageProgressSchema = z.object({
  stars: z.number().min(0).max(3),
  bestScore: z.number().nonnegative(),
});
export type StageProgress = z.infer<typeof StageProgressSchema>;

export const CampaignProgressSchema = z.record(z.string(), StageProgressSchema);
export type CampaignProgress = z.infer<typeof CampaignProgressSchema>;

const cloud = isFirebaseConfigured ? cloudSaves : undefined;

export const bestScoresSaves = createScopedStore<BestScores>({
  key: 'chronos.bestScores',
  schema: BestScoresSchema,
  fallback: BEST_SCORES_FALLBACK,
  cloud,
});

export const dailySaves = createScopedStore<DailyRecord | null>({
  key: 'chronos.daily',
  schema: DailyRecordSchema.nullable(),
  fallback: null,
  cloud,
});

export const campaignSaves = createScopedStore<CampaignProgress>({
  key: 'chronos.campaign',
  schema: CampaignProgressSchema,
  fallback: {},
  cloud,
});
