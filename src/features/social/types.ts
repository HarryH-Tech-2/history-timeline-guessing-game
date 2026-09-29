import { z } from 'zod';

export const CHALLENGE_SIZE = 8;

export const ChallengeSchema = z.object({
  code: z.string(),
  creatorUid: z.string(),
  creatorName: z.string(),
  questionIds: z.array(z.string()),
  createdAt: z.number(),
  expiresAt: z.number(),
});
export type Challenge = z.infer<typeof ChallengeSchema>;

export const ChallengeEntrySchema = z.object({
  uid: z.string(),
  name: z.string(),
  guessYears: z.array(z.number()).length(CHALLENGE_SIZE),
  roundScores: z.array(z.number()).length(CHALLENGE_SIZE),
  total: z.number(),
  finishedAt: z.number(),
});
export type ChallengeEntry = z.infer<typeof ChallengeEntrySchema>;

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerUid: z.string(),
  inviteCode: z.string(),
  memberUids: z.array(z.string()),
  createdAt: z.number(),
});
export type Group = z.infer<typeof GroupSchema>;

export const SocialStateSchema = z.object({
  groupIds: z.array(z.string()).default([]),
  challengeCodes: z.array(z.string()).default([]),
  seen: z.record(z.string(), z.number()).default({}),
});
export type SocialState = z.infer<typeof SocialStateSchema>;
