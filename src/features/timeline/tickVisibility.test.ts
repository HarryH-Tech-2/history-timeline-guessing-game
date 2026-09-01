import { transformToFit, transformToReveal } from './math/geometry';
import {
  DECADE_MIN_SCALE,
  LINE_RAMPS,
  rampOpacity,
  TIER_YEARS,
  tierOf,
} from './tickVisibility';

const WIDTH = 360;

/**
 * On-screen px between neighbouring gridlines of the finest tier that is both
 * mounted and clearly visible (≥ 0.6 line opacity) at this zoom — i.e. how
 * dense the "separators" the player sees actually are. Null = an empty track.
 */
function finestLegibleSpacing(scale: number): number | null {
  for (let tier = TIER_YEARS.length - 1; tier >= 0; tier -= 1) {
    // Decade ticks are unmounted entirely below DECADE_MIN_SCALE.
    if (tier === 3 && scale < DECADE_MIN_SCALE) continue;
    const [from, to] = LINE_RAMPS[tier]!;
    if (rampOpacity(scale, from, to) >= 0.6) return TIER_YEARS[tier]! * scale;
  }
  return null;
}

describe('tick visibility across reveal zooms', () => {
  it('keeps clearly visible separators on screen for every size of miss', () => {
    // The player starts on the default framing and misses by `miss` years;
    // the reveal zooms out to fit both markers. Whatever scale that lands on,
    // some tier of gridline must be clearly visible and reasonably dense.
    const start = transformToFit(1700, 2026, WIDTH);
    for (let miss = 25; miss <= 2900; miss += 25) {
      const t = transformToReveal(1990, 1990 - miss, WIDTH, start);
      const spacing = finestLegibleSpacing(t.scale);
      expect(spacing).not.toBeNull();
      // ≤130px between lines: sparse at worst, but never an empty track.
      expect(spacing!).toBeLessThanOrEqual(130);
    }
  });

  it('keeps century gridlines visible in the 0.3–0.5 zoom band (the old bug)', () => {
    // The original ramp faded century lines in over [0.3, 0.5]: a ~700-year
    // miss reveals at ~scale 0.35, where centuries were near-invisible and
    // 500-year marks sat ~175px apart — the track looked stripped bare.
    const centuryTier = tierOf({ major: true, year: 1900 });
    const [from, to] = LINE_RAMPS[centuryTier]!;
    for (const scale of [0.3, 0.35, 0.4, 0.45, 0.5]) {
      expect(rampOpacity(scale, from, to)).toBe(1);
    }
  });

  it('classifies tick tiers by year', () => {
    expect(tierOf({ major: true, year: 1000 })).toBe(0);
    expect(tierOf({ major: true, year: -1000 })).toBe(0);
    expect(tierOf({ major: true, year: 1500 })).toBe(1);
    expect(tierOf({ major: true, year: 1900 })).toBe(2);
    expect(tierOf({ major: false, year: 1910 })).toBe(3);
  });
});
