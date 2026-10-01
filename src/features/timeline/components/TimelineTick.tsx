import { memo } from 'react';
import { Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { BASE_WIDTH, warp } from '@/features/timeline/math';
import { decadeSlotYear, type Tick } from '@/features/timeline/ticks';
import { displayYear } from '@/i18n';
import { LABEL_RAMPS, LINE_RAMPS, rampOpacity, tierOf } from '@/features/timeline/tickVisibility';

interface TimelineTickProps {
  tick: Tick;
  scale: SharedValue<number>;
}

/** Fixed tick-box width; the box is shifted left by half so its centre (the
 * gridline and label) sits exactly on the tick's world position. */
const TICK_WIDTH = 96;

/**
 * One recycled decade gridline (see decadeSlotYear): which decade it marks is
 * worked out on the UI thread from the crosshair year, so panning anywhere —
 * however fast — never mounts, unmounts or re-renders a view. The year is a
 * derived value of its own, so the style below only re-runs when this slot
 * wraps to a new decade or the zoom changes, not on every frame of a pan.
 */
function DecadeSlotComponent({
  slot,
  poolSize,
  centreYear,
  scale,
}: {
  slot: number;
  poolSize: number;
  centreYear: SharedValue<number>;
  scale: SharedValue<number>;
}) {
  const [lineFrom, lineTo] = LINE_RAMPS[3]!;
  const year = useDerivedValue(() => decadeSlotYear(slot, centreYear.value, poolSize));
  const style = useAnimatedStyle(() => {
    const y = year.value;
    if (y === null) return { transform: [{ translateX: 0 }], opacity: 0 };
    return {
      transform: [{ translateX: warp(y) * BASE_WIDTH * scale.value }],
      opacity: rampOpacity(scale.value, lineFrom, lineTo),
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={style}
      className="absolute bottom-10 left-0 h-10 w-px bg-ink-primary/15"
      testID={`timeline-decade-slot-${slot}`}
    />
  );
}

export const DecadeSlot = memo(DecadeSlotComponent);

/**
 * A century gridline rising from the track's baseline, with its date centred
 * beneath it. Horizontal position depends only on the zoom scale — the parent
 * layer applies the pan translation — so ticks cost nothing while panning.
 * The label itself is never scaled, so text stays crisp at any zoom; instead,
 * whole tiers of ticks fade out as the view widens so lines and labels never
 * overlap however far the timeline is zoomed out.
 */
function MajorTickComponent({ tick, scale }: TimelineTickProps) {
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
      style={[style, { width: TICK_WIDTH }]}
      className="absolute bottom-0 top-0 left-0 items-center justify-end"
      testID={`timeline-tick-${tick.year}`}
    >
      <Animated.View
        style={lineStyle}
        className="h-20 w-px bg-ink-primary/40"
        testID={`timeline-tick-line-${tick.year}`}
      />
      {/* Fixed-height date strip below the baseline. */}
      <Animated.View
        style={labelStyle}
        className="h-10 items-center justify-center"
      >
        <Text numberOfLines={1} className="w-24 text-center text-sm font-medium text-ink-muted">
          {/* From the year, not tick.label: TICKS is built once at import,
              before the language is known. */}
          {tick.label === undefined ? undefined : displayYear(tick.year)}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

export const TimelineTick = memo(MajorTickComponent);
