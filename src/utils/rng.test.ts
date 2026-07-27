import { mulberry32, pickDeterministic, seedFromString } from './rng';

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toEqual(b());
  });

  it('stays within [0, 1)', () => {
    const rand = mulberry32(999);
    for (let i = 0; i < 100; i += 1) {
      const value = rand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('hashes strings deterministically', () => {
    expect(seedFromString('2026-07-27')).toBe(seedFromString('2026-07-27'));
    expect(seedFromString('2026-07-27')).not.toBe(seedFromString('2026-07-28'));
  });

  it('picks the same distinct subset for a given seed', () => {
    const items = Array.from({ length: 40 }, (_, i) => i);
    const seed = seedFromString('daily-2026-07-27');
    const first = pickDeterministic(items, 8, seed);
    const second = pickDeterministic(items, 8, seed);

    expect(first).toEqual(second);
    expect(first).toHaveLength(8);
    expect(new Set(first).size).toBe(8); // distinct
  });

  it('clamps the count to the pool size', () => {
    expect(pickDeterministic([1, 2, 3], 10, 42)).toHaveLength(3);
  });
});
