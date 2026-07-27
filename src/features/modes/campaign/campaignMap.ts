import { getCategories, getQuestionsByCategory } from '@/data';
import { DIFFICULTY_ORDER, type RoundResult } from '@/domain';

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
  categoryId: string;
  name: string;
  colour: string;
  icon: string;
  /** 1-based position in the campaign. */
  index: number;
  stages: readonly CampaignStage[];
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
 * The campaign is one world per category. Each category's questions are ordered
 * easy→hard (then by year) and split into fixed stages, so progression feels
 * like a gentle difficulty ramp. Built once from the seed data.
 */
function buildCampaign(): readonly CampaignWorld[] {
  const categories = [...getCategories()]
    .filter((c) => c.active)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return categories.map((category, worldIndex) => {
    const ordered = [...getQuestionsByCategory(category.id)].sort((a, b) => {
      const byDifficulty = difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
      return byDifficulty !== 0 ? byDifficulty : a.year - b.year;
    });

    const stages: CampaignStage[] = chunk(ordered, STAGE_SIZE).map((group, stageIndex) => ({
      id: `${category.id}-s${stageIndex + 1}`,
      worldId: category.id,
      index: stageIndex + 1,
      title: `${category.name} · Stage ${stageIndex + 1}`,
      questionIds: group.map((q) => q.id),
    }));

    return {
      id: category.id,
      categoryId: category.id,
      name: category.name,
      colour: category.colour,
      icon: category.icon,
      index: worldIndex + 1,
      stages,
    };
  });
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
 * play order has earned at least one star. This naturally gates later worlds
 * behind earlier ones.
 */
export function isStageUnlocked(stageId: string, progress: CampaignProgress): boolean {
  const stages = allStages();
  const index = stages.findIndex((s) => s.id === stageId);
  if (index <= 0) return index === 0; // first stage unlocked; unknown id locked
  const previous = stages[index - 1]!;
  return (progress[previous.id]?.stars ?? 0) >= 1;
}
