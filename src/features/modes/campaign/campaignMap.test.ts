import { getQuestionById, isPremiumCategory } from '@/data';
import type { Question, RoundResult } from '@/domain';

import type { CampaignProgress } from '../persistence';
import {
  CAMPAIGN,
  allStages,
  isStageUnlocked,
  starsForResults,
} from './campaignMap';

function roundScoring(total: number): RoundResult {
  return {
    question: { id: 'q' } as Question,
    guessYear: 0,
    errorYears: 0,
    score: { base: total, comboMultiplier: 1, streakBonus: 0, total },
    isPerfect: false,
  };
}

describe('campaign map', () => {
  it('builds chronological era worlds from the whole catalogue with unique stages', () => {
    const categoriesInCampaign = new Set<string>();
    expect(CAMPAIGN.map((w) => w.id)).toEqual([
      'ancient',
      'medieval',
      'early-modern',
      'nineteenth',
      'modern',
    ]);
    const stageIds = allStages().map((s) => s.id);
    expect(new Set(stageIds).size).toBe(stageIds.length);
    for (const world of CAMPAIGN) {
      expect(world.stages.length).toBeGreaterThan(0);
      for (const stage of world.stages) {
        expect(stage.questionIds.length).toBeGreaterThan(0);
        for (const id of stage.questionIds) {
          const question = getQuestionById(id);
          expect(question).toBeDefined();
          categoriesInCampaign.add(question!.categoryId);
        }
      }
    }
    // Every mode draws on every category (user decision 2026-09-03), premium
    // ones included; Premium gates playing those categories on their own.
    expect([...categoriesInCampaign].some((c) => isPremiumCategory(c))).toBe(true);
  });

  it('rates stages by average score', () => {
    expect(starsForResults([])).toBe(0);
    expect(starsForResults([roundScoring(900), roundScoring(900)])).toBe(3);
    expect(starsForResults([roundScoring(600), roundScoring(600)])).toBe(2);
    expect(starsForResults([roundScoring(100)])).toBe(1);
  });

  it('unlocks the first stage and gates the rest behind a star', () => {
    const stages = allStages();
    const firstStage = stages[0]!;
    const secondStage = stages[1]!;

    const empty: CampaignProgress = {};
    expect(isStageUnlocked(firstStage.id, empty)).toBe(true);
    expect(isStageUnlocked(secondStage.id, empty)).toBe(false);

    const progressed: CampaignProgress = {
      [firstStage.id]: { stars: 1, bestScore: 400 },
    };
    expect(isStageUnlocked(secondStage.id, progressed)).toBe(true);
  });

  it('locks unknown stage ids', () => {
    expect(isStageUnlocked('nope', {})).toBe(false);
  });
});
