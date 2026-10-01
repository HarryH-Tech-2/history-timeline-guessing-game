import { decadeSlotYear, FIRST_TICK_YEAR } from './ticks';

const POOL = 60;

function slotYears(centreYear: number): (number | null)[] {
  return Array.from({ length: POOL }, (_, slot) => decadeSlotYear(slot, centreYear, POOL));
}

describe('decadeSlotYear', () => {
  it('covers every non-century decade around the crosshair, once each', () => {
    for (const centre of [-950, 121, 1500, 1863]) {
      const years = slotYears(centre).filter((y): y is number => y !== null);
      expect(new Set(years).size).toBe(years.length);
      // Every decade within ±25 decades of the centre is drawn by some slot.
      const base = Math.floor(centre / 10) * 10;
      for (let year = base - 250; year <= base + 250; year += 10) {
        if (year % 100 === 0 || year > 2026 || year < FIRST_TICK_YEAR) continue;
        expect(years).toContain(year);
      }
    }
  });

  it('leaves century years to the labelled ticks', () => {
    expect(slotYears(1863)).not.toContain(1800);
    expect(slotYears(1863)).not.toContain(1900);
  });

  it('moves only the slot that wraps when the crosshair crosses a decade', () => {
    const before = slotYears(1863);
    const after = slotYears(1873);
    const changed = before.filter((y, i) => y !== after[i]);
    expect(changed).toHaveLength(1);
  });

  it('draws nothing past either end of the gridlines', () => {
    for (const y of [...slotYears(2026), ...slotYears(FIRST_TICK_YEAR)]) {
      if (y === null) continue;
      expect(y).toBeGreaterThanOrEqual(FIRST_TICK_YEAR);
      expect(y).toBeLessThanOrEqual(2026);
    }
  });
});
