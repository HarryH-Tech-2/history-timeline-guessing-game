import { getDailyQuestions } from './index';

describe('getDailyQuestions', () => {
  it('is deterministic for a given date', () => {
    const a = getDailyQuestions('2026-07-27').map((q) => q.id);
    const b = getDailyQuestions('2026-07-27').map((q) => q.id);
    expect(a).toEqual(b);
  });

  it('differs across dates', () => {
    const a = getDailyQuestions('2026-07-27').map((q) => q.id);
    const b = getDailyQuestions('2026-07-28').map((q) => q.id);
    expect(a).not.toEqual(b);
  });

  it('returns the requested number of distinct questions', () => {
    const ids = getDailyQuestions('2026-07-27').map((q) => q.id);
    expect(ids).toHaveLength(8);
    expect(new Set(ids).size).toBe(8);
  });
});
