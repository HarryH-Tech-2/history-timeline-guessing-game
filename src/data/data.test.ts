import { getCategories, getQuestions, getQuestionsByCategory, getRandomQuestion } from './index';

describe('seed data', () => {
  it('loads and validates the eight launch categories', () => {
    expect(getCategories().map((c) => c.id).sort()).toEqual([
      'arts',
      'battles',
      'continents',
      'events',
      'exploration',
      'people',
      'philosophy',
      'technology',
    ]);
  });

  it('provides at least ten questions per category', () => {
    for (const category of getCategories()) {
      expect(getQuestionsByCategory(category.id).length).toBeGreaterThanOrEqual(10);
    }
  });

  it('has unique question ids', () => {
    const ids = getQuestions().map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns a question not already seen when possible', () => {
    const first = getRandomQuestion();
    const next = getRandomQuestion(new Set([first.id]));
    expect(next.id).not.toBe(first.id);
  });
});
