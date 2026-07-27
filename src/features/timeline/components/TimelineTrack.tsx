import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

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
 */
export function TimelineTrack({
  controller,
  revealYear,
  revealColour = '#3DDC97',
}: TimelineTrackProps) {
  const { translateX, scale } = controller;

  return (
    <View
      onLayout={controller.onLayout}
      className="h-52 overflow-hidden rounded-2xl border border-hair bg-bg-raised"
    >
      <GestureDetector gesture={controller.gesture}>
        <Animated.View className="flex-1 bg-transparent">
          {TICKS.map((tick) => (
            <TimelineTick
              key={tick.year}
              tick={tick}
              translateX={translateX}
              scale={scale}
            />
          ))}
          {revealYear !== undefined && (
            <RevealMarker
              year={revealYear}
              translateX={translateX}
              scale={scale}
              colour={revealColour}
            />
          )}
        </Animated.View>
      </GestureDetector>

      <Crosshair centreYear={controller.centreYear} />
    </View>
  );
}
