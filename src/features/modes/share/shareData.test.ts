import type { RoundResult } from '@/domain';

import {
  buildShareMessage,
  prettyDate,
  shareDataFromResults,
  STORE_URL,
  tileForError,
  type ShareCardData,
} from './shareData';

describe('tileForError', () => {
  it('grades a round by how far the guess was', () => {
    expect(tileForError(0)).toBe('🎯');
    expect(tileForError(1)).toBe('🟩');
    expect(tileForError(5)).toBe('🟩');
    expect(tileForError(6)).toBe('🟨');
    expect(tileForError(20)).toBe('🟨');
    expect(tileForError(21)).toBe('🟧');
    expect(tileForError(50)).toBe('🟧');
    expect(tileForError(51)).toBe('🟥');
    expect(tileForError(99)).toBe('🟥');
    expect(tileForError(100)).toBe('⬛');
    expect(tileForError(-3)).toBe('🟩');
  });
});

describe('prettyDate', () => {
  it('formats a date key for people', () => {
    expect(prettyDate('2026-09-03')).toBe('3 Sep 2026');
    expect(prettyDate('2027-12-25')).toBe('25 Dec 2027');
  });
});

describe('shareDataFromResults', () => {
  it('flattens live round results into card rows and totals the score', () => {
    const results: RoundResult[] = [
      {
        question: { id: 'a', year: 1066 } as RoundResult['question'],
        guessYear: 1070,
        errorYears: 4,
        score: { base: 900, comboMultiplier: 1, streakBonus: 0, total: 900 },
        isPerfect: false,
      },
      {
        question: { id: 'b', year: 1492 } as RoundResult['question'],
        guessYear: 1492,
        errorYears: 0,
        score: { base: 1000, comboMultiplier: 1.2, streakBonus: 0, total: 1200 },
        isPerfect: true,
      },
    ];
    expect(shareDataFromResults('Survival · 2 rounds', 'Today', results)).toEqual({
      heading: 'Survival · 2 rounds',
      subheading: 'Today',
      totalScore: 2100,
      rounds: [
        { questionId: 'a', errorYears: 4, score: 900, guessYear: 1070 },
        { questionId: 'b', errorYears: 0, score: 1200, guessYear: 1492 },
      ],
    });
  });
});

describe('buildShareMessage', () => {
  const data: ShareCardData = {
    heading: 'Daily #3',
    subheading: '3 Sep 2026',
    totalScore: 4321,
    rounds: [
      { questionId: 'a', errorYears: 0, score: 1000, guessYear: 1066 },
      { questionId: 'b', errorYears: 3, score: 860, guessYear: 1492 },
      { questionId: 'c', errorYears: 12, score: 610, guessYear: 1776 },
      { questionId: 'd', errorYears: 0, score: 1000, guessYear: 1815 },
      { questionId: 'e', errorYears: 130, score: 0, guessYear: 1900 },
    ],
  };

  it('lays out the card Wordle-style with no answers leaked', () => {
    const message = buildShareMessage(data);
    expect(message.split('\n')).toEqual([
      '📜 Date Guesser · Daily #3',
      '🎯🟩🟨🎯⬛',
      '4,321 pts · 2/5 exact · avg 29 yrs off',
      STORE_URL,
    ]);
    expect(message).not.toContain('1066');
  });

  it('uses the singular for a one-year average', () => {
    const message = buildShareMessage({
      ...data,
      rounds: [{ questionId: 'a', errorYears: 1, score: 950, guessYear: 1 }],
    });
    expect(message).toContain('avg 1 yr off');
  });
});
