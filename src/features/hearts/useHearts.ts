import { useEffect, useMemo, useState } from 'react';

import {
  formatHeartCountdown,
  HEART_REFILL_COST,
  heartsAvailable,
  MAX_HEARTS,
  msUntilNextHeart,
} from '@/domain';
import { usePremium } from '@/features/premium';
import { useProgression } from '@/features/progression';

export interface HeartsView {
  /** Hearts available right now (MAX when unlimited). */
  count: number;
  max: number;
  /** Premium: hearts never run out. */
  unlimited: boolean;
  /** True when the player cannot start or continue a run. */
  empty: boolean;
  /** "12m" until the next heart, or null when full/unlimited. */
  nextIn: string | null;
  refillCost: number;
  canRefill: boolean;
  refill: () => boolean;
}

/** Re-evaluate the regen clock this often while a screen is showing hearts. */
const TICK_MS = 30_000;

/**
 * The live hearts meter for UI: folds regeneration in on a slow tick, and
 * reports unlimited hearts for Premium players. Consuming a heart goes
 * through `useRoundRewards`, not here.
 */
export function useHearts(): HeartsView {
  const { state, refillHearts } = useProgression();
  const { isPremium } = usePremium();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Any change to the stored meter should show immediately, not on the next tick.
  useEffect(() => {
    setNow(Date.now());
  }, [state.hearts]);

  return useMemo(() => {
    const count = isPremium ? MAX_HEARTS : heartsAvailable(state.hearts, now);
    const wait = isPremium ? 0 : msUntilNextHeart(state.hearts, now);
    return {
      count,
      max: MAX_HEARTS,
      unlimited: isPremium,
      empty: !isPremium && count <= 0,
      nextIn: wait > 0 ? formatHeartCountdown(wait) : null,
      refillCost: HEART_REFILL_COST,
      canRefill: !isPremium && count < MAX_HEARTS && state.coins >= HEART_REFILL_COST,
      refill: refillHearts,
    };
  }, [isPremium, now, refillHearts, state.coins, state.hearts]);
}
