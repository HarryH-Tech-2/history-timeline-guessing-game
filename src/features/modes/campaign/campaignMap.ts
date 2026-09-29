import {
  CAMPAIGN_ROUTE_SPECS,
  getQuestions,
  isCampaignRouteQuestion,
  isInRotation,
  type CampaignRouteSpec,
} from '@/data';
import { DIFFICULTY_ORDER, type Question, type RoundResult } from '@/domain';

import type { CampaignProgress } from '../persistence';

export const STAGE_SIZE = 5;

export interface CampaignStage {
  id: string;
  worldId: string;
  /** 1-based position within the world's main path, or within its route. */
  index: number;
  title: string;
  questionIds: readonly string[];
  /** Set on route stages only: the route they belong to. */
  routeId?: string;
}

/**
 * A themed side path: it forks off the main path after `afterStageId` and
 * rejoins at the next main stage. Finishing either route of a fork opens the
 * rejoin stage; the other route stays open to play later.
 */
export interface CampaignRoute {
  id: string;
  worldId: string;
  name: string;
  icon: string;
  /** The main stage this route forks after. */
  afterStageId: string;
  stages: readonly CampaignStage[];
}

export interface CampaignWorld {
  id: string;
  name: string;
  colour: string;
  icon: string;
  /** Display label for the era's year span, e.g. "1500 – 1800". */
  period: string;
  /** 1-based position in the campaign. */
  index: number;
  /** The main path, in play order. */
  stages: readonly CampaignStage[];
  /** The era's fork: its themed routes, in play order (empty until they have questions). */
  routes: readonly CampaignRoute[];
}

/** One campaign world per era of history, played oldest to newest. */
interface EraSpec {
  id: string;
  name: string;
  colour: string;
  icon: string;
  /** Display label for the era's year span. */
  period: string;
  /** Inclusive last year of the era (signed; the previous era's max bounds the start). */
  maxYear: number;
}

const ERAS: readonly EraSpec[] = [
  {
    id: 'ancient',
    name: 'The Ancient World',
    colour: '#E7B84C',
    icon: 'flag',
    period: 'Up to 500',
    maxYear: 500,
  },
  {
    id: 'medieval',
    name: 'The Middle Ages',
    colour: '#B07BD9',
    icon: 'swords',
    period: '500 – 1500',
    maxYear: 1499,
  },
  {
    id: 'early-modern',
    name: 'The Early Modern Age',
    colour: '#57BE8F',
    icon: 'person',
    period: '1500 – 1800',
    maxYear: 1799,
  },
  {
    id: 'nineteenth',
    name: 'The 19th Century',
    colour: '#E8564E',
    icon: 'cpu',
    period: '1800 – 1900',
    maxYear: 1899,
  },
  {
    id: 'modern',
    name: 'The Modern Era',
    colour: '#A9B6C2',
    icon: 'cpu',
    period: '1900 – Today',
    maxYear: Number.POSITIVE_INFINITY,
  },
];

function eraOf(question: Question): EraSpec {
  return ERAS.find((era) => question.year <= era.maxYear) ?? ERAS[ERAS.length - 1]!;
}

