import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '@/theme/tokens';

/**
 * The running score as a brass-framed plaque. When points land it pops and a
 * "+850" floats up off it. The number itself swaps instantly — a JS count-up
 * would re-render React ~40 times right as the reveal animates, which is the
 * exact commit pattern that stalled the timeline before.
 */
export function ScorePlaque({ score }: { score: number }) {
  const reducedMotion = useReducedMotion();
  const previous = useRef(score);
  const [gain, setGain] = useState<number | null>(null);

  const pop = useSharedValue(1);
  const rise = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    const delta = score - previous.current;
    previous.current = score;
    if (delta <= 0) {
      // A reset (new run) or no change: nothing to celebrate.
      setGain(null);
      return;
    }
    setGain(delta);
    if (reducedMotion) return;
    pop.value = withSequence(
      withTiming(1.12, { duration: 110, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
    rise.value = 0;
    fade.value = 1;
    rise.value = withTiming(-26, { duration: 900, easing: Easing.out(Easing.cubic) });
    fade.value = withSequence(
      withTiming(1, { duration: 450 }),
      withTiming(0, { duration: 450, easing: Easing.in(Easing.quad) }),
    );
    return () => {
      cancelAnimation(pop);
      cancelAnimation(rise);
      cancelAnimation(fade);
    };
  }, [score, reducedMotion, pop, rise, fade]);

  const plaqueStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const gainStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: rise.value }],
  }));

  return (
    <View className="items-center">
      <Animated.View
        style={[
          plaqueStyle,
          {
            borderColor: palette.accent.default,
            shadowColor: palette.accent.default,
            shadowOpacity: 0.45,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: 4,
          },
        ]}
        className="min-w-[120px] items-center rounded-xl border-2 bg-bg-raised px-4 pb-1 pt-0.5"
        accessibilityLabel={`Score ${score}`}
      >
        <Text className="text-[10px] font-bold uppercase tracking-[3px] text-accent">Score</Text>
        <Text
          className="text-2xl font-extrabold text-ink-primary"
          style={{ fontVariant: ['tabular-nums'], includeFontPadding: false }}
          testID="hud-score"
        >
          {score.toLocaleString()}
        </Text>
      </Animated.View>
      {gain !== null && !reducedMotion && (
        <Animated.View
          pointerEvents="none"
          style={[gainStyle, { position: 'absolute', top: 0, right: -8 }]}
          testID="hud-score-gain"
        >
          <Text
            className="text-base font-extrabold"
            style={{ color: palette.accent.soft, includeFontPadding: false }}
          >
            +{gain.toLocaleString()}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}
