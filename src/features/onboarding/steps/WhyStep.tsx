import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import { IconPlaque } from '@/features/modes/home/IconPlaque';
import { t } from '@/i18n';

/** The three reasons, built per render so they follow the language. */
function reasons(): readonly { glyph: string; title: string; text: string }[] {
  return [
    {
      glyph: '🏛️',
      title: t('onboarding.why.museumTitle'),
      text: t('onboarding.why.museumText'),
    },
    {
      glyph: '📅',
      title: t('onboarding.why.dailyTitle'),
      text: t('onboarding.why.dailyText'),
    },
    {
      glyph: '🏆',
      title: t('onboarding.why.boardsTitle'),
      text: t('onboarding.why.boardsText'),
    },
  ];
}

export function WhyStep({ onNext }: { onNext: () => void }) {
  return (
    <View className="flex-1 justify-between">
      <View className="flex-1 justify-center gap-6">
        <Animated.View entering={FadeInUp.springify().damping(18)}>
          <Text className="text-center text-xs font-semibold uppercase tracking-widest text-ink-muted">
            {t('onboarding.why.eyebrow')}
          </Text>
          <Text className="text-center text-3xl font-extrabold text-ink-primary">
            {t('onboarding.why.title')}
          </Text>
        </Animated.View>
        <View className="gap-3">
          {reasons().map((reason, i) => (
            <Animated.View
              key={reason.title}
              entering={FadeInUp.delay(200 + i * 140).springify().damping(16)}
              className="flex-row items-center gap-4 border border-hair bg-bg-raised p-4"
              testID={`onboarding-reason-${i}`}
            >
              <IconPlaque glyph={reason.glyph} />
              <View className="flex-1">
                <Text className="text-lg font-bold text-ink-primary">{reason.title}</Text>
                <Text className="text-sm leading-snug text-ink-secondary">{reason.text}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </View>
      <Button
        label={t('onboarding.why.next')}
        glyph="→"
        variant="hero"
        onPress={onNext}
        testID="onboarding-next"
      />
    </View>
  );
}
