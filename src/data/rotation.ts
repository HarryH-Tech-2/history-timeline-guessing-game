import { CAMPAIGN_ROUTES } from './packs/campaignRoutes';
import { CATEGORY_EXPANSION } from './packs/categoryExpansion';
import { REGIONAL_EXPANSION } from './packs/regionalExpansion';

/**
 * Question ids kept out of the campaign main path and random Social
 * challenges. Adding questions there would move questions between stages
 * players have already starred, and hand challenges to old builds that lack
 * them. Shared by the app (`isInRotation`) and
 * scripts/exportCatalogueForFunctions.ts. The Daily no longer uses this set
 * from `DAILY_WHOLE_CATALOGUE_FROM` (see ./index).
 */
export const OUT_OF_ROTATION_IDS: ReadonlySet<string> = new Set(
  [...REGIONAL_EXPANSION, ...CAMPAIGN_ROUTES, ...CATEGORY_EXPANSION].map((q) => q.id),
);

/**
 * Packs graded against their own narrow pools ("easy" for a Crusades fork),
 * which ./fame reads one tier less famous than their label. The category
 * expansion was graded against the whole catalogue, so it isn't here.
 */
export const NARROW_GRADED_IDS: ReadonlySet<string> = new Set(
  [...REGIONAL_EXPANSION, ...CAMPAIGN_ROUTES].map((q) => q.id),
);
