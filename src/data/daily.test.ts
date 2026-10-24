import { DAILY_WHOLE_CATALOGUE_FROM, getDailyQuestions, isInRotation } from './index';

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

/** `count` consecutive date keys starting at `from`. */
function days(from: string, count: number): string[] {
  const start = Date.parse(`${from}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(start + i * 86_400_000).toISOString().slice(0, 10),
  );
}

describe('getDailyQuestions from the whole catalogue', () => {
  const dailies = days(DAILY_WHOLE_CATALOGUE_FROM, 120).map((key) => getDailyQuestions(key));

  it('only deals easy and medium questions', () => {
    const tooHard = dailies.flat().filter((q) => q.difficulty !== 'easy' && q.difficulty !== 'medium');
    expect(tooHard.map((q) => q.id)).toEqual([]);
  });

  it('draws on questions outside the rotation too', () => {
    expect(dailies.flat().some((q) => !isInRotation(q))).toBe(true);
  });

  it('still deals eight distinct questions a day', () => {
    for (const daily of dailies) expect(new Set(daily.map((q) => q.id)).size).toBe(8);
  });

  it('leaves the day before the switch on the rotation pool', () => {
    const [before] = days('2026-10-26', 1);
    expect(before! < DAILY_WHOLE_CATALOGUE_FROM).toBe(true);
    expect(getDailyQuestions(before!).every(isInRotation)).toBe(true);
  });
});
