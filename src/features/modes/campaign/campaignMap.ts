import { getFreeQuestions } from '@/data';
import { DIFFICULTY_ORDER, type Question, type RoundResult } from '@/domain';

import type { CampaignProgress } from '../persistence';

export const STAGE_SIZE = 5;

export interface CampaignStage {
  id: string;
  worldId: string;
  /** 1-based position within the world. */
  index: number;
  title: string;
  questionIds: readonly string[];
}

export interface CampaignWorld {
  id: string;
  name: string;
  colour: string;
  icon: string;
  /** 1-based position in the campaign. */
  index: number;
  stages: readonly CampaignStage[];
}

/** One campaign world per era of history, played oldest to newest. */
interface EraSpec {
  id: string;
  name: string;
  colour: string;
  icon: string;
  /** Inclusive last year of the era (signed; the previous era's max bounds the start). */
  maxYear: number;
}

const ERAS: readonly EraSpec[] = [
  { id: 'ancient', name: 'The Ancient World', colour: '#E7B84C', icon: 'flag', maxYear: 500 },
  { id: 'medieval', name: 'The Middle Ages', colour: '#B07BD9', icon: 'swords', maxYear: 1499 },
  { id: 'early-modern', name: 'The Early Modern Age', colour: '#57BE8F', icon: 'person', maxYear: 1799 },
  { id: 'nineteenth', name: 'The 19th Century', colour: '#E8564E', icon: 'cpu', maxYear: 1899 },
  {
    id: 'modern',
    name: 'The Modern Era',
    colour: '#A9B6C2',
    icon: 'cpu',
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

/**
 * The campaign is one world per time period, played in chronological order.
 * Within an era the questions are ordered easy→hard (then by year) and split
 * into fixed stages, so progression still feels like a gentle difficulty
 * ramp. Premium-only categories are excluded: era worlds mix categories, so a
 * single premium stage would break the star-gated unlock chain for free
 * players — premium content lives in practice runs, Endless and Survival.
 * Built once from the seed data.
 */
function buildCampaign(): readonly CampaignWorld[] {
  const questions = getFreeQuestions();

  return ERAS.map((era, worldIndex) => {
    const ordered = questions
      .filter((q) => eraOf(q).id === era.id)
      .sort((a, b) => {
        const byDifficulty = difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
        return byDifficulty !== 0 ? byDifficulty : a.year - b.year;
      });

    const stages: CampaignStage[] = chunk(ordered, STAGE_SIZE).map((group, stageIndex) => ({
      id: `${era.id}-s${stageIndex + 1}`,
      worldId: era.id,
      index: stageIndex + 1,
      title: `${era.name} · Stage ${stageIndex + 1}`,
      questionIds: group.map((q) => q.id),
    }));

    return {
      id: era.id,
      name: era.name,
      colour: era.colour,
      icon: era.icon,
      index: worldIndex + 1,
      stages,
    };
  }).filter((world) => world.stages.length > 0);
}

export const CAMPAIGN: readonly CampaignWorld[] = buildCampaign();

export function getWorld(worldId: string): CampaignWorld | undefined {
  return CAMPAIGN.find((w) => w.id === worldId);
}

export function getStage(worldId: string, stageId: string): CampaignStage | undefined {
  return getWorld(worldId)?.stages.find((s) => s.id === stageId);
}

/** A flat, ordered list of every stage across every world. */
export function allStages(): readonly CampaignStage[] {
  return CAMPAIGN.flatMap((w) => w.stages);
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
