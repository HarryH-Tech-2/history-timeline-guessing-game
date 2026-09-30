import {
  CAMPAIGN_ROUTE_SPECS,
  getQuestions,
  isCampaignRouteQuestion,
  isInRotation,
  routeName,
  type CampaignRouteSpec,
} from '@/data';
import { DIFFICULTY_ORDER, type Question, type RoundResult } from '@/domain';
import { t, type TranslationKey } from '@/i18n';

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

/**
 * Translation keys for each era's name and period, by era id. Keys only —
 * `t()` runs at render time (the campaign is built at import, before the
 * language is known).
 */
const ERA_TEXT: Readonly<Record<string, { name: TranslationKey; period: TranslationKey }>> = {
  ancient: { name: 'campaign.eras.ancient.name', period: 'campaign.eras.ancient.period' },
  medieval: { name: 'campaign.eras.medieval.name', period: 'campaign.eras.medieval.period' },
  'early-modern': { name: 'campaign.eras.earlyModern.name', period: 'campaign.eras.earlyModern.period' },
  nineteenth: { name: 'campaign.eras.nineteenth.name', period: 'campaign.eras.nineteenth.period' },
  modern: { name: 'campaign.eras.modern.name', period: 'campaign.eras.modern.period' },
};

/** An era's display name in the current language (`world.name` is the English). */
export function eraName(world: Pick<CampaignWorld, 'id' | 'name'>): string {
  const key = ERA_TEXT[world.id]?.name;
  return key === undefined ? world.name : t(key);
}

/** An era's year-span label in the current language. */
export function eraPeriod(world: Pick<CampaignWorld, 'id' | 'period'>): string {
  const key = ERA_TEXT[world.id]?.period;
  return key === undefined ? world.period : t(key);
}

/**
 * A stage's display title in the current language (`stage.title` is the
 * English). Route names are content, so they stay as authored for now.
 */
export function stageTitle(stage: CampaignStage, worlds: readonly CampaignWorld[] = CAMPAIGN): string {
  const world = getWorld(stage.worldId, worlds);
  if (world === undefined) return stage.title;
  const era = eraName(world);
  const route = stage.routeId === undefined ? undefined : world.routes.find((r) => r.id === stage.routeId);
  return route === undefined
    ? t('campaign.stageTitle', { era, index: stage.index })
    : t('campaign.routeStageTitle', { era, route: routeName(route), index: stage.index });
}

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

function starsOf(progress: CampaignProgress, stageId: string): number {
  return progress[stageId]?.stars ?? 0;
}

function isCleared(progress: CampaignProgress, stageId: string): boolean {
  return starsOf(progress, stageId) >= 1;
}

/** Where a stage sits: its world and, for a route stage, its route. */
function locate(
  stageId: string,
  worlds: readonly CampaignWorld[],
): { world: CampaignWorld; stage: CampaignStage; route?: CampaignRoute } | undefined {
  for (const world of worlds) {
    const main = world.stages.find((s) => s.id === stageId);
    if (main) return { world, stage: main };
    for (const route of world.routes) {
      const stage = route.stages.find((s) => s.id === stageId);
      if (stage) return { world, stage, route };
    }
  }
  return undefined;
}

/** The main stage after `stageId` on the main path, crossing eras. */
function nextMainStage(stageId: string, worlds: readonly CampaignWorld[]): CampaignStage | undefined {
  const main = allStages(worlds);
  const i = main.findIndex((s) => s.id === stageId);
  return i < 0 ? undefined : main[i + 1];
}

/** Routes that fork after `stageId`. */
function routesAfter(stageId: string, worlds: readonly CampaignWorld[]): CampaignRoute[] {
  return worlds.flatMap((w) => w.routes.filter((r) => r.afterStageId === stageId));
}

/** Where a route rejoins the main path: the main stage right after its fork. */
export function rejoinStageOf(
  route: CampaignRoute,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): CampaignStage | undefined {
  return nextMainStage(route.afterStageId, worlds);
}

/**
 * Whether a stage is playable:
 *  1. it already has a star (protects every existing player, even past a fork);
 *  2. it is the very first stage;
 *  3. route stage 1 once its fork stage has a star; later route stages once the
 *     previous route stage has one;
 *  4. the main stage right after a fork once the last stage of EITHER route has one;
 *  5. any other main stage once the previous main stage has one.
 * This also gates later eras behind earlier ones. Unknown ids are locked.
 */
export function isStageUnlocked(
  stageId: string,
  progress: CampaignProgress,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): boolean {
  const found = locate(stageId, worlds);
  if (found === undefined) return false;
  if (isCleared(progress, stageId)) return true;
  if (found.route !== undefined) {
    const i = found.stage.index - 1;
    const previousId = i === 0 ? found.route.afterStageId : found.route.stages[i - 1]!.id;
    return isCleared(progress, previousId);
  }
  const main = allStages(worlds);
  const index = main.findIndex((s) => s.id === stageId);
  if (index === 0) return true;
  const previous = main[index - 1]!;
  const fork = routesAfter(previous.id, worlds);
  if (fork.length > 0) {
    return fork.some((route) => isCleared(progress, route.stages.at(-1)!.id));
  }
  return isCleared(progress, previous.id);
}

/** Eras playable without Premium, counted from the start of the campaign. */
export const FREE_ERA_COUNT = 1;

/** Every era after the free ones (the Middle Ages onward) needs Premium. */
export function isWorldPremium(worldId: string, worlds: readonly CampaignWorld[] = CAMPAIGN): boolean {
  const world = getWorld(worldId, worlds);
  return world !== undefined && world.index > FREE_ERA_COUNT;
}

