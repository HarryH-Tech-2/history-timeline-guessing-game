import { getCategories, getQuestions, getQuestionsByCategory, getRandomQuestion } from './index';

describe('seed data', () => {
  it('loads and validates the twelve categories', () => {
    expect(getCategories().map((c) => c.id).sort()).toEqual([
      'arts',
      'battles',
      'events',
      'exploration',
      'people',
      'philosophy',
      'regional',
      'space',
      'sport',
      'technology',
      'trade',
      'treaties',
    ]);
  });

  it('no longer ships a Continents category', () => {
    expect(getCategories().some((c) => c.id === 'continents')).toBe(false);
    expect(getQuestions().some((q) => q.categoryId === 'continents')).toBe(false);
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
