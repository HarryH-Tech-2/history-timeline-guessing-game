import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { TimelineController } from '@/features/timeline/hooks/useTimelineTransform';
import { TICKS } from '@/features/timeline/ticks';
import { palette } from '@/theme/tokens';

import { Crosshair } from './Crosshair';
import { RevealMarker } from './RevealMarker';
import { TimelineTick } from './TimelineTick';

interface TimelineTrackProps {
  controller: TimelineController;
  /** When set, the round is revealed: draws the correct-answer marker and
   * (with `guessYear`) the player's guess, and retires the live crosshair. */
  revealYear?: number;
  revealColour?: string;
  /** The submitted guess, marked alongside the answer once revealed. */
  guessYear?: number;
}

/** Vertical offset for the guess pill so it sits below the answer pill when
 * the two years are close enough for the labels to collide. */
const GUESS_PILL_STAGGER = 30;

/** Fine-tune control: nudges the crosshair year by exactly one year. */
function YearStepButton({
  delta,
  onStep,
}: {
  delta: 1 | -1;
  onStep: (delta: number) => void;
}) {
  const glyph = delta > 0 ? '+' : '−';
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onStep(delta);
      }}
      accessibilityRole="button"
      accessibilityLabel={delta > 0 ? 'One year later' : 'One year earlier'}
      hitSlop={8}
      testID={delta > 0 ? 'year-step-plus' : 'year-step-minus'}
      className={`absolute top-2 ${delta > 0 ? 'right-2' : 'left-2'} h-9 w-9 items-center justify-center rounded-full border border-hair bg-bg-overlay`}
    >
      <Text className="text-lg font-bold leading-none text-ink-primary">{glyph}</Text>
    </Pressable>
  );
}

/**
 * The interactive timeline surface: a pan/pinch gesture region filled with
 * gridlines, a fixed centre crosshair, and (after submission) the correct-year
 * and guessed-year markers.
 *
 * Panning translates a single parent layer, so a drag re-evaluates one
 * animated style per frame instead of one per tick; individual ticks only
 * recompute when the zoom scale changes.
 */
export function TimelineTrack({
  controller,
  revealYear,
  revealColour = '#E8862B',
  guessYear,
}: TimelineTrackProps) {
  const { translateX, scale } = controller;
  const revealed = revealYear !== undefined;

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
            {revealed && guessYear !== undefined && (
              <RevealMarker
                year={guessYear}
                scale={scale}
                colour={palette.accent.default}
                label="You"
                stagger={GUESS_PILL_STAGGER}
                testID="reveal-marker-guess"
              />
            )}
            {revealed && (
              <RevealMarker
                year={revealYear}
                scale={scale}
                colour={revealColour}
                testID="reveal-marker-answer"
              />
            )}
          </Animated.View>

          {/* Baseline the ticks stand on, with the date strip beneath it. */}
          <View
            pointerEvents="none"
            className="absolute bottom-8 left-0 right-0 h-px bg-hair"
          />
        </Animated.View>
      </GestureDetector>

      {/* The crosshair tracks the screen centre, which the reveal re-frames to
          the midpoint of guess and answer — so once revealed it would show a
          year the player never chose. The guess marker takes its place. */}
      {!revealed && <Crosshair centreYear={controller.centreYear} />}

      {/* Single-year nudge buttons, flanking the year readout pill. */}
      {!revealed && <YearStepButton delta={-1} onStep={controller.stepYear} />}
      {!revealed && <YearStepButton delta={1} onStep={controller.stepYear} />}
    </View>
  );
}