/** Route stages are priced like their era. */
export function isStagePremium(
  stage: CampaignStage,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): boolean {
  return isWorldPremium(stage.worldId, worlds);
}

/** What follows a stage: another stage, a fork for the player to choose at, or the end. */
export type NextStep =
  | { kind: 'stage'; stage: CampaignStage }
  | { kind: 'fork'; forkStageId: string }
  | { kind: 'end' };

/**
 * The step after `stageId`: within a route the next route stage, after a
 * route's last stage its rejoin stage, at a fork stage the fork itself (the
 * player picks a route on the map), otherwise the next main stage.
 */
export function nextStage(stageId: string, worlds: readonly CampaignWorld[] = CAMPAIGN): NextStep {
  const found = locate(stageId, worlds);
  if (found === undefined) return { kind: 'end' };
  if (found.route !== undefined) {
    const following = found.route.stages[found.stage.index];
    if (following !== undefined) return { kind: 'stage', stage: following };
    const rejoin = rejoinStageOf(found.route, worlds);
    return rejoin === undefined ? { kind: 'end' } : { kind: 'stage', stage: rejoin };
  }
  if (routesAfter(stageId, worlds).length > 0) return { kind: 'fork', forkStageId: stageId };
  const next = nextMainStage(stageId, worlds);
  return next === undefined ? { kind: 'end' } : { kind: 'stage', stage: next };
}

export interface EraStatus {
  /** Main-path stages with at least one star. */
  cleared: number;
  /** Main-path stages in the era (routes are optional side paths). */
  total: number;
  /**
   * Every main-path stage has a star. The rejoin stage needs a finished
   * route, so new players must have taken one; players from before forks
   * existed keep their seal.
   */
  complete: boolean;
  /** Every stage (main and both routes) at three stars. */
  mastered: boolean;
}

export function eraStatus(world: CampaignWorld, progress: CampaignProgress): EraStatus {
  const cleared = world.stages.filter((s) => isCleared(progress, s.id)).length;
  const total = world.stages.length;
  return {
    cleared,
    total,
    complete: total > 0 && cleared === total,
    mastered: total > 0 && worldStages(world).every((s) => starsOf(progress, s.id) >= 3),
  };
}

/** Stars earned across some stages. */
export function starsEarned(stages: readonly CampaignStage[], progress: CampaignProgress): number {
  return stages.reduce((n, s) => n + starsOf(progress, s.id), 0);
}

/**
 * Route stages the frontier passes over: every route of a settled fork (one
 * route finished, or the player already past the rejoin stage — e.g. from
 * before forks existed), and the unchosen route once the player has starred a
 * stage of the other.
 */
function passedRouteStageIds(
  progress: CampaignProgress,
  worlds: readonly CampaignWorld[],
): ReadonlySet<string> {
  const skip = new Set<string>();
  for (const world of worlds) {
    const [first] = world.routes;
    if (first === undefined) continue;
    const rejoin = rejoinStageOf(first, worlds);
    const settled =
      world.routes.some((r) => r.stages.every((s) => isCleared(progress, s.id))) ||
      (rejoin !== undefined && isCleared(progress, rejoin.id));
    const chosen = world.routes.find((r) => r.stages.some((s) => isCleared(progress, s.id)));
    for (const route of world.routes) {
      if (settled || (chosen !== undefined && route !== chosen)) {
        for (const s of route.stages) skip.add(s.id);
      }
    }
  }
  return skip;
}

/** The next stage to play: the first unlocked, unstarred stage in play order the frontier hasn't passed. */
export function frontierStage(
  progress: CampaignProgress,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): CampaignStage | undefined {
  const passed = passedRouteStageIds(progress, worlds);
  return allStagesIncludingRoutes(worlds).find(
    (s) => !passed.has(s.id) && !isCleared(progress, s.id) && isStageUnlocked(s.id, progress, worlds),
  );
}

/** Stages wearing the frontier pulse: the frontier, plus the other route's opener at a fresh fork. */
export function pulseStageIds(
  progress: CampaignProgress,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
  /** The frontier, when the caller already has it. */
  frontier: CampaignStage | undefined = frontierStage(progress, worlds),
): ReadonlySet<string> {
  const ids = new Set<string>();
  if (frontier === undefined) return ids;
  ids.add(frontier.id);
  if (frontier.routeId !== undefined && frontier.index === 1) {
    for (const route of getWorld(frontier.worldId, worlds)?.routes ?? []) {
      const opener = route.stages[0];
      if (opener !== undefined && !isCleared(progress, opener.id) && isStageUnlocked(opener.id, progress, worlds)) {
        ids.add(opener.id);
      }
    }
  }
  return ids;
}

export interface ProgressDelta {
  /** Stages that went from no stars to cleared, in play order. */
  cleared: string[];
  /** Stages that became playable, in play order. */
  unlocked: string[];
}

/** What changed on the map between two progress snapshots — drives the light-up sequence. */
export function progressSince(
  before: CampaignProgress,
  after: CampaignProgress,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): ProgressDelta {
  const cleared: string[] = [];
  const unlocked: string[] = [];
  for (const stage of allStagesIncludingRoutes(worlds)) {
    if (!isCleared(before, stage.id) && isCleared(after, stage.id)) cleared.push(stage.id);
    if (!isStageUnlocked(stage.id, before, worlds) && isStageUnlocked(stage.id, after, worlds)) {
      unlocked.push(stage.id);
    }
  }
  return { cleared, unlocked };
}
