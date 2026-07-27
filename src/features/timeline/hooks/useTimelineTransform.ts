import { useCallback, useRef } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, type ComposedGesture } from 'react-native-gesture-handler';
import {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withDecay,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

import {
  BASE_WIDTH,
  MAX_SCALE,
  MIN_SCALE,
  clampYear,
  transformToFit,
  unwarp,
  yearForWorldX,
} from '@/features/timeline/math';

function clampScale(value: number): number {
  'worklet';
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

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
    return unwarp(worldX / BASE_WIDTH);
  });

  const tickHaptic = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  useAnimatedReaction(
    () => Math.round(centreYear.value / 10),
    (current, previous) => {
      if (!haptics || previous === null || current === previous) return;
      if (ready.value) runOnJS(tickHaptic)();
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
      translateX.value = startTranslateX.value + event.translationX;
    })
    .onEnd((event) => {
      const [tMin, tMax] = translateBounds(scale.value);
      translateX.value = withDecay({
        velocity: event.velocityX,
        clamp: [tMin, tMax],
        rubberBandEffect: true,
      });
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
      startTranslateX.value = translateX.value;
    })
    .onUpdate((event) => {
      const nextScale = clampScale(startScale.value * event.scale);
      // World point under the focal point must stay put as we scale.
      const worldUnderFocal = (event.focalX - startTranslateX.value) / startScale.value;
      translateX.value = event.focalX - worldUnderFocal * nextScale;
      scale.value = nextScale;
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const fitTo = useCallback(
    (minYear: number, maxYear: number) => {
      const w = widthRef.current;
      if (w <= 0) return;
      const t = transformToFit(minYear, maxYear, w);
      translateX.value = t.translateX;
      scale.value = t.scale;
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

  const readGuessYear = useCallback(() => {
    const w = widthRef.current;
    const worldX = (w / 2 - translateX.value) / scale.value;
    return clampYear(yearForWorldX(worldX));
  }, [scale, translateX]);

  return {
    translateX,
    scale,
    centreYear,
    gesture,
    onLayout,
    readGuessYear,
    fitTo,
    ready,
  };
}
