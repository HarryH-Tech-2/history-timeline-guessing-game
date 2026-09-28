import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/ui';
import { Mascot } from '@/features/modes/components/Mascot';

const CENTURIES = [1500, 1600, 1700, 1800, 1900, 2000];
const CENTURY_GAP = 120;

/** A quiet timeline drifting behind the owl: the game's material, in motion. */
function DriftingTimeline() {
  const reducedMotion = useReducedMotion();
  const shift = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    shift.value = withRepeat(
      withTiming(-CENTURY_GAP, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(shift);
  }, [reducedMotion, shift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shift.value }] }));

  return (
    <View pointerEvents="none" className="h-16 w-full overflow-hidden opacity-60">
      <View className="absolute bottom-6 left-0 right-0 h-px bg-hair" />
      <Animated.View style={style} className="absolute bottom-0 left-0 flex-row">
        {[...CENTURIES, ...CENTURIES].map((year, i) => (
          <View key={i} style={{ width: CENTURY_GAP }} className="items-start">
            <View className="h-8 w-px bg-ink-primary/30" />
            <Text className="mt-1 text-[11px] font-medium text-ink-muted">{year}</Text>
            <View className="absolute bottom-6 left-[30px] h-3 w-px bg-ink-primary/15" />
            <View className="absolute bottom-6 left-[60px] h-4 w-px bg-ink-primary/20" />
            <View className="absolute bottom-6 left-[90px] h-3 w-px bg-ink-primary/15" />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View className="flex-1 justify-between">
      <View className="flex-1 justify-center gap-8">
        <Animated.View entering={FadeInUp.springify().damping(18)} className="items-center gap-2">
          <Text className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Date Guesser
          </Text>
          <Text className="px-4 text-center text-4xl font-extrabold leading-tight text-ink-primary">
            Every event has a year.
          </Text>
          <Text className="text-center text-xl font-semibold text-accent">
            How close can you get?
          </Text>
        </Animated.View>
        <Mascot line="I’m Minerva. Let’s find out." height={140} />
        <DriftingTimeline />
      </View>
      <Button label="Show me" glyph="→" variant="hero" onPress={onNext} testID="onboarding-next" />
    </View>
  );
}
