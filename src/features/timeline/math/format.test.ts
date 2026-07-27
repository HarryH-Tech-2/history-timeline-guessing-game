import { formatYear, roundToStep } from './format';

describe('formatYear', () => {
  it.each([
    [2026, '2026'],
    [1066, '1066'],
    [1, '1'],
    [0, '1 BCE'],
    [-776, '776 BCE'],
    [-3000, '3000 BCE'],
  ])('formats %i as %s', (year, expected) => {
    expect(formatYear(year)).toBe(expected);
  });
});

describe('roundToStep', () => {
  it('snaps to the nearest step', () => {
    expect(roundToStep(1974, 100)).toBe(2000);
    expect(roundToStep(1949, 100)).toBe(1900);
    expect(roundToStep(-776, 10)).toBe(-780);
  });
});
