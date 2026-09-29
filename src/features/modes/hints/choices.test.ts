import { getQuestions } from '@/data';
import type { Question } from '@/domain';
import { MAX_YEAR, MIN_YEAR } from '@/features/timeline/math/constants';

import { choiceGap, multipleChoiceYears } from './choices';

const q = (id: string, year: number) => ({ id, year }) as Question;

const SAMPLE = [
  q('moon', 1969),
  q('magna', 1215),
  q('rome', -509),
  q('troy', -990),
  q('recent', MAX_YEAR - 1),
  q('now', MAX_YEAR),
  q('ad1', 1),
  // No question sits on year zero (it does not exist), so the bulk sample skips it.
  ...Array.from({ length: 60 }, (_, i) => q(`bulk-${i}`, -1000 + i * 50)).filter((s) => s.year !== 0),
];

describe('multipleChoiceYears', () => {
  it.each(SAMPLE)('offers four distinct sorted years including the answer ($id)', (question) => {
    const years = multipleChoiceYears(question);
    expect(years).toHaveLength(4);
    expect(new Set(years).size).toBe(4);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    expect(years).toContain(question.year);
  });

  it.each(SAMPLE)('keeps every option on the timeline and off year zero ($id)', (question) => {
    for (const year of multipleChoiceYears(question)) {
      expect(year).toBeGreaterThanOrEqual(MIN_YEAR);
      expect(year).toBeLessThanOrEqual(MAX_YEAR);
      expect(year).not.toBe(0);
    }
  });

  it('is stable for the same question', () => {
    expect(multipleChoiceYears(q('moon', 1969))).toEqual(multipleChoiceYears(q('moon', 1969)));
  });

  it('does not always put the answer in the same slot', () => {
    const slots = new Set(
      SAMPLE.filter((s) => s.year > 0 && s.year < 1900).map((s) =>
        multipleChoiceYears(s).indexOf(s.year),
      ),
    );
    expect(slots.size).toBeGreaterThan(1);
  });

  it('spaces decoys by era: tighter for modern events than ancient ones', () => {
    expect(choiceGap(1969)).toEqual({ min: 8, max: 40 });
    expect(choiceGap(1215)).toEqual({ min: 25, max: 120 });
    expect(choiceGap(-509)).toEqual({ min: 70, max: 400 });
  });

  it('keeps neighbouring options at least the era minimum apart', () => {
    for (const question of SAMPLE) {
      const years = multipleChoiceYears(question);
      const { min } = choiceGap(question.year);
      for (let i = 1; i < years.length; i += 1) {
        // Skipping year zero can stretch a gap by one, never shrink it below min - 1.
        expect(years[i]! - years[i - 1]!).toBeGreaterThanOrEqual(min - 1);
      }
    }
  });

  it('works for every question in the catalogue', () => {
    for (const question of getQuestions()) {
      const years = multipleChoiceYears(question);
      expect(new Set(years).size).toBe(4);
      expect(years).toContain(question.year);
      expect(Math.min(...years)).toBeGreaterThanOrEqual(MIN_YEAR);
      expect(Math.max(...years)).toBeLessThanOrEqual(MAX_YEAR);
    }
  });
});
