import type { Question } from '@/domain';

import { ARTS_EXPANSION } from './arts';
import { BATTLES_EXPANSION } from './battles';
import { EVENTS_EXPANSION } from './events';
import { EXPLORATION_EXPANSION } from './exploration';
import { PEOPLE_EXPANSION } from './people';
import { PHILOSOPHY_EXPANSION } from './philosophy';
import { REGIONAL_CATEGORY_EXPANSION } from './regional';
import { SPACE_EXPANSION } from './space';
import { SPORT_EXPANSION } from './sport';
import { TECHNOLOGY_EXPANSION } from './technology';
import { TRADE_EXPANSION } from './trade';
import { TREATIES_EXPANSION } from './treaties';

/**
 * The category expansion (2026-10-24): easy and medium questions for every
 * category (two per region for Regional). Played in category runs, Endless,
 * Survival and the Daily, but kept off the campaign main path and random
 * Social challenges (see `isInRotation`), so starred stages don't change.
 */
export const CATEGORY_EXPANSION: readonly Question[] = [
  ...EVENTS_EXPANSION,
  ...BATTLES_EXPANSION,
  ...PEOPLE_EXPANSION,
  ...TECHNOLOGY_EXPANSION,
  ...EXPLORATION_EXPANSION,
  ...TREATIES_EXPANSION,
  ...SPORT_EXPANSION,
  ...TRADE_EXPANSION,
  ...ARTS_EXPANSION,
  ...PHILOSOPHY_EXPANSION,
  ...REGIONAL_CATEGORY_EXPANSION,
  ...SPACE_EXPANSION,
];
