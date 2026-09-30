import { z } from 'zod';

import { createStore } from '@/storage';

/**
 * The win-back offer: a player who closes the paywall without buying is
 * offered the yearly plan's discounted first year a few days later, for a
 * week. The discount itself lives in Play Console (an offer tagged
 * `winback`); this only decides when the app shows it. Honest by rule: the
 * countdown is real — once the window ends the offer is gone for good.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days after the first paywall dismissal before the offer opens. */
export const WINBACK_DELAY_DAYS = 3;
/** How long the offer stays open once it has been shown. */
export const WINBACK_WINDOW_DAYS = 7;

export const WinbackStateSchema = z.object({
  /** Epoch ms of the first paywall close without a purchase. */
  dismissedAt: z.number().optional(),
  /** Epoch ms the offer was first shown: its week starts then. */
  openedAt: z.number().optional(),
  /** Bought (with or without the discount): never offer again. */
  done: z.boolean().optional(),
});
export type WinbackState = z.infer<typeof WinbackStateSchema>;

export const winbackStore = createStore<WinbackState>({
  key: 'chronos.winback',
  schema: WinbackStateSchema,
  fallback: {},
});

export type WinbackPhase =
  /** Nothing to offer: never dismissed, or already bought. */
  | { kind: 'none' }
  /** Dismissed; the offer opens at `opensAt`. */
  | { kind: 'waiting'; opensAt: number }
  /** On offer until `endsAt`. */
  | { kind: 'open'; endsAt: number }
  /** The week ran out. */
  | { kind: 'expired' };

/** Where the offer stands at `now`. */
export function winbackPhase(state: WinbackState, now: number): WinbackPhase {
  if (state.done) return { kind: 'none' };
  if (state.openedAt !== undefined) {
    const endsAt = state.openedAt + WINBACK_WINDOW_DAYS * DAY_MS;
    return now < endsAt ? { kind: 'open', endsAt } : { kind: 'expired' };
  }
  if (state.dismissedAt === undefined) return { kind: 'none' };
  const opensAt = state.dismissedAt + WINBACK_DELAY_DAYS * DAY_MS;
  return now >= opensAt ? { kind: 'open', endsAt: now + WINBACK_WINDOW_DAYS * DAY_MS } : { kind: 'waiting', opensAt };
}

/** A paywall closed without a purchase: only the first one starts the clock. */
export function afterDismissal(state: WinbackState, now: number): WinbackState {
  return state.dismissedAt === undefined && !state.done ? { ...state, dismissedAt: now } : state;
}

/** The offer came on screen: start its week if it hasn't started. */
export function afterShown(state: WinbackState, now: number): WinbackState {
  return state.openedAt === undefined ? { ...state, openedAt: now } : state;
}

/** Premium was bought: the offer is finished. */
export function afterPurchase(state: WinbackState): WinbackState {
  return state.done ? state : { ...state, done: true };
}

/** Whole days left, rounded up ("ends in 3 days"), never below 1 while open. */
export function daysLeft(endsAt: number, now: number): number {
  return Math.max(1, Math.ceil((endsAt - now) / DAY_MS));
}

/** Whole-percent discount, rounded down so the claim is never overstated. */
export function percentOff(full: number, discounted: number): number {
  if (!(full > 0) || !(discounted >= 0) || discounted >= full) return 0;
  return Math.floor((1 - discounted / full) * 100);
}
