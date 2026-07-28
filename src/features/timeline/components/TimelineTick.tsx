import { memo } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import type { Tick } from '@/features/timeline/ticks';

interface TimelineTickProps {
  tick: Tick;
  translateX: SharedValue<number>;
  scale: SharedValue<number>;
}

/**
 * A single gridline. Its horizontal position is derived from the live transform
 * on the UI thread; the label itself is never scaled, so text stays crisp at
 * any zoom.
 */
function TimelineTickComponent({ tick, translateX, scale }: TimelineTickProps) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tick.worldX * scale.value + translateX.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={style}
      className="absolute bottom-0 top-0 left-0 items-center justify-center"
    >
      {tick.major && (
        <Text
          numberOfLines={1}
          className="mb-2 w-24 text-center text-xs font-medium text-ink-muted"
        >
          {tick.label}
        </Text>
      )}
      <View
        className={tick.major ? 'h-8 w-px bg-ink-primary/30' : 'h-4 w-px bg-ink-primary/15'}
      />
    </Animated.View>
  );
}

export const TimelineTick = memo(TimelineTickComponent);
