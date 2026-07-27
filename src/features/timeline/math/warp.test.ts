import { MAX_YEAR, MIN_YEAR, PRESENT_YEAR } from './constants';
import { clampYear, unwarp, warp } from './warp';

describe('warp / unwarp', () => {
  it('anchors the ends of the axis to [0, 1]', () => {
    expect(warp(MIN_YEAR)).toBeCloseTo(0, 10);
    expect(warp(MAX_YEAR)).toBeCloseTo(1, 10);
  });

  it('is monotonically increasing (later years sit further right)', () => {
    expect(warp(-500)).toBeLessThan(warp(0));
    expect(warp(0)).toBeLessThan(warp(1500));
    expect(warp(1500)).toBeLessThan(warp(2000));
    expect(warp(2000)).toBeLessThan(warp(PRESENT_YEAR));
  });

  it('gives recent years more axis space than ancient ones (non-linear zoom)', () => {
    const recentSpan = warp(2020) - warp(2010); // 10 modern years
    const ancientSpan = warp(-990) - warp(-1000); // 10 ancient years
    expect(recentSpan).toBeGreaterThan(ancientSpan);
  });

  it('round-trips year -> coord -> year across the full range', () => {
    for (const year of [MIN_YEAR, -776, -1, 0, 1, 476, 1066, 1969, 2001, MAX_YEAR]) {
      expect(unwarp(warp(year))).toBeCloseTo(year, 6);
    }
  });

  it('round-trips coord -> year -> coord', () => {
    for (const coord of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      expect(warp(unwarp(coord))).toBeCloseTo(coord, 10);
    }
  });

  it('clamps years to the representable range', () => {
    expect(clampYear(9999)).toBe(MAX_YEAR);
    expect(clampYear(-9999)).toBe(MIN_YEAR);
    expect(clampYear(1500)).toBe(1500);
  });
});
