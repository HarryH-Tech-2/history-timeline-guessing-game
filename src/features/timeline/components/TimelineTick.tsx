import { memo } from 'react';
import { Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import type { Tick } from '@/features/timeline/ticks';
import { LABEL_RAMPS, LINE_RAMPS, rampOpacity, tierOf } from '@/features/timeline/tickVisibility';

interface TimelineTickProps {
  tick: Tick;
  scale: SharedValue<number>;
  /**
   * The zoom as of the last time the view came to rest (see
   * `TimelineController.resting`). Each animated style below is followed by a
   * plain style computed from this, so the values React owns for the view are
   * never stale — the fallback Reanimated snaps back to if its registry entry
   * for the view has been collected.
   */
  restingScale: number;
}

/** Fixed tick-box width; the box is shifted left by half so its centre (the
 * gridline and label) sits exactly on the tick's world position. */
const TICK_WIDTH = 96;

/**
 * A decade gridline: one animated view, no label. There are ~500 of these
 * across the range, so it is kept to the bare minimum — position and opacity
 * are folded into a single animated style.
 */
function MinorTickComponent({ tick, scale, restingScale }: TimelineTickProps) {
  const [lineFrom, lineTo] = LINE_RAMPS[3]!;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tick.worldX * scale.value }],
    opacity: rampOpacity(scale.value, lineFrom, lineTo),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          transform: [{ translateX: tick.worldX * restingScale }],
          opacity: rampOpacity(restingScale, lineFrom, lineTo),
        },
      ]}
      className="absolute bottom-8 left-0 h-7 w-px bg-ink-primary/15"
    />
  );
}

/**
 * A century gridline rising from the track's baseline, with its date centred
 * beneath it. Horizontal position depends only on the zoom scale — the parent
 * layer applies the pan translation — so ticks cost nothing while panning.
 * The label itself is never scaled, so text stays crisp at any zoom; instead,
 * whole tiers of ticks fade out as the view widens so lines and labels never
 * overlap however far the timeline is zoomed out.
 */
function MajorTickComponent({ tick, scale, restingScale }: TimelineTickProps) {
  const tier = tierOf(tick);
  const [lineFrom, lineTo] = LINE_RAMPS[tier]!;
  const [labelFrom, labelTo] = LABEL_RAMPS[tier]!;

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tick.worldX * scale.value - TICK_WIDTH / 2 }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    opacity: rampOpacity(scale.value, lineFrom, lineTo),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: rampOpacity(scale.value, labelFrom, labelTo),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          width: TICK_WIDTH,
          transform: [{ translateX: tick.worldX * restingScale - TICK_WIDTH / 2 }],
        },
      ]}
      className="absolute bottom-0 top-0 left-0 items-center justify-end"
      testID={`timeline-tick-${tick.year}`}
    >
      <Animated.View
        style={[lineStyle, { opacity: rampOpacity(restingScale, lineFrom, lineTo) }]}
        className="h-14 w-px bg-ink-primary/40"
        testID={`timeline-tick-line-${tick.year}`}
      />
      {/* Fixed-height date strip below the baseline. */}
      <Animated.View
        style={[labelStyle, { opacity: rampOpacity(restingScale, labelFrom, labelTo) }]}
        className="h-8 items-center justify-center"
      >
        <Text numberOfLines={1} className="w-24 text-center text-xs font-medium text-ink-muted">
          {tick.label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function TimelineTickComponent(props: TimelineTickProps) {
  return props.tick.major ? <MajorTickComponent {...props} /> : <MinorTickComponent {...props} />;
}

export const TimelineTick = memo(TimelineTickComponent);
