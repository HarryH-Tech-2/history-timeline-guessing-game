import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Button, Card } from '@/components/ui';
import { anyTrialDays } from '@/features/premium/paywallCopy';
import { paywallHref } from '@/features/premium/paywallSource';
import { usePremium } from '@/features/premium/PremiumProvider';
import { t } from '@/i18n';
import { track } from '@/services/analytics';

import { useHearts } from './useHearts';

interface OutOfHeartsSheetProps {
  /** Leave the run (back to the previous screen). */
  onLeave: () => void;
}

/**
 * Blocks play when the hearts meter is empty: wait for regeneration, refill
 * with coins, or go Premium for unlimited hearts (leading with the free trial
 * when the store offers this player one). Premium is the one button; refilling
 * and leaving are quiet links beneath it. Rendered by mode screens as
 * an overlay on top of the round so the player keeps their place.
 */
export function OutOfHeartsSheet({ onLeave }: OutOfHeartsSheetProps) {
  const router = useRouter();
  useEffect(() => {
    track('hearts_exhausted');
  }, []);
  const hearts = useHearts();
  const trial = anyTrialDays(usePremium().trialDays);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      className="absolute inset-0 justify-end bg-black/60 px-5 pb-8"
      testID="out-of-hearts"
    >
      <Animated.View entering={FadeInDown.springify().damping(18)}>
        <Card className="gap-4">
          <View className="gap-1">
            <Text className="text-2xl font-extrabold text-ink-primary">{t('home.hearts.outTitle')}</Text>
            <Text className="text-base text-ink-secondary">
              {hearts.nextIn
                ? t('home.hearts.nextIn', { time: hearts.nextIn })
                : t('home.hearts.refillRate')}
            </Text>
          </View>

          <View className="flex-row items-center justify-center gap-1.5 py-1">
            {Array.from({ length: hearts.max }, (_, i) => (
              <Text key={i} className="text-2xl" style={{ opacity: i < hearts.count ? 1 : 0.25 }}>
                ❤️
              </Text>
            ))}
          </View>

          <Button
            {...(trial
              ? {
                  label: t('home.hearts.trialCta', { count: trial }),
                  sublabel: t('home.hearts.trialSub'),
                }
              : { label: t('home.hearts.goPremium') })}
            onPress={() => router.push(paywallHref('hearts'))}
            testID="hearts-premium"
          />
          <View className="flex-row items-center justify-center gap-5">
            <Pressable
              onPress={() => {
                hearts.refill();
              }}
              disabled={!hearts.canRefill}
              accessibilityRole="button"
              accessibilityState={{ disabled: !hearts.canRefill }}
              hitSlop={10}
              testID="hearts-refill"
            >
              <Text
                className={`text-sm font-semibold text-ink-secondary ${hearts.canRefill ? 'underline' : 'opacity-40'}`}
              >
                {t('home.hearts.refill', { cost: hearts.refillCost })}
              </Text>
            </Pressable>
            <Pressable onPress={onLeave} accessibilityRole="button" hitSlop={10} testID="hearts-leave">
              <Text className="text-sm font-semibold text-ink-secondary underline">{t('common.back')}</Text>
            </Pressable>
          </View>
        </Card>
      </Animated.View>
    </Animated.View>
  );
}
