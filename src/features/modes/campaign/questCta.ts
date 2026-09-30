import { t } from '@/i18n';

import { CAMPAIGN, isStagePremium, nextStage, type CampaignStage, type CampaignWorld } from './campaignMap';

export type QuestAction =
  | { kind: 'stage'; stage: CampaignStage }
  | { kind: 'paywall'; eraId: string }
  /** Back to the map; at a fork `focusStageId` names the fork the player chooses a route at. */
  | { kind: 'map'; focusStageId?: string };

/**
 * The main button after clearing a stage: carry straight on to the next one,
 * or — when that stage is Premium and the player isn't — to the paywall. At a
 * fork the player picks a route on the map, so it returns there (the map's
 * frontier scroll lands on the fork). After the final stage there is nowhere
 * left to march, so back to the map.
 */
export function questCta(
  stage: CampaignStage,
  isPremium: boolean,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): { label: string; action: QuestAction } {
  const next = nextStage(stage.id, worlds);
  if (next.kind === 'end') return { label: t('campaign.play.backToMap'), action: { kind: 'map' } };
  const label = t('campaign.play.continueQuest');
  if (next.kind === 'fork') return { label, action: { kind: 'map', focusStageId: next.forkStageId } };
  if (isStagePremium(next.stage, worlds) && !isPremium) return { label, action: { kind: 'paywall', eraId: next.stage.worldId } };
  return { label, action: { kind: 'stage', stage: next.stage } };
}
