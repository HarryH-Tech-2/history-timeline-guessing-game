import { isStagePremium, nextStage, type CampaignStage } from './campaignMap';

export type QuestAction =
  | { kind: 'stage'; stage: CampaignStage }
  | { kind: 'paywall' }
  | { kind: 'map' };

/**
 * The main button after clearing a stage: carry straight on to the next one,
 * or — when that stage is Premium and the player isn't — to the paywall.
 * After the final stage there is nowhere left to march, so back to the map.
 */
export function questCta(
  stage: CampaignStage,
  isPremium: boolean,
): { label: string; action: QuestAction } {
  const next = nextStage(stage.id);
  if (next === null) return { label: 'Back to map', action: { kind: 'map' } };
  const label = 'Continue your quest →';
  if (isStagePremium(next) && !isPremium) return { label, action: { kind: 'paywall' } };
  return { label, action: { kind: 'stage', stage: next } };
}
