import { useCallback, useEffect, useState } from 'react';

import { scheduleWinbackReminder } from '@/features/reminders/scheduler';
import { track } from '@/services/analytics';

import { usePremium } from './PremiumProvider';
import {
  afterDismissal,
  afterShown,
  percentOff,
  WINBACK_DELAY_DAYS,
  winbackPhase,
  winbackStore,
  type WinbackState,
} from './winback';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A win-back offer that is live right now. */
export interface LiveWinbackOffer {
  /** Discounted first-year price, e.g. "£11.99". */
  price: string;
  /** The yearly plan's normal price label, e.g. "£19.99 / year". */
  fullPrice: string;
  percentOff: number;
  /** Epoch ms the offer ends (a week after it was first shown). */
  endsAt: number;
}

/**
 * The win-back offer if it's on right now: Play offers this player the
 * discount, they aren't Premium, and the timing (winback.ts) says it's open.
 * `markShown` starts the offer's week the first time it comes on screen.
 */
export function useWinbackOffer(): {
  offer: LiveWinbackOffer | null;
  /** When the offer was checked (epoch ms), for "ends in N days". */
  now: number;
  markShown: () => void;
} {
  const { isPremium, isLoading, winback, priceLabels, priceAmounts } = usePremium();
  const [state, setState] = useState<WinbackState | null>(null);
  // Read once per mount: the offer is checked as the screen opens.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    void winbackStore.read().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const percent = winback && priceAmounts.yearly ? percentOff(priceAmounts.yearly.amount, winback.amount) : 0;
  const phase = state ? winbackPhase(state, now) : null;
  const offer =
    !isPremium && !isLoading && winback && percent > 0 && phase?.kind === 'open'
      ? { price: winback.price, fullPrice: priceLabels.yearly, percentOff: percent, endsAt: phase.endsAt }
      : null;

  const markShown = useCallback(() => {
    if (!state || state.openedAt !== undefined) return;
    const next = afterShown(state, now);
    setState(next);
    void winbackStore.write(next);
    track('winback_offered', { percent_off: percent });
  }, [state, percent, now]);

  return { offer, now, markShown };
}

/**
 * The paywall closed without a purchase. The first time, this starts the
 * win-back clock and, when Play has a discount for this player and
 * notifications are already on, schedules a reminder for when it opens.
 */
export async function recordPaywallDismissal(percent: number, now: number = Date.now()): Promise<void> {
  try {
    const before = await winbackStore.read();
    const next = afterDismissal(before, now);
    if (next === before) return;
    await winbackStore.write(next);
    if (percent > 0) {
      await scheduleWinbackReminder({ at: new Date(now + WINBACK_DELAY_DAYS * DAY_MS), percentOff: percent });
    }
  } catch {
    // Best effort: the offer timing must never break closing the paywall.
  }
}
