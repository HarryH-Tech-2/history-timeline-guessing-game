import { centuryHint } from './hint';

describe('centuryHint', () => {
  it('bands positive years to their century', () => {
    expect(centuryHint(1969)).toBe('the 1900s');
    expect(centuryHint(2001)).toBe('the 2000s');
    expect(centuryHint(1)).toBe('the 0s');
  });

  it('labels negative years as BCE bands', () => {
    expect(centuryHint(-450)).toBe('the 500s BCE');
    expect(centuryHint(-1)).toBe('the 100s BCE');
  });
});
