import type { CampaignRouteSpec } from '@/data';
import type { Question } from '@/domain';

import { buildCampaign } from '../campaignMap';

function question(
  id: string,
  year: number,
  tags: readonly string[] = [],
  difficulty: Question['difficulty'] = 'easy',
): Question {
  return {
    id,
    categoryId: 'events',
    title: id,
    subtitle: '',
    year,
    difficulty,
    country: '',
    region: '',
    latitude: 0,
    longitude: 0,
    shortDescription: '',
    longDescription: '',
    tags: [...tags],
    verified: true,
    featured: false,
  };
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export const FIXTURE_ROUTE_SPECS: readonly CampaignRouteSpec[] = [
  { id: 'north', eraId: 'ancient', name: 'North Road', icon: 'N' },
  { id: 'south', eraId: 'ancient', name: 'South Road', icon: 'S' },
  { id: 'east', eraId: 'medieval', name: 'East Road', icon: 'E' },
  // No questions: omitted from the built world.
  { id: 'west', eraId: 'medieval', name: 'West Road', icon: 'W' },
];

/** Ancient: 30 questions → 6 stages (fork after s2). Medieval: 10 → 2 stages (fork after s1). */
export const FIXTURE_POOL: readonly Question[] = [
  ...range(30).map((i) => question(`anc-${i}`, -500 + i)),
  ...range(10).map((i) => question(`med-${i}`, 600 + i)),
];

/** north: n-0..n-4 are hard, so they sort into stage 3; south and east are all easy. */
export const FIXTURE_ROUTE_QUESTIONS: readonly Question[] = [
  ...range(15).map((i) => question(`n-${i}`, -400 + i, ['north'], i < 5 ? 'hard' : 'easy')),
  ...range(15).map((i) => question(`s-${i}`, -300 + i, ['south'])),
  ...range(5).map((i) => question(`e-${i}`, 700 + i, ['east'])),
];

export const FIXTURE_WORLDS = buildCampaign(FIXTURE_POOL, FIXTURE_ROUTE_QUESTIONS, FIXTURE_ROUTE_SPECS);
