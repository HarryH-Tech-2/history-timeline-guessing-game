import data from './catalogue.json';

type Row = { year: number; inRotation: boolean };
const CATALOGUE = data as Record<string, Row>;

export function hasQuestion(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(CATALOGUE, id);
}

export function yearOf(id: string): number | undefined {
  return hasQuestion(id) ? CATALOGUE[id]!.year : undefined;
}

/** Ids a random challenge may draw from: the same pool as the Daily. */
export function rotationPool(): string[] {
  return Object.entries(CATALOGUE)
    .filter(([, row]) => row.inRotation)
    .map(([id]) => id);
}
