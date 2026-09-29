import type { Question } from '@/domain';

import { AFRICA_EXPANSION } from './africa';
import { ASIA_EXPANSION } from './asia';
import { EUROPE_EXPANSION } from './europe';
import { NORTH_AMERICA_EXPANSION } from './northAmerica';
import { OCEANIA_EXPANSION } from './oceania';
import { SOUTH_AMERICA_EXPANSION } from './southAmerica';

/**
 * The Regional expansion (2026-09-29): 14 more questions per region, taking
 * each to 20. Played only through the Regional category — the Daily and the
 * campaign skip it (see `isInRotation`), so adding it changes neither the
 * Daily a given date deals nor the questions inside existing campaign stages.
 */
export const REGIONAL_EXPANSION: readonly Question[] = [
  ...EUROPE_EXPANSION,
  ...ASIA_EXPANSION,
  ...AFRICA_EXPANSION,
  ...NORTH_AMERICA_EXPANSION,
  ...SOUTH_AMERICA_EXPANSION,
  ...OCEANIA_EXPANSION,
];
