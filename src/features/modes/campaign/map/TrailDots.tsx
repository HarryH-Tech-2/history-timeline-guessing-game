import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { DOT_STAGGER_MS, SEQUENCE_DELAY_MS, TRAIL_DOTS } from './constants';
import type { Point } from './trailCurve';

/** One trail dot; `lightDelay` fades its lit colour in as part of the unlock sequence. */
function TrailDot({
  left,
  top,
  colour,
  lit,
  lightDelay,
  token,
}: {
  left: number;
  top: number;
  colour: string;
  lit: boolean;
  lightDelay: number | null;
  token: number;
}) {
  const reducedMotion = useReducedMotion();
  const glow = useSharedValue(1);

  useEffect(() => {
    if (lightDelay === null || reducedMotion) return;
    glow.value = 0;
    glow.value = withDelay(lightDelay, withTiming(1, { duration: 220 }));
    return () => cancelAnimation(glow);
  }, [lightDelay, token, reducedMotion, glow]);

  const litStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: left - 7, top: top - 7 }}>
      {/* The unlit dot sits underneath, so a lit one fades in over it. */}
      <View
        style={{
          position: 'absolute',
          left: 3,
          top: 3,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(255,255,255,0.75)',
          borderWidth: 1,
          borderColor: 'rgba(29,23,18,0.25)',
        }}
      />
      {lit && (
        <Animated.View style={litStyle} testID="trail-dot-lit">
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: colour,
              borderWidth: 2,
              borderColor: '#FFFFFF',
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Dotted trail segment between two buttons, its dots precomputed along an
 * S-curve by the trail layout. Lit in the era colour once the stage it leaves
 * from is cleared — the road behind the player glows, the road ahead stays
 * faint. The light-up runs over the same time whatever the segment's length.
 */
export const TrailDots = memo(function TrailDots({
  dots,
  colour,
  lit,
  lighting,
  token,
}: {
  dots: readonly Point[];
  colour: string;
  lit: boolean;
  /** This segment was lit since the last visit: light it dot by dot. */
  lighting: boolean;
  token: number;
}) {
  const stagger = dots.length > 1 ? ((TRAIL_DOTS - 1) * DOT_STAGGER_MS) / (dots.length - 1) : 0;
  return (
    <>
      {dots.map((dot, i) => (
        <TrailDot
          key={i}
          left={dot.x}
          top={dot.y}
          colour={colour}
          lit={lit}
          lightDelay={lighting ? SEQUENCE_DELAY_MS + 200 + i * stagger : null}
          token={token}
        />
      ))}
    </>
  );
});
