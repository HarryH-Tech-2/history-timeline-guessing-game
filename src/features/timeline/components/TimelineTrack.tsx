import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, useAnimatedStyle } from 'react-native-reanimated';

import { haptic } from '@/features/haptics';
import type { TimelineController } from '@/features/timeline/hooks/useTimelineTransform';
import { BASE_WIDTH, MIN_YEAR, PRESENT_YEAR, worldXForYear } from '@/features/timeline/math';
import { MAJOR_TICKS } from '@/features/timeline/ticks';
import { LINE_RAMPS } from '@/features/timeline/tickVisibility';
import { t } from '@/i18n';
import { palette } from '@/theme/tokens';

import { Crosshair } from './Crosshair';
import { RevealMarker } from './RevealMarker';
import { DecadeSlot, TimelineTick } from './TimelineTick';

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

/** Press-and-hold on a +/- button: delay before repeating, then the repeat
 * interval, which shortens each step down to the minimum. */
const HOLD_DELAY_MS = 380;
const HOLD_REPEAT_START_MS = 160;
const HOLD_REPEAT_MIN_MS = 45;

/** Fine-tune control: nudges the crosshair year by exactly one year (tap), or
 * keeps stepping while held. */
function YearStepButton({
  delta,
  onStep,
}: {
  delta: 1 | -1;
  onStep: (delta: number) => void;
}) {
  const glyph = delta > 0 ? '+' : '−';
  const side = delta > 0 ? 'right-2' : 'left-2';

  // Holding the button repeats the step, speeding up the longer it is held.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeated = useRef(false);
  const stopRepeat = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => stopRepeat, [stopRepeat]);
  const startRepeat = useCallback(() => {
    repeated.current = false;
    stopRepeat();
    let interval = HOLD_REPEAT_START_MS;
    const tick = () => {
      repeated.current = true;
      haptic.selection();
      onStep(delta);
      interval = Math.max(HOLD_REPEAT_MIN_MS, interval * 0.85);
      timer.current = setTimeout(tick, interval);
    };
    timer.current = setTimeout(tick, HOLD_DELAY_MS);
  }, [delta, onStep, stopRepeat]);

  return (
    // The wrapper spans the track (above the date strip) so the button sits at
    // its vertical centre; box-none keeps the rest of the column pannable.
    <View pointerEvents="box-none" className={`absolute top-0 bottom-10 ${side} justify-center`}>
      <Pressable
        onPressIn={startRepeat}
        onPressOut={stopRepeat}
        onPress={() => {
          // A hold has already stepped; the release adds nothing more.
          if (repeated.current) return;
          haptic.selection();
          onStep(delta);
        }}
        accessibilityRole="button"
        accessibilityLabel={delta > 0 ? t('round.timeline.oneYearLater') : t('round.timeline.oneYearEarlier')}
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

const PX_PER_YEAR = BASE_WIDTH / (PRESENT_YEAR - MIN_YEAR);

/**
 * Decade slots needed to cover a track `width` px wide at the zoom where
 * decade lines start fading in (any wider and they are invisible anyway),
 * plus one either side for the edges.
 */
export function decadePoolSize(width: number): number {
  const [fadeFrom] = LINE_RAMPS[3]!;
  return Math.ceil(width / (10 * PX_PER_YEAR * fadeFrom)) + 2;
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
      className="absolute bottom-10 top-0 left-0"
      testID="reveal-error-band"
    />
  );
}

/**
 * Track height by screen height: as tall as the screen allows, so short
 * phones (and landscape) keep room for the prompt and the footer. Taller
 * phones give most of the era overview bar's height back from the band above
 * the ticks, so a hint or the footer doesn't squeeze the question picture.
 */
export function trackHeightFor(windowHeight: number): number {
  if (windowHeight >= 820) return 172;
  if (windowHeight >= 720) return 160;
  return 148;
}

/**
 * The interactive timeline surface: a pan gesture region filled with
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
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const decadeSlots = useMemo(
    () => Array.from({ length: decadePoolSize(windowWidth) }, (_, i) => i),
    [windowWidth],
  );

  const panStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View className="overflow-hidden border border-hair bg-bg-raised" testID="timeline">
      <View onLayout={controller.onLayout} style={{ height: trackHeightFor(windowHeight) }}>
        <GestureDetector gesture={controller.gesture}>
          <Animated.View className="flex-1 bg-transparent">
            <Animated.View
              style={panStyle}
              className="absolute inset-0"
              testID="timeline-pan-layer"
            >
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
              {decadeSlots.map((slot) => (
                <DecadeSlot
                  key={slot}
                  slot={slot}
                  poolSize={decadeSlots.length}
                  centreYear={controller.centreYear}
                  scale={scale}
                />
              ))}
              {revealed && guessYear !== undefined && (
                <RevealMarker
                  year={guessYear}
                  scale={scale}
                  colour={palette.accent.default}
                  label={t('round.timeline.you')}
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
              className="absolute bottom-10 left-0 right-0 h-px bg-hair"
            />
          </Animated.View>
        </GestureDetector>

        {/* The crosshair is the live guess; once revealed the guess marker
            takes its place, so there is only ever one "your year" on screen. */}
        {!revealed && <Crosshair centreYear={controller.centreYear} atRest={controller.atRest} />}

        {/* Single-year nudge buttons, centred on the track's left/right edges. */}
        {!revealed && <YearStepButton delta={-1} onStep={controller.stepYear} />}
        {!revealed && <YearStepButton delta={1} onStep={controller.stepYear} />}
      </View>
    </View>
  );
}
