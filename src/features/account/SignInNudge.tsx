import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui';
import { useAuth } from '@/services/firebase/auth';

import {
  markSignInNudgeShown,
  shouldShowSignInNudge,
  signInNudgeStore,
  type SignInNudgeMilestone,
} from './signInNudgeRules';

export interface SignInNudgeApi {
  visible: boolean;
  /** "Not now": hide, and never nudge for this milestone again. */
  dismiss: () => void;
  /** Go to the sign-in screen (also counts as shown). */
  openSignIn: () => void;
}

/**
 * Decides whether a guest should see the sign-in nudge for `milestone` right
 * now. Only guests qualify (signed in anonymously, no linked account); the
 * store rules add once-per-milestone and a three-day rest between nudges.
 */
export function useSignInNudge(milestone: SignInNudgeMilestone, active: boolean): SignInNudgeApi {
  const router = useRouter();
  const { isSignedIn, hasAccount } = useAuth();
  const eligible = active && isSignedIn && !hasAccount;
  // What the store allows for this milestone; only meaningful while eligible.
  const [allowed, setAllowed] = useState(false);
  const visible = eligible && allowed;

  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;
    void signInNudgeStore.read().then((state) => {
      if (!cancelled) setAllowed(shouldShowSignInNudge(state, milestone, Date.now()));
    });
    return () => {
      cancelled = true;
    };
  }, [eligible, milestone]);

  const markShown = useCallback(() => {
    setAllowed(false);
    void signInNudgeStore
      .read()
      .then((state) => signInNudgeStore.write(markSignInNudgeShown(state, milestone, Date.now())))
      .catch(() => {
        // Losing the record only risks one extra nudge later; never surface it.
      });
  }, [milestone]);

  const openSignIn = useCallback(() => {
    markShown();
    router.push('/sign-in');
  }, [markShown, router]);

  return { visible, dismiss: markShown, openSignIn };
}

/** The card itself: what a guest stands to keep, and two ways out. */
export function SignInNudgeCard({
  onSignIn,
  onDismiss,
}: {
  onSignIn: () => void;
  onDismiss: () => void;
}) {
  return (
    <View className="gap-3 border border-hair bg-bg-overlay p-4" testID="sign-in-nudge">
      <View>
        <Text className="text-base font-semibold text-ink-primary">Keep your progress</Text>
        <Text className="mt-0.5 text-xs text-ink-muted">
          You’re playing as a guest. Sign in with Google and your campaign, museum, XP and
          coins follow you to any device.
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Button label="Sign in" onPress={onSignIn} testID="sign-in-nudge-accept" />
        </View>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          hitSlop={8}
          testID="sign-in-nudge-dismiss"
          className="px-3 py-2"
        >
          <Text className="text-sm font-semibold text-ink-muted">Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Drop-in nudge: renders the card for an eligible guest once `active` turns
 * true (the milestone was just reached), and nothing at all otherwise.
 */
export function SignInNudge({
  milestone,
  active,
}: {
  milestone: SignInNudgeMilestone;
  active: boolean;
}) {
  const { visible, dismiss, openSignIn } = useSignInNudge(milestone, active);
  if (!visible) return null;
  return <SignInNudgeCard onSignIn={openSignIn} onDismiss={dismiss} />;
}
