import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Button, Card } from '@/components/ui';

import { useHearts } from './useHearts';

interface OutOfHeartsSheetProps {
  /** Leave the run (back to the previous screen). */
  onLeave: () => void;
}

/**
 * Blocks play when the hearts meter is empty: wait for regeneration, refill
 * with coins, or go Premium for unlimited hearts. Rendered by mode screens as
 * an overlay on top of the round so the player keeps their place.
 */
export function OutOfHeartsSheet({ onLeave }: OutOfHeartsSheetProps) {
  const router = useRouter();
  const hearts = useHearts();

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      className="absolute inset-0 justify-end bg-black/60 px-5 pb-8"
      testID="out-of-hearts"
    >
      <Animated.View entering={FadeInDown.springify().damping(18)}>
        <Card className="gap-4">
          <View className="gap-1">
            <Text className="text-2xl font-extrabold text-ink-primary">Out of hearts</Text>
            <Text className="text-base text-ink-secondary">
              {hearts.nextIn
                ? `Your next heart arrives in ${hearts.nextIn}. Hearts refill one every 30 minutes.`
                : 'Hearts refill one every 30 minutes.'}
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
            label="Go Premium · unlimited hearts"
            onPress={() => router.push('/paywall')}
            testID="hearts-premium"
          />
          <Button
            label={`Refill hearts · ${hearts.refillCost} 🪙`}
            variant="ghost"
            disabled={!hearts.canRefill}
            onPress={() => {
              hearts.refill();
            }}
            testID="hearts-refill"
          />
          <Button label="Back" variant="ghost" onPress={onLeave} testID="hearts-leave" />
        </Card>
      </Animated.View>
    </Animated.View>
  );
}
