import type { DailyRecord } from '../persistence';
import { buildShareMessage, DAILY_EPOCH, dailyNumber, STORE_URL, tileForError } from './shareCard';

describe('dailyNumber', () => {
  it('starts at #1 on the epoch day and counts up by calendar day', () => {
    expect(dailyNumber(DAILY_EPOCH)).toBe(1);
    expect(dailyNumber('2026-09-02')).toBe(2);
    expect(dailyNumber('2026-10-01')).toBe(31);
    expect(dailyNumber('2027-09-01')).toBe(366);
  });
});

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

describe('buildShareMessage', () => {
  const record: DailyRecord = {
    date: '2026-09-03',
    totalScore: 4321,
    perfectCount: 2,
    rounds: [
      { questionId: 'a', errorYears: 0, score: 1000, guessYear: 1066 },
      { questionId: 'b', errorYears: 3, score: 860, guessYear: 1492 },
      { questionId: 'c', errorYears: 12, score: 610, guessYear: 1776 },
      { questionId: 'd', errorYears: 0, score: 1000, guessYear: 1815 },
      { questionId: 'e', errorYears: 130, score: 0, guessYear: 1900 },
    ],
  };

  it('lays out the card Wordle-style with no answers leaked', () => {
    const message = buildShareMessage(record);
    expect(message.split('\n')).toEqual([
      '📜 Date Guesser Daily #3',
      '🎯🟩🟨🎯⬛',
      '4,321 pts · 2/5 exact · avg 29 yrs off',
      STORE_URL,
    ]);
    expect(message).not.toContain('1066');
  });

  it('uses the singular for a one-year average', () => {
    const message = buildShareMessage({
      ...record,
      rounds: [{ questionId: 'a', errorYears: 1, score: 950, guessYear: 1 }],
    });
    expect(message).toContain('avg 1 yr off');
  });
});