function difficultyRank(difficulty: string): number {
  const i = DIFFICULTY_ORDER.indexOf(difficulty as (typeof DIFFICULTY_ORDER)[number]);
  return i === -1 ? DIFFICULTY_ORDER.length : i;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function byDifficultyThenYear(a: Question, b: Question): number {
  const byDifficulty = difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
  return byDifficulty !== 0 ? byDifficulty : a.year - b.year;
}

/** The 1-based main stage an era forks after: a third of the way along, rounded up. */
export function forkAfterIndex(mainStageCount: number): number {
  return Math.ceil(mainStageCount / 3);
}

/**
 * The campaign is one world per time period, played in chronological order.
 * Within an era the in-rotation questions are ordered easy→hard (then by year)
 * and split into fixed stages — the main path, whose positional ids players'
 * progress is keyed by, so `pool` must only ever be the rotation. A third of
 * the way along, each era forks into its themed routes, built the same way
 * from the route questions tagged with the route's id. Routes without
 * questions are left out. Every category takes part, premium ones included
 * (user decision 2026-09-03). Pure, so tests can build fixture campaigns.
 */
export function buildCampaign(
  pool: readonly Question[],
  routeQuestions: readonly Question[],
  routeSpecs: readonly CampaignRouteSpec[],
): readonly CampaignWorld[] {
  return ERAS.map((era, worldIndex) => {
    const ordered = pool.filter((q) => eraOf(q).id === era.id).sort(byDifficultyThenYear);

    const stages: CampaignStage[] = chunk(ordered, STAGE_SIZE).map((group, stageIndex) => ({
      id: `${era.id}-s${stageIndex + 1}`,
      worldId: era.id,
      index: stageIndex + 1,
      title: `${era.name} · Stage ${stageIndex + 1}`,
      questionIds: group.map((q) => q.id),
    }));

    const fork = stages[forkAfterIndex(stages.length) - 1];
    const routes: CampaignRoute[] =
      fork === undefined
        ? []
        : routeSpecs
            .filter((spec) => spec.eraId === era.id)
            .map((spec) => {
              const own = routeQuestions
                .filter((q) => q.tags.includes(spec.id))
                .sort(byDifficultyThenYear);
              return {
                id: spec.id,
                worldId: era.id,
                name: spec.name,
                icon: spec.icon,
                afterStageId: fork.id,
                stages: chunk(own, STAGE_SIZE).map((group, i) => ({
                  id: `${era.id}-${spec.id}-s${i + 1}`,
                  worldId: era.id,
                  index: i + 1,
                  title: `${era.name} · ${spec.name} · Stage ${i + 1}`,
                  questionIds: group.map((q) => q.id),
                  routeId: spec.id,
                })),
              };
            })
            .filter((route) => route.stages.length > 0);

    return {
      id: era.id,
      name: era.name,
      colour: era.colour,
      icon: era.icon,
      period: era.period,
      index: worldIndex + 1,
      stages,
      routes,
    };
  }).filter((world) => world.stages.length > 0);
}

/** Built once from the bundled seed. */
export const CAMPAIGN: readonly CampaignWorld[] = buildCampaign(
  getQuestions().filter(isInRotation),
  getQuestions().filter(isCampaignRouteQuestion),
  CAMPAIGN_ROUTE_SPECS,
);

export function getWorld(
  worldId: string,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): CampaignWorld | undefined {
  return worlds.find((w) => w.id === worldId);
}

/** Every stage of an era in play order: main path to the fork, each route, then the rest. */
export function worldStages(world: CampaignWorld): readonly CampaignStage[] {
  return world.stages.flatMap((stage) => [
    stage,
    ...world.routes.filter((r) => r.afterStageId === stage.id).flatMap((r) => r.stages),
  ]);
}

export function getStage(
  worldId: string,
  stageId: string,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): CampaignStage | undefined {
  const world = getWorld(worldId, worlds);
  return world === undefined ? undefined : worldStages(world).find((s) => s.id === stageId);
}

/** The route a stage belongs to; undefined for main-path stages. */
export function getRoute(
  stage: CampaignStage,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): CampaignRoute | undefined {
  if (stage.routeId === undefined) return undefined;
  return getWorld(stage.worldId, worlds)?.routes.find((r) => r.id === stage.routeId);
}

/** The main path: a flat, ordered list of every main stage across every world. */
export function allStages(worlds: readonly CampaignWorld[] = CAMPAIGN): readonly CampaignStage[] {
  return worlds.flatMap((w) => w.stages);
}

/** Every stage, route stages included, in play order. */
export function allStagesIncludingRoutes(
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): readonly CampaignStage[] {
  return worlds.flatMap(worldStages);
}

/** Star rating (1–3) for a completed stage, from its average round score. */
export function starsForResults(results: readonly RoundResult[]): number {
  if (results.length === 0) return 0;
  const avg = results.reduce((sum, r) => sum + r.score.total, 0) / results.length;
  if (avg >= 800) return 3;
  if (avg >= 550) return 2;
  return 1;
}

/**
 * A stage is playable if it's the very first stage, or the previous stage in
 * play order has earned at least one star. This naturally gates later eras
 * behind earlier ones.
 */
export function isStageUnlocked(stageId: string, progress: CampaignProgress): boolean {
  const stages = allStages();
  const index = stages.findIndex((s) => s.id === stageId);
  if (index <= 0) return index === 0; // first stage unlocked; unknown id locked
  const previous = stages[index - 1]!;
  return (progress[previous.id]?.stars ?? 0) >= 1;
}

/** Eras playable without Premium, counted from the start of the campaign. */
export const FREE_ERA_COUNT = 1;

/** Every era after the free ones (the Middle Ages onward) needs Premium. */
export function isWorldPremium(worldId: string): boolean {
  const world = getWorld(worldId);
  return world !== undefined && world.index > FREE_ERA_COUNT;
}

export function isStagePremium(stage: CampaignStage): boolean {
  return isWorldPremium(stage.worldId);
}

/** The stage after `stageId` in play order, crossing into the next era; null at the end. */
export function nextStage(stageId: string): CampaignStage | null {
  const stages = allStages();
  const index = stages.findIndex((s) => s.id === stageId);
  if (index < 0) return null;
  return stages[index + 1] ?? null;
}

export interface EraStatus {
  /** Stages with at least one star. */
  cleared: number;
  total: number;
  /** Every stage cleared. */
  complete: boolean;
  /** Every stage at three stars. */
  mastered: boolean;
}

export function eraStatus(world: CampaignWorld, progress: CampaignProgress): EraStatus {
  const stars = world.stages.map((s) => progress[s.id]?.stars ?? 0);
  const cleared = stars.filter((n) => n >= 1).length;
  const total = world.stages.length;
  return {
    cleared,
    total,
    complete: total > 0 && cleared === total,
    mastered: total > 0 && stars.every((n) => n >= 3),
  };
}

export interface ProgressDelta {
  /** Stages that went from no stars to cleared, in play order. */
  cleared: string[];
  /** Stages that became playable, in play order. */
  unlocked: string[];
}

/** What changed on the map between two progress snapshots — drives the light-up sequence. */
export function progressSince(before: CampaignProgress, after: CampaignProgress): ProgressDelta {
  const cleared: string[] = [];
  const unlocked: string[] = [];
  for (const stage of allStages()) {
    if ((before[stage.id]?.stars ?? 0) === 0 && (after[stage.id]?.stars ?? 0) >= 1) {
      cleared.push(stage.id);
    }
    if (!isStageUnlocked(stage.id, before) && isStageUnlocked(stage.id, after)) {
      unlocked.push(stage.id);
    }
  }
  return { cleared, unlocked };
}
