import { MAX_YEAR, MIN_YEAR } from './constants';
import { OVERVIEW_ERAS, overviewX, overviewYear } from './overview';

const W = 300;

describe('overview bar scale', () => {
  it('gives every era an equal slot', () => {
    OVERVIEW_ERAS.forEach((era, i) => {
      expect(overviewX(era.from, W)).toBeCloseTo((i * W) / OVERVIEW_ERAS.length, 6);
    });
    expect(overviewX(MAX_YEAR, W)).toBeCloseTo(W, 6);
  });

  it('is linear within an era', () => {
    // Halfway through the 19th century is halfway through its slot.
    expect(overviewX(1850, W)).toBeCloseTo(3.5 * (W / 5), 6);
  });

  it('clamps years outside the timeline to the ends', () => {
    expect(overviewX(MIN_YEAR - 500, W)).toBe(0);
    expect(overviewX(MAX_YEAR + 500, W)).toBeCloseTo(W, 6);
  });

  it('maps a position back to its year', () => {
    for (const year of [MIN_YEAR, -250, 500, 1066, 1499, 1776, 1850, 1969, MAX_YEAR]) {
      expect(overviewYear(overviewX(year, W), W)).toBeCloseTo(year, 6);
    }
  });

  it('clamps positions off the bar', () => {
    expect(overviewYear(-40, W)).toBe(MIN_YEAR);
    expect(overviewYear(W + 40, W)).toBeCloseTo(MAX_YEAR, 6);
  });

  it('runs the eras end to end with no gaps', () => {
    for (let i = 1; i < OVERVIEW_ERAS.length; i += 1) {
      expect(OVERVIEW_ERAS[i]!.from).toBe(OVERVIEW_ERAS[i - 1]!.to);
    }
    expect(OVERVIEW_ERAS[0]!.from).toBe(MIN_YEAR);
    expect(OVERVIEW_ERAS.at(-1)!.to).toBe(MAX_YEAR);
  });
});
