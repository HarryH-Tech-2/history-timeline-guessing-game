import type { Question } from '@/domain';

import { ANCIENT_ROUTE_QUESTIONS } from './ancient';
import { EARLY_MODERN_ROUTE_QUESTIONS } from './earlyModern';
import { MEDIEVAL_ROUTE_QUESTIONS } from './medieval';
import { MODERN_ROUTE_QUESTIONS } from './modern';
import { NINETEENTH_ROUTE_QUESTIONS } from './nineteenth';

export { CAMPAIGN_ROUTE_SPECS, type CampaignRouteSpec } from './routes';

/**
 * Campaign route questions (2026-09-29): 5 eras × 2 routes × 15. Played in the
 * campaign's route forks and in category/Endless pools, but kept out of the
 * Daily and the campaign main path (see `isInRotation`), so neither changes.
 */
export const CAMPAIGN_ROUTES: readonly Question[] = [
  ...ANCIENT_ROUTE_QUESTIONS,
  ...MEDIEVAL_ROUTE_QUESTIONS,
  ...EARLY_MODERN_ROUTE_QUESTIONS,
  ...NINETEENTH_ROUTE_QUESTIONS,
  ...MODERN_ROUTE_QUESTIONS,
];
