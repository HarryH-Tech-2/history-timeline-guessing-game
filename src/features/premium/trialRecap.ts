import { z } from 'zod';

import { createStore } from '@/storage';

import { trialReminderDay } from './paywallPricing';

/**
 * What a player did with their free trial: counted from the moment it starts
 * and shown back to them shortly before the first charge, on the home screen
 * and in the trial reminder. Honest by rule: only what was actually played.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const TrialRecapSchema = z.object({
  /** Epoch ms the free trial started; absent when none has started on this device. */
  startedAt: z.number().optional(),
  /** Length of that trial in days. */
  trialDays: z.number().optional(),
  /** Rounds played since it started. */
  rounds: z.number(),
  /** Misses that would have cost a heart without Premium. */
  heartsSaved: z.number(),
});
export type TrialRecapState = z.infer<typeof TrialRecapSchema>;

const EMPTY: TrialRecapState = { rounds: 0, heartsSaved: 0 };

/** Device-local: the trial is bought on this phone and the recap shows here. */
export const trialRecapStore = createStore<TrialRecapState>({
  key: 'chronos.trial.recap',
  schema: TrialRecapSchema,
  fallback: EMPTY,
});

export type TrialPhase =
  /** No trial on record, or it has ended. */
  | { kind: 'none' }
  /** Running; the recap comes on at `recapAt`. */
  | { kind: 'running'; recapAt: number; daysLeftAtRecap: number }
  /** In the run-up to the first charge: show the recap. */
  | { kind: 'ending'; daysLeft: number };

/** Where the trial stands at `now`. */
export function trialPhase(state: TrialRecapState, now: number): TrialPhase {
  const { startedAt, trialDays } = state;
  if (startedAt === undefined || !trialDays) return { kind: 'none' };
  const endsAt = startedAt + trialDays * DAY_MS;
  if (now >= endsAt) return { kind: 'none' };
  const recapDay = trialReminderDay(trialDays);
  const recapAt = startedAt + recapDay * DAY_MS;
  if (now < recapAt) return { kind: 'running', recapAt, daysLeftAtRecap: trialDays - recapDay };
  return { kind: 'ending', daysLeft: Math.max(1, Math.ceil((endsAt - now) / DAY_MS)) };
}

/** A free trial was just bought: start counting from zero. Never rejects. */
export async function startTrialRecap(trialDays: number, now: number = Date.now()): Promise<void> {
  try {
    await trialRecapStore.write({ startedAt: now, trialDays, rounds: 0, heartsSaved: 0 });
  } catch {
    // Best effort: the recap must never break the purchase flow.
  }
}

/**
 * A Premium player finished a round. Counts it while a trial is running;
 * `savedHeart` when the miss would have cost a free player a heart. Never rejects.
 */
export async function recordTrialRound(savedHeart: boolean, now: number = Date.now()): Promise<void> {
  try {
    const state = await trialRecapStore.read();
    if (trialPhase(state, now).kind === 'none') return;
    await trialRecapStore.write({
      ...state,
      rounds: state.rounds + 1,
      heartsSaved: state.heartsSaved + (savedHeart ? 1 : 0),
    });
  } catch {
    // Best effort.
  }
}
