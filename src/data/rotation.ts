import { CAMPAIGN_ROUTES } from './packs/campaignRoutes';
import { REGIONAL_EXPANSION } from './packs/regionalExpansion';

/**
 * Question ids kept out of the seeded, shared modes: the Daily, the campaign
 * main path and random Social challenges. Adding questions there would give
 * old and new builds different Dailies on the same day and move questions
 * between stages players have already starred. Shared by the app
 * (`isInRotation`) and scripts/exportCatalogueForFunctions.ts.
 */
export const OUT_OF_ROTATION_IDS: ReadonlySet<string> = new Set(
  [...REGIONAL_EXPANSION, ...CAMPAIGN_ROUTES].map((q) => q.id),
);
