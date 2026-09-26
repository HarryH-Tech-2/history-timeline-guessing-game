import { useEffect, useRef, useState } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';

import { useProgression } from '@/features/progression';

import { shouldShowOnboarding } from './onboardingRules';
import { onboardingStore } from './onboardingStore';

/**
 * Decide once per launch whether to route a first-time player into the
 * onboarding flow. Waits for the device flag and the profile to load so an
 * existing player is never shown it; existing players get the flag written
 * quietly so the check is instant from then on.
 */
export function useOnboardingGate(): void {
  const router = useRouter();
  const navigation = useRootNavigationState();
  const { state, isLoading } = useProgression();
  const [completedAt, setCompletedAt] = useState<number | null | undefined>(undefined);
  const decided = useRef(false);

  useEffect(() => {
    let active = true;
    void onboardingStore.read().then((v) => {
      if (active) setCompletedAt(v.completedAt);
    });
    return () => {
      active = false;
    };
  }, []);

  const gamesPlayed = state.stats.gamesPlayed;
  const navReady = navigation?.key !== undefined;
  useEffect(() => {
    if (decided.current || completedAt === undefined || isLoading || !navReady) return;
    decided.current = true;
    if (shouldShowOnboarding({ completedAt, gamesPlayed })) {
      router.replace('/onboarding');
    } else if (completedAt === null) {
      void onboardingStore.write({ completedAt: Date.now() });
    }
  }, [completedAt, isLoading, navReady, gamesPlayed, router]);
}
