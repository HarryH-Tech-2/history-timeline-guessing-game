import { QUESTIONS } from '../questions';

import { deepDiveFor } from './index';

const words = (text: string) => text.trim().split(/\s+/).length;

describe('deep dives', () => {
  it('covers every bundled question', () => {
    const missing = QUESTIONS.filter((q) => !deepDiveFor(q.id)).map((q) => q.id);
    expect(missing).toEqual([]);
  });

  it('keeps each section a short single paragraph', () => {
    for (const q of QUESTIONS) {
      const dive = deepDiveFor(q.id);
      if (!dive) continue;
      for (const text of [dive.why, dive.impact]) {
        expect(text).not.toMatch(/\n/);
        expect(words(text)).toBeGreaterThanOrEqual(25);
        expect(words(text)).toBeLessThanOrEqual(65);
      }
    }
  });
});
