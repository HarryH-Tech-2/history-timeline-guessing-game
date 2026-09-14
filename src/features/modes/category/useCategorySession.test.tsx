import { act, renderHook } from '@testing-library/react-native';

import { getQuestionsByCategory } from '@/data';

import { useCategorySession } from './useCategorySession';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

describe('useCategorySession', () => {
  const categoryId = 'events';
  const pool = getQuestionsByCategory(categoryId);

  it('asks every question in the category exactly once, then finishes', () => {
    const { result } = renderHook(() => useCategorySession(categoryId));
    expect(result.current.totalQuestions).toBe(pool.length);

    const asked: string[] = [];
    for (let i = 0; i < pool.length; i += 1) {
      expect(result.current.session.status).toBe('active');
      expect(result.current.session.roundNumber).toBe(i + 1);
      asked.push(result.current.session.question.id);
      act(() => {
        result.current.session.submit(result.current.session.question.year);
      });
      act(() => {
        result.current.session.advance();
      });
    }

    expect(result.current.session.status).toBe('finished');
    expect(new Set(asked).size).toBe(pool.length);
    expect(new Set(asked)).toEqual(new Set(pool.map((q) => q.id)));
  });
});
