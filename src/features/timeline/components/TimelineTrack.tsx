import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { TimelineController } from '@/features/timeline/hooks/useTimelineTransform';
import { TICKS } from '@/features/timeline/ticks';

import { Crosshair } from './Crosshair';
import { RevealMarker } from './RevealMarker';
import { TimelineTick } from './TimelineTick';

interface TimelineTrackProps {
  controller: TimelineController;
  /** When set, draws the correct-answer marker. */
  revealYear?: number;
  revealColour?: string;
}

/**
 * The interactive timeline surface: a pan/pinch gesture region filled with
 * gridlines, a fixed centre crosshair, and (after submission) the correct-year
 * marker.
 *
 * Panning translates a single parent layer, so a drag re-evaluates one
 * animated style per frame instead of one per tick; individual ticks only
 * recompute when the zoom scale changes.
 */
export function TimelineTrack({
  controller,
  revealYear,
  revealColour = '#E8862B',
}: TimelineTrackProps) {
  const { translateX, scale } = controller;

  const panStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      onLayout={controller.onLayout}
      className="h-64 overflow-hidden rounded-2xl border border-hair bg-bg-raised"
    >
      <GestureDetector gesture={controller.gesture}>
        <Animated.View className="flex-1 bg-transparent">
          <Animated.View style={panStyle} className="absolute inset-0">
            {TICKS.map((tick) => (
              <TimelineTick key={tick.year} tick={tick} scale={scale} />
            ))}
            {revealYear !== undefined && (
              <RevealMarker year={revealYear} scale={scale} colour={revealColour} />
            )}
          </Animated.View>

          {/* Baseline the ticks stand on, with the date strip beneath it. */}
          <View
            pointerEvents="none"
            className="absolute bottom-8 left-0 right-0 h-px bg-hair"
          />
        </Animated.View>
      </GestureDetector>

      <Crosshair centreYear={controller.centreYear} />
    </View>
  );
}
