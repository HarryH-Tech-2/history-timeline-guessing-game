import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, useAnimatedStyle } from 'react-native-reanimated';

import type { TimelineController } from '@/features/timeline/hooks/useTimelineTransform';
import { worldXForYear } from '@/features/timeline/math';
import { TICKS } from '@/features/timeline/ticks';
import { palette } from '@/theme/tokens';

import { CenturyJumpBar } from './CenturyJumpBar';
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
const GUESS_PILL_STAGGER = 26;

/** Fine-tune control: nudges the crosshair year by exactly one year. */
function YearStepButton({
  delta,
  onStep,
}: {
  delta: 1 | -1;
  onStep: (delta: number) => void;
}) {
  const glyph = delta > 0 ? '+' : '−';
  const side = delta > 0 ? 'right-2' : 'left-2';
  return (
    // The wrapper spans the track (above the date strip) so the button sits at
    // its vertical centre; box-none keeps the rest of the column pannable.
    <View pointerEvents="box-none" className={`absolute top-0 bottom-8 ${side} justify-center`}>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          onStep(delta);
        }}
        accessibilityRole="button"
        accessibilityLabel={delta > 0 ? 'One year later' : 'One year earlier'}
        hitSlop={8}
        testID={delta > 0 ? 'year-step-plus' : 'year-step-minus'}
        className="h-9 w-9 items-center justify-center border border-hair bg-bg-overlay"
      >
        <Text
          className="text-lg font-bold text-ink-primary"
          style={{ includeFontPadding: false, textAlignVertical: 'center' }}
        >
          {glyph}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Translucent band between the guess and the answer, so the size of the miss
 * reads at a glance. Lives in the panning layer, anchored in world space.
 */
function ErrorBand({
  fromYear,
  toYear,
  scale,
  colour,
}: {
  fromYear: number;
  toYear: number;
  scale: TimelineController['scale'];
  colour: string;
}) {
  const lo = worldXForYear(Math.min(fromYear, toYear));
  const hi = worldXForYear(Math.max(fromYear, toYear));
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: lo * scale.value }],
    width: Math.max(2, (hi - lo) * scale.value),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(400)}
      style={[style, { backgroundColor: colour, opacity: 0.14 }]}
      className="absolute bottom-8 top-0 left-0"
      testID="reveal-error-band"
    />
  );
}

/**
 * The interactive timeline surface: a pan/pinch gesture region filled with
 * gridlines, a fixed centre crosshair, and (after submission) the correct-year
 * and guessed-year markers. The century quick-jump strip sits inside the same
 * bordered container beneath the date strip.
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
    <View className="overflow-hidden border border-hair bg-bg-raised" testID="timeline">
      <View onLayout={controller.onLayout} className="h-40">
        <GestureDetector gesture={controller.gesture}>
          <Animated.View className="flex-1 bg-transparent">
            <Animated.View style={panStyle} className="absolute inset-0">
              {revealed && guessYear !== undefined && (
                <ErrorBand
                  fromYear={guessYear}
                  toYear={revealYear}
                  scale={scale}
                  colour={revealColour}
                />
              )}
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

        {/* The crosshair is the live guess; once revealed the guess marker
            takes its place, so there is only ever one "your year" on screen. */}
        {!revealed && <Crosshair centreYear={controller.centreYear} />}

        {/* Single-year nudge buttons, centred on the track's left/right edges. */}
        {!revealed && <YearStepButton delta={-1} onStep={controller.stepYear} />}
        {!revealed && <YearStepButton delta={1} onStep={controller.stepYear} />}
      </View>

      {!revealed && (
        <View className="border-t border-hair">
          <CenturyJumpBar controller={controller} />
        </View>
      )}
    </View>
  );
}
