import { getQuestionById, isPremiumCategory } from '@/data';
import type { Question, RoundResult } from '@/domain';

import type { CampaignProgress } from '../persistence';
import {
  CAMPAIGN,
  allStages,
  eraStatus,
  FREE_ERA_COUNT,
  isStagePremium,
  isStageUnlocked,
  isWorldPremium,
  nextStage,
  progressSince,
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

describe('campaign premium gating', () => {
  it('keeps only the first era free', () => {
    expect(FREE_ERA_COUNT).toBe(1);
    expect(isWorldPremium('ancient')).toBe(false);
    for (const world of CAMPAIGN.slice(1)) expect(isWorldPremium(world.id)).toBe(true);
  });

  it('marks every stage from the Middle Ages on as premium', () => {
    const [ancient, medieval] = CAMPAIGN;
    expect(ancient!.stages.every((s) => !isStagePremium(s))).toBe(true);
    expect(medieval!.stages.every((s) => isStagePremium(s))).toBe(true);
  });
});

describe('nextStage', () => {
  it('walks play order across era boundaries and ends after the last stage', () => {
    const stages = allStages();
    expect(nextStage(stages[0]!.id)?.id).toBe(stages[1]!.id);
    const lastAncient = CAMPAIGN[0]!.stages.at(-1)!;
    expect(nextStage(lastAncient.id)?.id).toBe(CAMPAIGN[1]!.stages[0]!.id);
    expect(nextStage(stages.at(-1)!.id)).toBeNull();
    expect(nextStage('nope')).toBeNull();
  });
});

describe('eraStatus', () => {
  const ancient = CAMPAIGN[0]!;

  it('counts cleared stages and flags a fully cleared era', () => {
    const some: CampaignProgress = { [ancient.stages[0]!.id]: { stars: 2, bestScore: 1 } };
    expect(eraStatus(ancient, some)).toEqual({
      cleared: 1,
      total: ancient.stages.length,
      complete: false,
      mastered: false,
    });
    const all: CampaignProgress = Object.fromEntries(
      ancient.stages.map((s) => [s.id, { stars: 2, bestScore: 1 }]),
    );
    expect(eraStatus(ancient, all)).toMatchObject({ complete: true, mastered: false });
  });

  it('calls an era mastered only at three stars everywhere', () => {
    const all: CampaignProgress = Object.fromEntries(
      ancient.stages.map((s) => [s.id, { stars: 3, bestScore: 1 }]),
    );
    expect(eraStatus(ancient, all)).toMatchObject({ complete: true, mastered: true });
  });
});

describe('progressSince', () => {
  const [s1, s2, s3] = allStages();

  it('reports stages cleared and unlocked since the last snapshot, in play order', () => {
    const before: CampaignProgress = { [s1!.id]: { stars: 1, bestScore: 1 } };
    const after: CampaignProgress = {
      [s1!.id]: { stars: 1, bestScore: 1 },
      [s2!.id]: { stars: 2, bestScore: 1 },
    };
    expect(progressSince(before, after)).toEqual({
      cleared: [s2!.id],
      unlocked: [s3!.id],
    });
  });

  it('ignores star upgrades on stages that were already cleared', () => {
    const before: CampaignProgress = { [s1!.id]: { stars: 1, bestScore: 1 } };
    const after: CampaignProgress = { [s1!.id]: { stars: 3, bestScore: 9 } };
    expect(progressSince(before, after)).toEqual({ cleared: [], unlocked: [] });
  });
});
