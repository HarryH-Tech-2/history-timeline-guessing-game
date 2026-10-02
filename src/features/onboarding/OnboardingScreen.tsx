import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Screen } from '@/components/ui';
import { t } from '@/i18n';
import { track } from '@/services/analytics';

import { completeOnboarding } from './onboardingStore';
import { FirstGuessStep } from './steps/FirstGuessStep';
import { SetupStep, type SetupOutcome } from './steps/SetupStep';
import { WelcomeStep } from './steps/WelcomeStep';

const STEP_COUNT = 3;

function Dots({ step }: { step: number }) {
  return (
    <View
      className="flex-row items-center gap-1.5"
      accessibilityLabel={t('onboarding.stepOf', { step: step + 1, total: STEP_COUNT })}
    >
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <Animated.View
          key={i}
          layout={LinearTransition.springify().damping(18)}
          className={`h-2 rounded-full ${
            i === step ? 'w-6 bg-accent' : i < step ? 'w-2 bg-accent/50' : 'w-2 bg-hair'
          }`}
          testID={i === step ? 'onboarding-dot-active' : undefined}
        />
      ))}
    </View>
  );
}

/**
 * First-run flow, shown once per device to a brand-new player: welcome, a
 * real first guess, then name and reminders before jumping straight into the
 * Daily. Every step can be skipped. No paywall at the end: a player who has
 * just arrived meets Premium later, once they have played.
 */
export function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  useEffect(() => {
    track('onboarding_step_viewed', { step: step + 1 });
  }, [step]);

  const leave = useCallback(
    async (destination: 'daily' | 'home') => {
      await completeOnboarding();
      router.replace('/(tabs)');
      if (destination === 'daily') router.push('/daily');
    },
    [router],
  );

  const skip = useCallback(() => {
    track('onboarding_skipped', { step: step + 1 });
    void leave('home');
  }, [leave, step]);

  const finish = useCallback(
    (outcome: SetupOutcome) => {
      track('onboarding_completed', {
        choice: outcome.choice,
        named: outcome.named,
        reminders: outcome.reminders,
      });
      void leave(outcome.choice === 'daily' ? 'daily' : 'home');
    },
    [leave],
  );

  const next = useCallback(() => setStep((s) => Math.min(s + 1, STEP_COUNT - 1)), []);

  return (
    <Screen>
      <View className="flex-1 pt-3" testID="onboarding">
        <View className="mx-5 mb-3 h-10 flex-row items-center justify-between">
          <Dots step={step} />
          {step < STEP_COUNT - 1 ? (
            <Pressable
              onPress={skip}
              accessibilityRole="button"
              hitSlop={10}
              className="px-2 py-1"
              testID="onboarding-skip"
            >
              <Text className="text-sm font-semibold text-ink-muted">{t('onboarding.skip')}</Text>
            </Pressable>
          ) : (
            <View />
          )}
        </View>

        {/* The first-guess step is the real round view, which brings its own
            gutters and footer so it lays out exactly as a game round does. */}
        <Animated.View
          key={step}
          entering={FadeIn.duration(260)}
          exiting={FadeOut.duration(160)}
          className={step === 1 ? 'flex-1' : 'flex-1 px-5 pb-4'}
        >
          {step === 0 && <WelcomeStep onNext={next} />}
          {step === 1 && <FirstGuessStep onNext={next} />}
          {step === 2 && <SetupStep onFinish={finish} />}
        </Animated.View>
      </View>
    </Screen>
  );
}
