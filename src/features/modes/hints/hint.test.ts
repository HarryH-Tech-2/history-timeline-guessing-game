import { centuryHint, hintTemplate } from './hint';

describe('centuryHint', () => {
  it('bands positive years to their century', () => {
    expect(centuryHint(1969)).toBe('the 1900s');
    expect(centuryHint(2001)).toBe('the 2000s');
    expect(centuryHint(1)).toBe('the 1st century');
  });

  it('bands BCE years by absolute value, so 450 BCE is in the 400s BCE', () => {
    expect(centuryHint(-450)).toBe('the 400s BCE');
    expect(centuryHint(-776)).toBe('the 700s BCE');
    expect(centuryHint(-400)).toBe('the 400s BCE');
    expect(centuryHint(-499)).toBe('the 400s BCE');
    expect(centuryHint(-1)).toBe('the 1st century BCE');
    expect(centuryHint(-99)).toBe('the 1st century BCE');
  });
});

describe('hintTemplate', () => {
  it('always contains the band slot', () => {
    for (const id of ['q1', 'q2', 'abc', 'continents-041']) {
      expect(hintTemplate(id)).toContain('{band}');
    }
  });

  it('is deterministic per question', () => {
    expect(hintTemplate('q1')).toBe(hintTemplate('q1'));
  });

  it('varies across questions', () => {
    const picks = new Set(
      Array.from({ length: 40 }, (_, i) => hintTemplate(`question-${i}`)),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});
