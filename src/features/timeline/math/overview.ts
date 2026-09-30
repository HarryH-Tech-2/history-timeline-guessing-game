import { MAX_YEAR, MIN_YEAR } from './constants';

/** One era on the overview bar: its span of years and the campaign's colour for it. */
export interface OverviewEra {
  id: string;
  label: string;
  /** First year of the era (inclusive). */
  from: number;
  /** First year of the next era; the last era runs to MAX_YEAR. */
  to: number;
  colour: string;
}

/**
 * The eras of the overview bar, oldest first. Boundaries and colours match the
 * campaign's era worlds, so the bar reads as the same five periods.
 */
export const OVERVIEW_ERAS: readonly OverviewEra[] = [
  { id: 'ancient', label: 'Ancient', from: MIN_YEAR, to: 500, colour: '#E7B84C' },
  { id: 'medieval', label: 'Medieval', from: 500, to: 1500, colour: '#B07BD9' },
  { id: 'early-modern', label: 'Early Mod.', from: 1500, to: 1800, colour: '#57BE8F' },
  { id: 'nineteenth', label: '19th C', from: 1800, to: 1900, colour: '#E8564E' },
  { id: 'modern', label: 'Modern', from: 1900, to: MAX_YEAR, colour: '#A9B6C2' },
];

// Flat copies for worklets: plain number arrays copy to the UI thread cheaply.
const FROM = OVERVIEW_ERAS.map((e) => e.from);
const TO = OVERVIEW_ERAS.map((e) => e.to);
const COUNT = OVERVIEW_ERAS.length;

/**
 * Where `year` sits on an overview bar `width` px wide. Every era gets an equal
 * slot, whatever its length, so the last two centuries (where most questions
 * are) get two fifths of the bar instead of a sliver; within an era the scale
 * is linear.
 */
export function overviewX(year: number, width: number): number {
  'worklet';
  const y = Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
  let i = 0;
  for (let k = 1; k < COUNT; k += 1) if (y >= FROM[k]!) i = k;
  const slot = width / COUNT;
  return slot * (i + (y - FROM[i]!) / (TO[i]! - FROM[i]!));
}

/** Inverse of {@link overviewX}: the year at `x` px along the bar. */
export function overviewYear(x: number, width: number): number {
  'worklet';
  if (width <= 0) return MIN_YEAR;
  const f = Math.min(COUNT, Math.max(0, (x / width) * COUNT));
  const i = Math.min(COUNT - 1, Math.floor(f));
  return FROM[i]! + (f - i) * (TO[i]! - FROM[i]!);
}
