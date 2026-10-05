import { useCallback, useState, useSyncExternalStore } from 'react';
import { z } from 'zod';

import { createStore } from '@/storage';

/**
 * Free tasters of Premium content: a free player gets one short run of
 * Endless, and one of each premium category, before the lock comes down. The
 * taster ends on the player's own score, which is where the paywall is offered.
 */

/** Rounds in the free Endless taster. */
export const ENDLESS_SAMPLE_ROUNDS = 5;
/** Questions in a premium category's free taster. */
export const CATEGORY_SAMPLE_ROUNDS = 3;

/** What can be tasted: Endless, or one premium category. */
export type SampleTarget = 'endless' | `category:${string}`;

export function categorySample(categoryId: string): SampleTarget {
  return `category:${categoryId}`;
}

const SampleStateSchema = z.object({
  /** Targets whose taster has been played. */
  used: z.array(z.string()),
});
export type SampleState = z.infer<typeof SampleStateSchema>;

/** Device-local on purpose: a taster is per install, like the win-back clock. */
export const sampleStore = createStore<SampleState>({
  key: 'chronos.premium.samples',
  schema: SampleStateSchema,
  fallback: { used: [] },
});

/** The state with `target`'s taster spent. */
export function afterSample(state: SampleState, target: SampleTarget): SampleState {
  return state.used.includes(target) ? state : { used: [...state.used, target] };
}

// One in-memory copy shared by every screen, so the home cards relock the
// moment a taster is spent on another screen.
let cache: SampleState | null = null;
let loading = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (cache === null && !loading) {
    loading = true;
    void sampleStore.read().then((state) => {
      cache = state;
      loading = false;
      emit();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Spend `target`'s taster. Safe to call more than once. */
export function consumeSample(target: SampleTarget): void {
  const next = afterSample(cache ?? { used: [] }, target);
  if (next === cache) return;
  cache = next;
  emit();
  void sampleStore.write(next);
}

/** Tests only: forget the in-memory copy so the next hook re-reads the store. */
export function resetSamplesForTests(): void {
  cache = null;
  loading = false;
}

/** Which tasters are still unplayed. `ready` is false until the store is read. */
export function useSamples(): { ready: boolean; canSample: (target: SampleTarget) => boolean } {
  const state = useSyncExternalStore(subscribe, () => cache);
  const canSample = useCallback(
    (target: SampleTarget) => state !== null && !state.used.includes(target),
    [state],
  );
  return { ready: state !== null, canSample };
}

/**
 * Whether this screen is playing `target`'s taster: null while the store
 * loads, then fixed for the life of the screen, so spending the taster
 * mid-run doesn't lock the run the player is in.
 */
export function useSampleRun(target: SampleTarget): boolean | null {
  const { ready, canSample } = useSamples();
  const [run, setRun] = useState<boolean | null>(null);
  if (run === null && ready) setRun(canSample(target));
  return run;
}
