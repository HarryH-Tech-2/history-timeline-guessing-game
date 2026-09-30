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

  it('puts the era word where the language wants it', () => {
    expect(formatYear(-450, 'a.C.')).toBe('450 a.C.');
    expect(formatYear(-450, '紀元前%y')).toBe('紀元前450');
    expect(formatYear(0, '紀元前%y')).toBe('紀元前1');
    expect(formatYear(1969, '紀元前%y')).toBe('1969');
  });
});

describe('roundToStep', () => {
  it('snaps to the nearest step', () => {
    expect(roundToStep(1974, 100)).toBe(2000);
    expect(roundToStep(1949, 100)).toBe(1900);
    expect(roundToStep(-776, 10)).toBe(-780);
  });
});
