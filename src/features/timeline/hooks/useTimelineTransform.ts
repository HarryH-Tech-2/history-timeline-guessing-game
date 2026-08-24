import { useCallback, useRef } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, type ComposedGesture } from 'react-native-gesture-handler';
import {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withTiming,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

import {
  BASE_WIDTH,
  MAX_SCALE,
  MIN_SCALE,
  clampYear,
  transformToFit,
  transformToReveal,
  unwarp,
  warp,
  yearForWorldX,
} from '@/features/timeline/math';

function clampScale(value: number): number {
  'worklet';
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

/** Shared easing for programmatic re-framing (century jumps, reveals, resets). */
const FRAME_TIMING = { duration: 420, easing: Easing.out(Easing.cubic) };

/** Minimum gap between haptic ticks, so fast zoomed-out pans don't flood the
 * JS thread (and the vibration motor) with a call per decade crossed. */
const HAPTIC_MIN_INTERVAL_MS = 80;

export interface TimelineController {
  translateX: SharedValue<number>;
  scale: SharedValue<number>;
  /** Live year under the crosshair (UI thread). */
  centreYear: SharedValue<number>;
  gesture: ComposedGesture;
  onLayout: (event: LayoutChangeEvent) => void;
  /** Read the current guess (whole-ish year, clamped to range) on the JS thread. */
  readGuessYear: () => number;
  /** Re-frame the timeline to a year range (e.g. to reset between rounds). */
  fitTo: (minYear: number, maxYear: number) => void;
  /**
   * Bring two years (guess and answer) into view with the least movement:
   * nothing if both are visible, a pan if they fit at the current zoom, and a
   * zoom-out only as a last resort. Keeps the player's framing on reveal.
   */
  reveal: (yearA: number, yearB: number) => void;
  /** Nudge the crosshair year by a whole-year delta (the +/- fine controls). */
  stepYear: (delta: number) => void;
  /** Whether the timeline has been laid out and initialised. */
  ready: SharedValue<boolean>;
}

interface Options {
  /** Initial framing when the timeline first appears. */
  initialRange?: { min: number; max: number };
  /** Fire a selection haptic as each decade crosses the crosshair. */
  haptics?: boolean;
}

const DEFAULT_RANGE = { min: 1700, max: 2026 } as const;

/**
 * Owns the pan/pinch transform of the timeline. Everything runs on the UI
 * thread via Reanimated shared values, so panning and zooming stay at 60fps
 * regardless of how many ticks are drawn.
 */
export function useTimelineTransform(options: Options = {}): TimelineController {
  const { initialRange = DEFAULT_RANGE, haptics = true } = options;

  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const width = useSharedValue(0);
  const ready = useSharedValue(false);

  const startTranslateX = useSharedValue(0);
  const startScale = useSharedValue(1);

  // Mirror width on the JS side for imperative reads (guess submission).
  const widthRef = useRef(0);

  const centreYear = useDerivedValue(() => {
    if (scale.value <= 0 || width.value <= 0) return initialRange.max;
    const worldX = (width.value / 2 - translateX.value) / scale.value;
    // Clamped so the readout can never show a year outside the playable range.
    return clampYear(unwarp(worldX / BASE_WIDTH));
  });

  const tickHaptic = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const lastHapticAt = useSharedValue(0);

  useAnimatedReaction(
    () => Math.round(centreYear.value / 10),
    (current, previous) => {
      if (!haptics || previous === null || current === previous) return;
      if (!ready.value) return;
      const now = performance.now();
      if (now - lastHapticAt.value < HAPTIC_MIN_INTERVAL_MS) return;
      lastHapticAt.value = now;
      runOnJS(tickHaptic)();
    },
  );

  const translateBounds = useCallback((currentScale: number): [number, number] => {
    'worklet';
    // Keep the crosshair year within [MIN_YEAR, PRESENT_YEAR].
    const tMin = width.value / 2 - BASE_WIDTH * currentScale;
    const tMax = width.value / 2;
    return [tMin, tMax];
  }, [width]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startTranslateX.value = translateX.value;
    })
    .onUpdate((event) => {
      // Hard stop at both ends: the crosshair can never leave
      // [MIN_YEAR, PRESENT_YEAR], even transiently mid-drag.
      const next = startTranslateX.value + event.translationX;
      const [tMin, tMax] = translateBounds(scale.value);
      translateX.value = Math.min(tMax, Math.max(tMin, next));
    })
    .onEnd((event) => {
      const [tMin, tMax] = translateBounds(scale.value);
      translateX.value = withDecay({
        velocity: event.velocityX,
        clamp: [tMin, tMax],
      });
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
      startTranslateX.value = translateX.value;
    })
    .onUpdate((event) => {
      const nextScale = clampScale(startScale.value * event.scale);
      // World point under the focal point must stay put as we scale — then
      // clamped so a pinch can't carry the crosshair out of range either.
      const worldUnderFocal = (event.focalX - startTranslateX.value) / startScale.value;
      const next = event.focalX - worldUnderFocal * nextScale;
      const [tMin, tMax] = translateBounds(nextScale);
      translateX.value = Math.min(tMax, Math.max(tMin, next));
      scale.value = nextScale;
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const fitTo = useCallback(
    (minYear: number, maxYear: number) => {
      const w = widthRef.current;
      if (w <= 0) return;
      const t = transformToFit(minYear, maxYear, w);
      translateX.value = withTiming(t.translateX, FRAME_TIMING);
      scale.value = withTiming(t.scale, FRAME_TIMING);
    },
    [scale, translateX],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const w = event.nativeEvent.layout.width;
      if (w <= 0) return;
      widthRef.current = w;
      width.value = w;
      if (!ready.value) {
        const t = transformToFit(initialRange.min, initialRange.max, w);
        translateX.value = t.translateX;
        scale.value = t.scale;
        ready.value = true;
      }
    },
    [initialRange.max, initialRange.min, ready, scale, translateX, width],
  );

  const reveal = useCallback(
    (yearA: number, yearB: number) => {
      const w = widthRef.current;
      if (w <= 0) return;
      const current = { translateX: translateX.value, scale: scale.value };
      const t = transformToReveal(yearA, yearB, w, current);
      if (t === current) return;
      translateX.value = withTiming(t.translateX, FRAME_TIMING);
      scale.value = withTiming(t.scale, FRAME_TIMING);
    },
    [scale, translateX],
  );

  const readGuessYear = useCallback(() => {
    // Freeze any fling/step still in flight so the year the player sees at
    // the moment of tapping submit is exactly the year that gets scored.
    cancelAnimation(translateX);
    cancelAnimation(scale);
    const w = widthRef.current;
    const worldX = (w / 2 - translateX.value) / scale.value;
    return clampYear(yearForWorldX(worldX));
  }, [scale, translateX]);

  const stepYear = useCallback(
    (delta: number) => {
      const w = widthRef.current;
      if (w <= 0) return;
      const target = clampYear(Math.round(readGuessYear()) + delta);
      // Translate that puts `target` exactly under the centre crosshair.
      const t = w / 2 - warp(target) * BASE_WIDTH * scale.value;
      translateX.value = withTiming(t, { duration: 140, easing: Easing.out(Easing.quad) });
    },
    [readGuessYear, scale, translateX],
  );

  return {
    translateX,
    scale,
    centreYear,
    gesture,
    onLayout,
    readGuessYear,
    fitTo,
    reveal,
    stepYear,
    ready,
  };
}
