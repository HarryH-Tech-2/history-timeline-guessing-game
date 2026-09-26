import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import { IconPlaque } from '@/features/modes/home/IconPlaque';

const REASONS: readonly { glyph: string; title: string; text: string }[] = [
  {
    glyph: '🏛️',
    title: 'Build your museum',
    text: 'Guess close and the event becomes an artefact in your collection.',
  },
  {
    glyph: '📅',
    title: 'Play the Daily',
    text: 'Eight questions, the same for everyone, once a day. Keep the streak alive.',
  },
  {
    glyph: '🏆',
    title: 'Climb the boards',
    text: 'Today, this week, or all time. There is always a rank within reach.',
  },
];

export function WhyStep({ onNext }: { onNext: () => void }) {
  return (
    <View className="flex-1 justify-between">
      <View className="flex-1 justify-center gap-6">
        <Animated.View entering={FadeInUp.springify().damping(18)}>
          <Text className="text-center text-xs font-semibold uppercase tracking-widest text-ink-muted">
            What you’re playing for
          </Text>
          <Text className="text-center text-3xl font-extrabold text-ink-primary">
            Three ways to win
          </Text>
        </Animated.View>
        <View className="gap-3">
          {REASONS.map((reason, i) => (
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
        label="Nearly there"
        glyph="→"
        variant="hero"
        onPress={onNext}
        testID="onboarding-next"
      />
    </View>
  );
}
