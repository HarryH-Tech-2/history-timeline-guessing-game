import { useEffect, useRef, useState } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';

import { useProgression } from '@/features/progression';

import { hasLocalProgressionSave } from './localSaves';
import { decideOnboarding } from './onboardingRules';
import { onboardingStore } from './onboardingStore';

/**
 * Longest a device with saves waits for its profile before giving up and
 * going to the hub. Only reachable when a persisted session cannot be read
 * back; a first launch never waits at all (see decideOnboarding).
 */
export const PROFILE_WAIT_MS = 3000;

interface DeviceFacts {
  completedAt: number | null;
  hasLocalSaves: boolean;
}

/**
 * Decide once per launch whether to route a first-time player into the
 * onboarding flow. Everything the decision needs is read from the device up
 * front, so a fresh install goes to onboarding the moment navigation is
 * ready; only a device that has played before waits for its profile, and
 * even then briefly. Existing players get the device flag written quietly so
 * every later launch is instant.
 *
 * Returns `decided`: false until the routing call has been made. The root
 * layout keeps a veil over the navigator until then, so the hub never
 * flashes before onboarding takes over.
 */
export function useOnboardingGate(): { decided: boolean } {
  const router = useRouter();
  const navigation = useRootNavigationState();
  const { state, isLoading } = useProgression();
  const [facts, setFacts] = useState<DeviceFacts | undefined>(undefined);
  const [waitedOut, setWaitedOut] = useState(false);
  const [decided, setDecided] = useState(false);
  const decidedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void Promise.all([onboardingStore.read(), hasLocalProgressionSave()]).then(
      ([saved, hasLocalSaves]) => {
        if (active) setFacts({ completedAt: saved.completedAt, hasLocalSaves });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setWaitedOut(true), PROFILE_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  const gamesPlayed = state.stats.gamesPlayed;
  const navReady = navigation?.key !== undefined;
  useEffect(() => {
    if (decidedRef.current || facts === undefined || !navReady) return;
    let decision = decideOnboarding({
      ...facts,
      gamesPlayed: isLoading ? 'loading' : gamesPlayed,
    });
    // A profile that cannot be read in time belongs to a device that has
    // played before: the hub is the right place, onboarding would be wrong.
    if (decision === 'wait' && waitedOut) decision = 'skip';
    if (decision === 'wait') return;

    decidedRef.current = true;
    if (decision === 'show') {
      router.replace('/onboarding');
    } else if (facts.completedAt === null) {
      void onboardingStore.write({ completedAt: Date.now() });
    }
    setDecided(true);
  }, [facts, isLoading, navReady, gamesPlayed, waitedOut, router]);

  return { decided };
}
