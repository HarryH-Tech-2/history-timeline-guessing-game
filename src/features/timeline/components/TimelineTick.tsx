import { memo } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import type { Tick } from '@/features/timeline/ticks';

interface TimelineTickProps {
  tick: Tick;
  scale: SharedValue<number>;
}

/** Fixed tick-box width; the box is shifted left by half so its centre (the
 * gridline and label) sits exactly on the tick's world position. */
const TICK_WIDTH = 96;

/**
 * A single gridline rising from the track's baseline, with its date centred
 * beneath it. Horizontal position depends only on the zoom scale — the parent
 * layer applies the pan translation — so ticks cost nothing while panning.
 * The label itself is never scaled, so text stays crisp at any zoom.
 */
function TimelineTickComponent({ tick, scale }: TimelineTickProps) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tick.worldX * scale.value - TICK_WIDTH / 2 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[style, { width: TICK_WIDTH }]}
      className="absolute bottom-0 top-0 left-0 items-center justify-end"
    >
      <View
        className={
          tick.major ? 'h-14 w-px bg-ink-primary/40' : 'h-7 w-px bg-ink-primary/15'
        }
      />
      {/* Fixed-height date strip below the baseline; empty for minor ticks so
          every gridline's foot lands on the same baseline. */}
      <View className="h-8 items-center justify-center">
        {tick.major && (
          <Text
            numberOfLines={1}
            className="w-24 text-center text-xs font-medium text-ink-muted"
          >
            {tick.label}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

export const TimelineTick = memo(TimelineTickComponent);
