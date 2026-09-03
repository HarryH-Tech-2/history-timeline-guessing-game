import { z } from 'zod';

import { createStore } from '@/storage';

/**
 * Moments after which a guest may be nudged to sign in. Only the first is
 * wired today; the record is keyed by milestone so more can be added without
 * a migration.
 */
export type SignInNudgeMilestone = 'campaign-first-stage' | 'level-up' | 'museum-first-artefact';

const SignInNudgeSchema = z.object({
  /** Milestone → epoch ms when its nudge was shown. */
  shown: z.record(z.string(), z.number()),
});
export type SignInNudgeState = z.infer<typeof SignInNudgeSchema>;

/** Rest between nudges of any kind, so a guest is never pestered. */
export const SIGN_IN_NUDGE_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

/** Device-local: which account is signed in is exactly what the nudge is about. */
export const signInNudgeStore = createStore<SignInNudgeState>({
  key: 'chronos.signInNudge',
  schema: SignInNudgeSchema,
  fallback: { shown: {} },
});

/**
 * Once per milestone, and never within three days of any other nudge.
 */
export function shouldShowSignInNudge(
  state: SignInNudgeState,
  milestone: SignInNudgeMilestone,
  now: number,
): boolean {
  if (milestone in state.shown) return false;
  const latest = Math.max(0, ...Object.values(state.shown));
  return now - latest >= SIGN_IN_NUDGE_COOLDOWN_MS;
}

export function markSignInNudgeShown(
  state: SignInNudgeState,
  milestone: SignInNudgeMilestone,
  now: number,
): SignInNudgeState {
  return { shown: { ...state.shown, [milestone]: now } };
}
