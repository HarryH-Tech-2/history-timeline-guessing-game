import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { DARK_INK, inkOn, shade } from './mapVisuals';

/**
 * The white speech bubble bobbing over the frontier stage: "START" in the era
 * colour (darkened on the pale colours so it still reads on white), with a
 * small tail pointing down at the button. Holds still under reduced motion.
 */
export function StartBubble({ colour, label }: { colour: string; label: string }) {
  const reducedMotion = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 650, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    // Endless loops outlive their view unless cancelled.
    return () => cancelAnimation(bob);
  }, [bob, reducedMotion]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value * -5 }] }));
  const text = inkOn(colour) === DARK_INK ? shade(colour, 0.4) : colour;

  return (
    <Animated.View pointerEvents="none" style={[style, { alignItems: 'center' }]}>
      <View
        className="rounded-xl bg-white px-3 py-1.5"
        style={{
          borderWidth: 2,
          borderColor: shade(colour, 0.15),
          elevation: 3,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 2 },
        }}
        testID="start-bubble"
      >
        <Text
          className="text-sm font-black uppercase tracking-wider"
          style={{ color: text, includeFontPadding: false }}
        >
          {label}
        </Text>
      </View>
      {/* Tail: a rotated square tucked under the bubble's bottom edge. */}
      <View
        style={{
          marginTop: -7,
          width: 12,
          height: 12,
          backgroundColor: '#FFFFFF',
          borderRightWidth: 2,
          borderBottomWidth: 2,
          borderColor: shade(colour, 0.15),
          transform: [{ rotate: '45deg' }],
        }}
      />
    </Animated.View>
  );
}
