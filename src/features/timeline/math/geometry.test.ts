import { MAX_YEAR, MIN_YEAR } from './constants';
import {
  BASE_WIDTH,
  MAX_SCALE,
  MIN_SCALE,
  transformToFit,
  worldXForYear,
  yearAtScreenCentre,
  yearForWorldX,
} from './geometry';

describe('geometry', () => {
  it('keeps one year ≈ 1px at scale 1, whatever the year range', () => {
    // The tick fade ramps are calibrated against this density; if it drifts,
    // dividers fade out at framings where they used to be visible.
    expect(BASE_WIDTH / (MAX_YEAR - MIN_YEAR)).toBeCloseTo(1, 5);
  });

  it('round-trips year <-> worldX', () => {
    for (const year of [-3000, -50, 1066, 1969, 2026]) {
      expect(yearForWorldX(worldXForYear(year))).toBeCloseTo(year, 4);
    }
  });

  it('fits a range so it spans the screen with its centre in-range', () => {
    const width = 400;
    const t = transformToFit(1800, 2000, width);
    // Screen edges map back to the requested endpoints.
    expect(yearForWorldX(-t.translateX / t.scale)).toBeCloseTo(1800, 4);
    expect(yearForWorldX((width - t.translateX) / t.scale)).toBeCloseTo(2000, 4);
    // The centre year sits between the endpoints.
    const centre = yearAtScreenCentre(t, width);
    expect(centre).toBeGreaterThan(1800);
    expect(centre).toBeLessThan(2000);
  });

  it('clamps the fitted scale within bounds', () => {
    const tiny = transformToFit(2025, 2026, 400); // would demand a huge scale
    expect(tiny.scale).toBeLessThanOrEqual(MAX_SCALE);
    const huge = transformToFit(-3000, 2026, 400); // would demand a tiny scale
    expect(huge.scale).toBeGreaterThanOrEqual(MIN_SCALE);
  });
});
