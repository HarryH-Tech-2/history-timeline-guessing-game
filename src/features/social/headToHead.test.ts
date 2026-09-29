import { compareEntries, missingQuestions, statusLine } from './headToHead';
import type { Challenge, ChallengeEntry } from './types';

const challenge: Challenge = {
  code: 'ABC234', creatorUid: 'sam', creatorName: 'Sam',
  questionIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'], createdAt: 1, expiresAt: 2,
};
const entry = (uid: string, scores: number[]): ChallengeEntry => ({
  uid, name: uid, guessYears: scores.map(() => 1900), roundScores: scores,
  total: scores.reduce((a, b) => a + b, 0), finishedAt: 1,
});
const eight = (n: number) => Array.from({ length: 8 }, () => n);

describe('compareEntries', () => {
  it('waits while the creator has not played', () => {
    expect(compareEntries(challenge, [entry('me', eight(500))], 'me').kind).toBe('waiting');
  });

  it('compares a challenger with the creator round by round', () => {
    const r = compareEntries(challenge, [entry('sam', eight(600)), entry('me', eight(500))], 'me');
    expect(r.kind).toBe('versus');
    if (r.kind !== 'versus') return;
    expect(r.outcome).toBe('lost');
    expect(r.rounds).toHaveLength(8);
    expect(r.rounds[0]!.closer).toBe('them');
  });

  it('calls equal totals a tie', () => {
    const r = compareEntries(challenge, [entry('sam', eight(500)), entry('me', eight(500))], 'me');
    expect(r.kind === 'versus' && r.outcome).toBe('tie');
    expect(statusLine(r, 'Sam')).toBe('It’s a tie');
  });

  it('shows the creator everyone who played, never themselves as an opponent', () => {
    const r = compareEntries(
      challenge,
      [entry('sam', eight(600)), entry('a', eight(500)), entry('b', eight(700))],
      'sam',
    );
    expect(r.kind).toBe('creator');
    if (r.kind !== 'creator') return;
    expect(r.challengers.map((c) => c.uid)).toEqual(['b', 'a']);
    expect(statusLine(r, 'Sam')).toBe('2 friends played');
  });
});

describe('missingQuestions', () => {
  it('lists ids this build does not have', () => {
    expect(missingQuestions(challenge, (id) => id !== 'q3')).toEqual(['q3']);
  });
});
