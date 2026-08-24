import { memo } from 'react';
import { Text } from 'react-native';
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
 * Zoom ranges over which each tier of tick fades in, as [from, to] scale.
 * Chosen so that neighbouring visible labels are always ≥ ~80px apart and
 * gridlines never bunch into a smear: when the timeline is framed wide (e.g.
 * the reveal fitting 551 BCE and 1863 on one screen) only millennium and
 * 500-year marks survive; centuries appear as you zoom in, then decades.
 */
type Ramp = readonly [number, number];
const ALWAYS: Ramp = [0, 0];

/** Line fade-in per tier: millennium / half-millennium / century / decade. */
const LINE_RAMPS: readonly Ramp[] = [ALWAYS, [0.08, 0.14], [0.3, 0.5], [0.7, 1.1]];

/** Label fade-in per labelled tier (decades have no label). */
const LABEL_RAMPS: readonly Ramp[] = [[0.04, 0.07], [0.16, 0.24], [0.8, 1.1]];

function rampOpacity(scale: number, from: number, to: number): number {
  'worklet';
  if (to <= from) return 1;
  if (scale <= from) return 0;
  if (scale >= to) return 1;
  return (scale - from) / (to - from);
}

function tierOf(tick: Tick): number {
  if (!tick.major) return 3;
  if (tick.year % 1000 === 0) return 0;
  if (tick.year % 500 === 0) return 1;
  return 2;
}

/**
 * A decade gridline: one animated view, no label. There are ~500 of these
 * across the range, so it is kept to the bare minimum — position and opacity
 * are folded into a single animated style.
 */
function MinorTickComponent({ tick, scale }: TimelineTickProps) {
  const [lineFrom, lineTo] = LINE_RAMPS[3]!;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tick.worldX * scale.value }],
    opacity: rampOpacity(scale.value, lineFrom, lineTo),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={style}
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
    >
      <Animated.View style={lineStyle} className="h-14 w-px bg-ink-primary/40" />
      {/* Fixed-height date strip below the baseline. */}
      <Animated.View style={labelStyle} className="h-8 items-center justify-center">
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
