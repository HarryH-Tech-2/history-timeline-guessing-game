import { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** Minerva, the game's owl scholar — laurel wreath, toga, scroll. */
const OWL = require('../../../../assets/mascot/owl.webp');

interface MascotProps {
  /** What the owl says in its speech plaque. */
  line: string;
  /** Rendered height of the owl in px. */
  height?: number;
}

/**
 * The end-of-run mascot: pops in from below with a springy bounce, then idles
 * with a gentle bob while its speech plaque fades in beside it. Honours the
 * reduced-motion setting by skipping straight to the resting pose.
 */
export function Mascot({ line, height = 120 }: MascotProps) {
  const reducedMotion = useReducedMotion();
  const pop = useSharedValue(reducedMotion ? 1 : 0);
  const bob = useSharedValue(0);
  const bubble = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    pop.value = withDelay(120, withSpring(1, { damping: 9, stiffness: 140, mass: 0.8 }));
    bubble.value = withDelay(520, withTiming(1, { duration: 260 }));
    bob.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [bob, bubble, pop, reducedMotion]);

  const owlStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 2),
    transform: [
      { translateY: (1 - pop.value) * 80 - bob.value * 4 },
      { scale: 0.4 + pop.value * 0.6 },
      { rotate: `${(1 - pop.value) * -12 + bob.value * 2}deg` },
    ],
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubble.value,
    transform: [{ translateY: (1 - bubble.value) * 8 }],
  }));

  // The source art is 601×640; keep its aspect so the toga isn't squashed.
  const width = Math.round(height * (601 / 640));

  return (
    <View className="flex-row items-end gap-3" testID="mascot">
      <Animated.View style={owlStyle}>
        <Image
          source={OWL}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible
          accessibilityLabel="Minerva the owl"
          style={{ width, height }}
        />
      </Animated.View>
      <Animated.View
        style={bubbleStyle}
        className="mb-6 flex-1 border border-hair bg-bg-raised px-4 py-3"
      >
        <Text className="text-base font-semibold leading-snug text-ink-primary">{line}</Text>
      </Animated.View>
    </View>
  );
}
