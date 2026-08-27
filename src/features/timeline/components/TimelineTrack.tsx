import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
} from 'react-native-reanimated';

import type { TimelineController } from '@/features/timeline/hooks/useTimelineTransform';
import { BASE_WIDTH, MIN_YEAR, PRESENT_YEAR, worldXForYear } from '@/features/timeline/math';
import {
  DECADE_BLOCK_YEARS,
  decadeBlockOf,
  MAJOR_TICKS,
  MINOR_TICKS_BY_BLOCK,
  type Tick,
} from '@/features/timeline/ticks';
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

/** Decade lines start fading in at scale 0.7 (see TimelineTick); mount them a
 * little earlier so they never pop in late. */
const DECADE_MIN_SCALE = 0.55;
const PX_PER_YEAR = BASE_WIDTH / (PRESENT_YEAR - MIN_YEAR);
/** Blocks either side of the crosshair's block to keep mounted. */
const BLOCK_REACH = 1;

/**
 * The decade ticks worth having mounted right now: none while zoomed out
 * (they would be invisible anyway), otherwise the 500-year blocks around the
 * crosshair. Mounting all ~500 decades up front is what made the quiz screen
 * slow to appear; this keeps it to ≤ ~150 and only re-renders when the
 * crosshair crosses a block boundary or the zoom crosses the threshold.
 */
function useVisibleDecadeTicks(controller: TimelineController): readonly Tick[] {
  // Destructured so the worklet captures only shared values, never the
  // controller (whose composed gesture cannot be copied to the UI thread).
  const { centreYear, scale, width } = controller;
  const [block, setBlock] = useState<number | null>(null);

  useAnimatedReaction(
    () => {
      // On wide screens the blocks either side must still cover the view, so
      // decades wait for a tighter zoom there; phones use the base threshold.
      const coverYears = (BLOCK_REACH + 0.5) * DECADE_BLOCK_YEARS;
      const minScale = Math.max(DECADE_MIN_SCALE, width.value / 2 / (coverYears * PX_PER_YEAR));
      if (width.value <= 0 || scale.value < minScale) return null;
      return decadeBlockOf(centreYear.value);
    },
    (current, previous) => {
      if (current !== previous) runOnJS(setBlock)(current);
    },
  );

  return useMemo(() => {
    if (block === null) return [];
    const ticks: Tick[] = [];
    for (let b = block - BLOCK_REACH; b <= block + BLOCK_REACH; b += 1) {
      const list = MINOR_TICKS_BY_BLOCK.get(b);
      if (list) ticks.push(...list);
    }
    return ticks;
  }, [block]);
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
  const minorTicks = useVisibleDecadeTicks(controller);

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
              {MAJOR_TICKS.map((tick) => (
                <TimelineTick key={tick.year} tick={tick} scale={scale} />
              ))}
              {minorTicks.map((tick) => (
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
