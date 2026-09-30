import { getQuestionById, isPremiumCategory } from '@/data';
import type { Question, RoundResult } from '@/domain';

import type { CampaignProgress } from '../persistence';
import {
  CAMPAIGN,
  allStages,
  allStagesIncludingRoutes,
  buildCampaign,
  forkAfterIndex,
  frontierStage,
  pulseStageIds,
  rejoinStageOf,
  starsEarned,
  getRoute,
  getStage,
  worldStages,
  eraStatus,
  FREE_ERA_COUNT,
  isStagePremium,
  isStageUnlocked,
  isWorldPremium,
  nextStage,
  progressSince,
  starsForResults,
} from './campaignMap';
import {
  FIXTURE_POOL,
  FIXTURE_ROUTE_QUESTIONS,
  FIXTURE_ROUTE_SPECS,
  FIXTURE_WORLDS,
} from './__fixtures__/routedCampaign';

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

describe('routes data model', () => {
  const [ancient, medieval] = FIXTURE_WORLDS;

  it('forks a third of the way along each era, rounding up', () => {
    expect([6, 9, 12, 12, 24].map(forkAfterIndex)).toEqual([2, 3, 4, 4, 8]);
    expect(forkAfterIndex(1)).toBe(1);
  });

  it('builds each route after the fork stage with positional route stage ids', () => {
    expect(ancient!.routes.map((r) => [r.id, r.afterStageId, r.stages.map((s) => s.id)])).toEqual([
      ['north', 'ancient-s2', ['ancient-north-s1', 'ancient-north-s2', 'ancient-north-s3']],
      ['south', 'ancient-s2', ['ancient-south-s1', 'ancient-south-s2', 'ancient-south-s3']],
    ]);
    expect(medieval!.routes.map((r) => [r.id, r.afterStageId, r.stages.length])).toEqual([
      ['east', 'medieval-s1', 1],
    ]);
  });

  it('orders route questions easy→hard, then by year, five per stage', () => {
    const north = ancient!.routes[0]!;
    expect(north.stages.map((s) => s.questionIds)).toEqual([
      ['n-5', 'n-6', 'n-7', 'n-8', 'n-9'],
      ['n-10', 'n-11', 'n-12', 'n-13', 'n-14'],
      ['n-0', 'n-1', 'n-2', 'n-3', 'n-4'],
    ]);
  });

  it('labels route stages with era, route and number', () => {
    const stage = ancient!.routes[1]!.stages[2]!;
    expect(stage).toMatchObject({
      worldId: 'ancient',
      routeId: 'south',
      index: 3,
      title: 'The Ancient World · South Road · Stage 3',
    });
  });

  it('never changes the main path when routes are added', () => {
    const without = buildCampaign(FIXTURE_POOL, [], FIXTURE_ROUTE_SPECS);
    expect(without.every((w) => w.routes.length === 0)).toBe(true);
    expect(allStages(FIXTURE_WORLDS)).toEqual(allStages(without));
    expect(buildCampaign(FIXTURE_POOL, FIXTURE_ROUTE_QUESTIONS, FIXTURE_ROUTE_SPECS)).toEqual(FIXTURE_WORLDS);
  });

  it('lists stages in play order: main to the fork, route A, route B, then on', () => {
    expect(worldStages(ancient!).map((s) => s.id)).toEqual([
      'ancient-s1', 'ancient-s2',
      'ancient-north-s1', 'ancient-north-s2', 'ancient-north-s3',
      'ancient-south-s1', 'ancient-south-s2', 'ancient-south-s3',
      'ancient-s3', 'ancient-s4', 'ancient-s5', 'ancient-s6',
    ]);
    expect(allStagesIncludingRoutes(FIXTURE_WORLDS)).toHaveLength(12 + 3);
    expect(allStages(FIXTURE_WORLDS)).toHaveLength(8);
  });

  it('finds route stages and their route', () => {
    const stage = getStage('medieval', 'medieval-east-s1', FIXTURE_WORLDS);
    expect(stage?.routeId).toBe('east');
    expect(getRoute(stage!, FIXTURE_WORLDS)?.name).toBe('East Road');
    expect(getRoute(getStage('ancient', 'ancient-s1', FIXTURE_WORLDS)!, FIXTURE_WORLDS)).toBeUndefined();
    expect(getStage('ancient', 'medieval-east-s1', FIXTURE_WORLDS)).toBeUndefined();
  });
});

function starred(ids: readonly string[], stars = 1): CampaignProgress {
  return Object.fromEntries(ids.map((id) => [id, { stars, bestScore: 100 }]));
}

