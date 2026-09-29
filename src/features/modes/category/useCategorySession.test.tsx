import { act, renderHook } from '@testing-library/react-native';

import {
  getQuestionsByCategory,
  getRegionalQuestions,
  REGION_RUN_LENGTH,
  REGIONAL_CATEGORY_ID,
} from '@/data';

import { useCategorySession } from './useCategorySession';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

/** Plays the whole run, submitting the right year each time; returns asked ids. */
function playThrough(result: { current: ReturnType<typeof useCategorySession> }, count: number) {
  const asked: string[] = [];
  for (let i = 0; i < count; i += 1) {
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
  return asked;
}

describe('useCategorySession', () => {
  const categoryId = 'events';
  const pool = getQuestionsByCategory(categoryId);

  it('asks every question in the category exactly once, then finishes', () => {
    const { result } = renderHook(() => useCategorySession(categoryId));
    expect(result.current.totalQuestions).toBe(pool.length);

    const asked = playThrough(result, pool.length);

    expect(result.current.session.status).toBe('finished');
    expect(new Set(asked).size).toBe(pool.length);
    expect(new Set(asked)).toEqual(new Set(pool.map((q) => q.id)));
  });

  it('deals a Regional run of at most ten distinct questions from the chosen region', () => {
    expect(REGION_RUN_LENGTH).toBe(10);
    const regionPool = getRegionalQuestions('oceania');
    const wholeCategory = getQuestionsByCategory(REGIONAL_CATEGORY_ID);
    expect(regionPool.length).toBeGreaterThan(0);
    expect(regionPool.length).toBeLessThan(wholeCategory.length);
    const runLength = Math.min(REGION_RUN_LENGTH, regionPool.length);

    const { result } = renderHook(() => useCategorySession(REGIONAL_CATEGORY_ID, 'oceania'));
    expect(result.current.totalQuestions).toBe(runLength);

    const asked = playThrough(result, runLength);

    expect(result.current.session.status).toBe('finished');
    expect(new Set(asked).size).toBe(runLength);
    const regionIds = new Set(regionPool.map((q) => q.id));
    expect(asked.every((id) => regionIds.has(id))).toBe(true);
  });
});
