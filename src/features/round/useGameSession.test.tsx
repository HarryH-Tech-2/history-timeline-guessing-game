import { act, renderHook } from '@testing-library/react-native';

import type { Question, RoundResult } from '@/domain';

import { useGameSession } from './useGameSession';

const q1 = { id: 'a', year: 1000 } as Question;
const q2 = { id: 'b', year: 2000 } as Question;

describe('useGameSession', () => {
  it('walks a fixed queue and finishes when it runs out', () => {
    const queue = [q1, q2];
    const { result } = renderHook(() =>
      useGameSession({
        first: () => queue[0]!,
        next: (results) => queue[results.length] ?? null,
      }),
    );

    expect(result.current.question.id).toBe('a');
    expect(result.current.roundNumber).toBe(1);
    expect(result.current.status).toBe('active');

    act(() => {
      result.current.submit(1000); // perfect
    });
    expect(result.current.phase).toBe('revealed');
    expect(result.current.result?.isPerfect).toBe(true);
    expect(result.current.totalScore).toBe(1000);

    act(() => {
      result.current.advance();
    });
    expect(result.current.question.id).toBe('b');
    expect(result.current.roundNumber).toBe(2);
    expect(result.current.phase).toBe('guessing');

    act(() => {
      result.current.submit(1990); // 10 years off
    });
    act(() => {
      result.current.advance();
    });
    expect(result.current.status).toBe('finished');
    expect(result.current.results).toHaveLength(2);
    expect(result.current.totalScore).toBe(1650);
  });

  it('ignores a second submit while the round is already revealed', () => {
    const queue = [q1, q2];
    const { result } = renderHook(() =>
      useGameSession({
        first: () => queue[0]!,
        next: (results) => queue[results.length] ?? null,
      }),
    );

    act(() => {
      result.current.submit(1000);
    });
    act(() => {
      result.current.submit(1500); // double-tap on Submit
    });
    // Scored once, and the queue does not skip a question on advance.
    expect(result.current.results).toHaveLength(1);
    expect(result.current.totalScore).toBe(1000);
    act(() => {
      result.current.advance();
    });
    expect(result.current.question.id).toBe('b');
  });

  it('honours an early shouldEnd predicate', () => {
    const { result } = renderHook(() =>
      useGameSession({
        first: () => q1,
        next: () => q2,
        shouldEnd: (results: readonly RoundResult[]) => results.length >= 1,
      }),
    );

    act(() => {
      result.current.submit(1000);
    });
    act(() => {
      result.current.advance();
    });

    expect(result.current.status).toBe('finished');
  });
});