const W = FIXTURE_WORLDS;
const north = ['ancient-north-s1', 'ancient-north-s2', 'ancient-north-s3'];
const south = ['ancient-south-s1', 'ancient-south-s2', 'ancient-south-s3'];
const ancientMain = ['ancient-s1', 'ancient-s2', 'ancient-s3', 'ancient-s4', 'ancient-s5', 'ancient-s6'];

describe('route unlocking', () => {
  it('opens both routes once the fork stage has a star, and keeps the rejoin shut', () => {
    const atFork = starred(['ancient-s1', 'ancient-s2']);
    expect(isStageUnlocked('ancient-north-s1', {}, W)).toBe(false);
    expect(isStageUnlocked('ancient-north-s1', atFork, W)).toBe(true);
    expect(isStageUnlocked('ancient-south-s1', atFork, W)).toBe(true);
    expect(isStageUnlocked('ancient-north-s2', atFork, W)).toBe(false);
    expect(isStageUnlocked('ancient-s3', atFork, W)).toBe(false);
  });

  it('walks a route one starred stage at a time', () => {
    const p = starred(['ancient-s1', 'ancient-s2', 'ancient-north-s1']);
    expect(isStageUnlocked('ancient-north-s2', p, W)).toBe(true);
    expect(isStageUnlocked('ancient-north-s3', p, W)).toBe(false);
  });

  it('rejoins the main path after the last stage of either route', () => {
    expect(isStageUnlocked('ancient-s3', starred(['ancient-s1', 'ancient-s2', ...north]), W)).toBe(true);
    expect(isStageUnlocked('ancient-s3', starred(['ancient-s1', 'ancient-s2', ...south]), W)).toBe(true);
    expect(isStageUnlocked('ancient-s3', starred(['ancient-s1', 'ancient-s2', ...north.slice(0, 2)]), W)).toBe(false);
    // A one-stage route: its only stage is its last.
    expect(isStageUnlocked('medieval-s2', starred(['medieval-s1', 'medieval-east-s1']), W)).toBe(true);
  });

  it('keeps every stage a legacy player already starred, past the fork included', () => {
    const legacy = starred(ancientMain);
    for (const id of ancientMain) expect(isStageUnlocked(id, legacy, W)).toBe(true);
    expect(isStageUnlocked('medieval-s1', legacy, W)).toBe(true);
    expect(isStageUnlocked('ancient-north-s1', legacy, W)).toBe(true);
    // Rule 1 on its own: a starred stage is open even if its predecessor is not.
    expect(isStageUnlocked('ancient-s5', starred(['ancient-s5']), W)).toBe(true);
  });

  it('keeps the real campaign fully unlocked for a player with stars everywhere', () => {
    const all = starred(allStagesIncludingRoutes().map((s) => s.id));
    for (const s of allStagesIncludingRoutes()) expect(isStageUnlocked(s.id, all)).toBe(true);
  });

  it('prices route stages like their era', () => {
    expect(isStagePremium(getStage('ancient', 'ancient-north-s1', W)!, W)).toBe(false);
    expect(isStagePremium(getStage('medieval', 'medieval-east-s1', W)!, W)).toBe(true);
  });
});

describe('nextStage', () => {
  it('walks the main path across eras and ends after the last stage', () => {
    const stages = allStages();
    expect(nextStage(stages[0]!.id)).toEqual({ kind: 'stage', stage: stages[1] });
    const lastAncient = CAMPAIGN[0]!.stages.at(-1)!;
    expect(nextStage(lastAncient.id)).toEqual({ kind: 'stage', stage: CAMPAIGN[1]!.stages[0] });
    expect(nextStage(stages.at(-1)!.id)).toEqual({ kind: 'end' });
    expect(nextStage('nope')).toEqual({ kind: 'end' });
  });

  it('stops at a fork, walks a route, and rejoins after its last stage', () => {
    const at = (id: string) => nextStage(id, W);
    expect(at('ancient-s1')).toEqual({ kind: 'stage', stage: getStage('ancient', 'ancient-s2', W) });
    expect(at('ancient-s2')).toEqual({ kind: 'fork', forkStageId: 'ancient-s2' });
    expect(at('ancient-north-s1')).toEqual({ kind: 'stage', stage: getStage('ancient', 'ancient-north-s2', W) });
    expect(at('ancient-north-s3')).toEqual({ kind: 'stage', stage: getStage('ancient', 'ancient-s3', W) });
    expect(at('ancient-south-s3')).toEqual({ kind: 'stage', stage: getStage('ancient', 'ancient-s3', W) });
    expect(at('ancient-s6')).toEqual({ kind: 'stage', stage: getStage('medieval', 'medieval-s1', W) });
    expect(at('medieval-s1')).toEqual({ kind: 'fork', forkStageId: 'medieval-s1' });
    expect(at('medieval-east-s1')).toEqual({ kind: 'stage', stage: getStage('medieval', 'medieval-s2', W) });
    expect(at('medieval-s2')).toEqual({ kind: 'end' });
    expect(rejoinStageOf(W[0]!.routes[0]!, W)?.id).toBe('ancient-s3');
  });
});

