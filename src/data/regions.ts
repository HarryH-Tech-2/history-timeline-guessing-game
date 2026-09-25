/**
 * The Regional category is played one region at a time: the player picks a
 * region, then runs through every Regional question tagged for it. Regions
 * are keyed by the continent tags the questions already carry.
 */
export interface Region {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  /** A Regional question belongs to the region when it carries this tag. */
  tag: string;
}

/** The category whose questions are split by region. */
export const REGIONAL_CATEGORY_ID = 'regional';

export const REGIONS: readonly Region[] = [
  { id: 'europe', name: 'Europe', icon: '🏰', blurb: 'Kingdoms, unions and revolutions.', tag: 'europe' },
  { id: 'asia', name: 'Asia', icon: '🏯', blurb: 'Dynasties, shogun and modern giants.', tag: 'asia' },
  { id: 'africa', name: 'Africa', icon: '🦁', blurb: 'Empires of gold and the road to freedom.', tag: 'africa' },
  { id: 'north-america', name: 'North America', icon: '🗽', blurb: 'From Tenochtitlan to Confederation.', tag: 'north-america' },
  { id: 'south-america', name: 'South America', icon: '🦙', blurb: 'The Inca, the liberators and new capitals.', tag: 'south-america' },
  { id: 'oceania', name: 'Oceania', icon: '🦘', blurb: 'First fleets, gold fields and firsts for the vote.', tag: 'oceania' },
];

export function regionById(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}
