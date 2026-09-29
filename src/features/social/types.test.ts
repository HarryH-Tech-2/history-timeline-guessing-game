import { ChallengeEntrySchema, ChallengeSchema, SocialStateSchema } from './types';

describe('social schemas', () => {
  it('parses a challenge doc with its code', () => {
    const parsed = ChallengeSchema.safeParse({
      code: 'ABC234', creatorUid: 'a', creatorName: 'Sam', questionIds: ['x'], createdAt: 1, expiresAt: 2,
    });
    expect(parsed.success).toBe(true);
  });

  it('defaults a missing social state', () => {
    expect(SocialStateSchema.parse({})).toEqual({ groupIds: [], challengeCodes: [], seen: {} });
  });

  it('rejects an entry with the wrong round count', () => {
    expect(
      ChallengeEntrySchema.safeParse({
        uid: 'a', name: 'x', guessYears: [1], roundScores: [1], total: 1, finishedAt: 1,
      }).success,
    ).toBe(false);
  });
});
