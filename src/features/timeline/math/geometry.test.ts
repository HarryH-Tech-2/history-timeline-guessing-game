import { MAX_YEAR, MIN_YEAR } from './constants';
import {
  BASE_WIDTH,
  MAX_SCALE,
  MIN_SCALE,
  transformToFit,
  transformToRefocus,
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

  describe('transformToRefocus', () => {
    const width = 400;
    const span = 326;

    it('leaves the view alone when it is at least as tight as the default span', () => {
      const current = transformToFit(1700, 2026, width);
      expect(transformToRefocus(121, span, width, current)).toBe(current);
      const tighter = transformToFit(1900, 1950, width);
      expect(transformToRefocus(121, span, width, tighter)).toBe(tighter);
    });

    it('zooms a wide view back to the default span centred on the year', () => {
      const wide = transformToFit(-200, 1900, width); // a big-miss reveal framing
      const t = transformToRefocus(121, span, width, wide);
      expect(t).toEqual(transformToFit(121 - span / 2, 121 + span / 2, width));
      expect(yearAtScreenCentre(t, width)).toBeCloseTo(121, 4);
    });

    it('keeps the window inside the timeline at either end', () => {
      const wide = transformToFit(-1000, 2026, width);
      const ancient = transformToRefocus(-950, span, width, wide);
      expect(ancient).toEqual(transformToFit(MIN_YEAR, MIN_YEAR + span, width));
      const modern = transformToRefocus(2020, span, width, wide);
      expect(modern).toEqual(transformToFit(MAX_YEAR - span, MAX_YEAR, width));
    });
  });
});