describe('eraStatus', () => {
  const ancient = W[0]!;

  it('tallies main-path stages only', () => {
    expect(eraStatus(ancient, starred(['ancient-s1', 'ancient-north-s1'], 2))).toEqual({
      cleared: 1,
      total: 6,
      complete: false,
      mastered: false,
    });
  });

  it('is complete once every main-path stage has a star', () => {
    expect(eraStatus(ancient, starred(ancientMain.slice(0, 5), 2)).complete).toBe(false);
    expect(eraStatus(ancient, starred([...ancientMain, ...south], 2))).toMatchObject({
      cleared: 6,
      total: 6,
      complete: true,
      mastered: false,
    });
  });

  it('keeps the seal for a legacy player who never played a route', () => {
    expect(eraStatus(ancient, starred(ancientMain, 3))).toEqual({
      cleared: 6,
      total: 6,
      complete: true,
      mastered: false,
    });
  });

  it('is mastered only at three stars on every stage of both routes', () => {
    expect(eraStatus(ancient, starred([...ancientMain, ...north], 3)).mastered).toBe(false);
    expect(eraStatus(ancient, starred([...ancientMain, ...north, ...south], 3))).toMatchObject({
      complete: true,
      mastered: true,
    });
  });

  it('keeps the old rule for an era without routes', () => {
    const [plain] = buildCampaign(FIXTURE_POOL, [], FIXTURE_ROUTE_SPECS);
    expect(eraStatus(plain!, starred(ancientMain, 3))).toMatchObject({ complete: true, mastered: true });
  });

  it('sums stars over any stages', () => {
    expect(starsEarned(worldStages(ancient), { 'ancient-s1': { stars: 2, bestScore: 1 }, 'ancient-north-s1': { stars: 3, bestScore: 1 } })).toBe(5);
  });
});

describe('frontierStage', () => {
  const at = (ids: readonly string[]) => frontierStage(starred(ids), W)?.id;

  it('starts at the first stage and leads into route A at a fresh fork', () => {
    expect(at([])).toBe('ancient-s1');
    expect(at(['ancient-s1', 'ancient-s2'])).toBe('ancient-north-s1');
    expect([...pulseStageIds(starred(['ancient-s1', 'ancient-s2']), W)]).toEqual([
      'ancient-north-s1',
      'ancient-south-s1',
    ]);
  });

  it('follows the route the player chose', () => {
    expect(at(['ancient-s1', 'ancient-s2', 'ancient-south-s1'])).toBe('ancient-south-s2');
    expect([...pulseStageIds(starred(['ancient-s1', 'ancient-s2', 'ancient-south-s1']), W)]).toEqual([
      'ancient-south-s2',
    ]);
  });

  it('moves on to the rejoin once a route is finished, leaving the other open', () => {
    const p = ['ancient-s1', 'ancient-s2', ...north];
    expect(at(p)).toBe('ancient-s3');
    expect(isStageUnlocked('ancient-south-s1', starred(p), W)).toBe(true);
  });

  it('never drags a legacy player back to a fork they are already past', () => {
    expect(at(ancientMain)).toBe('medieval-s1');
    expect(at(['ancient-s1', 'ancient-s2', 'ancient-s3'])).toBe('ancient-s4');
  });

  it('is undefined once everything is starred', () => {
    expect(at(allStagesIncludingRoutes(W).map((s) => s.id))).toBeUndefined();
    expect(pulseStageIds(starred(allStagesIncludingRoutes(W).map((s) => s.id)), W).size).toBe(0);
  });
});

describe('progressSince', () => {
  it('reports stages cleared and unlocked, route stages included, in play order', () => {
    const before = starred(['ancient-s1']);
    const after = starred(['ancient-s1', 'ancient-s2']);
    expect(progressSince(before, after, W)).toEqual({
      cleared: ['ancient-s2'],
      unlocked: ['ancient-north-s1', 'ancient-south-s1'],
    });
    expect(progressSince(starred(['ancient-s1', 'ancient-s2', ...north.slice(0, 2)]), starred(['ancient-s1', 'ancient-s2', ...north]), W)).toEqual({
      cleared: ['ancient-north-s3'],
      unlocked: ['ancient-s3'],
    });
  });

  it('ignores star upgrades on stages that were already cleared', () => {
    expect(progressSince(starred(['ancient-s1']), starred(['ancient-s1'], 3), W)).toEqual({
      cleared: [],
      unlocked: [],
    });
  });
});
