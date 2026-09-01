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
      // ≤100px between lines: the track must always read as a ruler.
      expect(spacing!).toBeLessThanOrEqual(100);
    }
  });

  it('keeps century gridlines FULLY visible across the whole reveal range (the old bug)', () => {
    // Two earlier ramps ([0.3, 0.5], then [0.12, 0.28]) both left big-miss
    // reveals looking stripped bare: verified on-device, a 2,081-year miss on
    // a 390dp-wide track reveals at ~scale 0.15, where a partially-faded
    // century line is effectively invisible. Centuries must be at full
    // opacity from scale 0.1 (the deepest a reveal can zoom) upward.
    const centuryTier = tierOf({ major: true, year: 1900 });
    const [from, to] = LINE_RAMPS[centuryTier]!;
    for (const scale of [0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.7, 1]) {
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
