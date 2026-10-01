import { useCallback, useEffect, useRef } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withTiming,
  runOnJS,
  runOnUI,
  type SharedValue,
} from 'react-native-reanimated';

import { haptic } from '@/features/haptics';
import {
  BASE_WIDTH,
  clampYear,
  dragGain,
  FLING_MIN_SPEED,
  transformToFit,
  transformToRefocus,
  transformToReveal,
  translateBounds as boundsFor,
  unwarp,
  warp,
  yearForWorldX,
} from '@/features/timeline/math';

/** Shared easing for programmatic re-framing (century jumps, reveals, resets). */
const FRAME_TIMING = { duration: 420, easing: Easing.out(Easing.cubic) };

/** A tap on the overview bar glides there, quicker than a re-frame. */
const JUMP_TIMING = { duration: 260, easing: Easing.out(Easing.cubic) };

/** One +/- step's glide to the next year. */
const STEP_DURATION_MS = 140;

/** Settling onto the nearest whole year once the finger lifts. */
const SNAP_TIMING = { duration: 160, easing: Easing.out(Easing.quad) };

/** Minimum gap between haptic ticks, so fast zoomed-out pans don't flood the
 * JS thread (and the vibration motor) with a call per decade crossed. */
const HAPTIC_MIN_INTERVAL_MS = 80;

/**
 * Quiet time after the last transform change (with no finger on the track)
 * before the view counts as at rest (`TimelineController.atRest`).
 *
 * Long enough that a hand-adjusted drag, which stalls for a few hundred ms at
 * a time, never counts as rest mid-interaction; short enough that the
 * React-side updates waiting on it (century highlight, decade block) land
 * promptly once the player stops.
 */
export const SETTLE_MS = 700;

export interface TimelineController {
  translateX: SharedValue<number>;
  scale: SharedValue<number>;
  /**
   * True while nothing has moved the view for SETTLE_MS and no finger is on
   * the track (UI thread). Anything on the track that mirrors the transform
   * into React state waits for this: a React commit anywhere pauses
   * Reanimated's own commits until it has mounted (ReanimatedCommitHook), so a
   * commit fired mid-pan drops frames — the "timeline is jumpy" reports.
   */
  atRest: SharedValue<boolean>;
  /** Live year under the crosshair (UI thread). */
  centreYear: SharedValue<number>;
  /** Laid-out track width in px (0 until the first layout). */
  width: SharedValue<number>;
  gesture: PanGesture;
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
  /**
   * Start a fresh question from a sensible zoom: if the view is wider than the
   * initial range's span (a big-miss reveal zoomed it out), zoom back to that
   * span centred on `year`; otherwise leave the player's framing alone.
   */
  refocus: (year: number) => void;
  /** Nudge the crosshair year by a whole-year delta (the +/- fine controls). */
  stepYear: (delta: number) => void;
  /**
   * Put `year` under the crosshair at the current zoom (a worklet, for the
   * overview bar's gesture): eased for a tap, immediate while a finger drags.
   */
  jumpTo: (year: number, animate: boolean) => void;
  /**
   * A finger went down on / lifted from another control that moves the view
   * (the overview bar), so it holds `atRest` off just as the track's own pan does.
   */
  touchBegan: () => void;
  touchFinalized: () => void;
  /**
   * Stop any re-frame in flight, then call `then` on the JS thread a frame
   * later, once the UI thread has pushed its last update. For anything that is
   * about to take the timeline out of the tree: unmounting ~200 ticks while a
   * reveal zoom is still animating them leaves Reanimated pushing props at
   * views that no longer exist, every event, for the rest of the session.
   */
  halt: (then: () => void) => void;
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
 * Owns the pan transform of the timeline. Everything runs on the UI thread
 * via Reanimated shared values, so panning stays at 60fps regardless of how
 * many ticks are drawn. The zoom (`scale`) is not under the player's control:
 * there is no pinch gesture, on purpose — one fixed framing to learn, and
 * nothing to get lost in. Only the reveal (to fit a big miss) and the next
 * question's refocus ever change it.
 */
export function useTimelineTransform(options: Options = {}): TimelineController {
  const { initialRange = DEFAULT_RANGE, haptics = true } = options;

  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const width = useSharedValue(0);
  const ready = useSharedValue(false);

  /** Running drag position (the gain-scaled sum of finger deltas). */
  const startTranslateX = useSharedValue(0);
  const lastTranslationX = useSharedValue(0);

  // Mirror width on the JS side for imperative reads (guess submission).
  const widthRef = useRef(0);

  const centreYear = useDerivedValue(() => {
    if (scale.value <= 0 || width.value <= 0) return initialRange.max;
    const worldX = (width.value / 2 - translateX.value) / scale.value;
    // Clamped so the readout can never show a year outside the playable range.
    return clampYear(unwarp(worldX / BASE_WIDTH));
  });

  const tickHaptic = useCallback(() => {
    haptic.selection();
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

  const atRest = useSharedValue(true);
  // Debounced on the UI thread: while a finger is down, or a fling or re-frame
  // is moving the view, the view counts as moving; SETTLE_MS after the last
  // change (and the last finger lifting) it comes to rest. (-1 = no timer.)
  const settleTimer = useSharedValue(-1);
  /** Fingers currently on the track. */
  const activeTouches = useSharedValue(0);

  const cancelSettle = () => {
    'worklet';
    if (settleTimer.value === -1) return;
    clearTimeout(settleTimer.value as unknown as ReturnType<typeof setTimeout>);
    settleTimer.value = -1;
  };

  const markMoving = () => {
    'worklet';
    atRest.value = false;
    cancelSettle();
    if (activeTouches.value > 0) return;
    settleTimer.value = setTimeout(() => {
      settleTimer.value = -1;
      atRest.value = true;
    }, SETTLE_MS) as unknown as number;
  };

  useAnimatedReaction(
    () => ({ scale: scale.value, translateX: translateX.value, ready: ready.value }),
    (current, previous) => {
      // The first framing (set by onLayout, before `ready` flips) is a start
      // position, not motion: the view is at rest from the moment it appears.
      if (previous === null || !previous.ready) return;
      if (current.scale === previous.scale && current.translateX === previous.translateX) {
        return;
      }
      markMoving();
    },
  );

  // A timer left pending at unmount would flip a shared value nobody reads;
  // harmless, but keep the UI thread clean.
  useEffect(() => {
    return () => {
      runOnUI(cancelSettle)();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const touchBegan = () => {
    'worklet';
    activeTouches.value += 1;
    atRest.value = false;
    cancelSettle();
  };

  const touchFinalized = () => {
    'worklet';
    activeTouches.value = Math.max(0, activeTouches.value - 1);
    // A lift with nothing left moving never changes the transform, so the
    // reaction above would not fire; start the settle window from here too.
    markMoving();
  };

  const translateBounds = useCallback((currentScale: number): [number, number] => {
    'worklet';
    return boundsFor(currentScale, width.value);
  }, [width]);

  /** `t` kept inside the pan bounds at the current zoom. */
  const clampTranslate = (t: number) => {
    'worklet';
    const [tMin, tMax] = boundsFor(scale.value, width.value);
    return Math.min(tMax, Math.max(tMin, t));
  };

  /** translateX that puts the nearest whole year under the crosshair. */
  const snappedTranslate = (from: number) => {
    'worklet';
    const year = clampYear(Math.round(unwarp((width.value / 2 - from) / scale.value / BASE_WIDTH)));
    return width.value / 2 - warp(year) * BASE_WIDTH * scale.value;
  };

  const settleOnYear = () => {
    'worklet';
    translateX.value = withTiming(snappedTranslate(translateX.value), SNAP_TIMING);
  };

  const pan = Gesture.Pan()
    .withTestId('timeline-pan')
    .onBegin(() => {
      touchBegan();
      cancelAnimation(translateX);
      startTranslateX.value = translateX.value;
      lastTranslationX.value = 0;
    })
    .onFinalize(() => {
      touchFinalized();
    })
    .onUpdate((event) => {
      // Finger movement is scaled by its speed (see dragGain): slow drags
      // creep year by year, quick swipes cover centuries.
      const delta = event.translationX - lastTranslationX.value;
      lastTranslationX.value = event.translationX;
      const next = startTranslateX.value + delta * dragGain(event.velocityX ?? 0);
      // Hard stop at both ends: the crosshair can never leave
      // [MIN_YEAR, PRESENT_YEAR], even transiently mid-drag.
      const [tMin, tMax] = translateBounds(scale.value);
      startTranslateX.value = Math.min(tMax, Math.max(tMin, next));
      translateX.value = startTranslateX.value;
    })
    .onEnd((event) => {
      const velocity = event.velocityX ?? 0;
      // A careful placement lands exactly on the nearest year; only a real
      // fling coasts, and it too comes to rest on a whole year.
      if (Math.abs(velocity) < FLING_MIN_SPEED) {
        settleOnYear();
        return;
      }
      const [tMin, tMax] = translateBounds(scale.value);
      translateX.value = withDecay(
        { velocity: velocity * dragGain(velocity), clamp: [tMin, tMax] },
        (finished) => {
          if (finished) settleOnYear();
        },
      );
    });

  const gesture = pan;

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

  const refocus = useCallback(
    (year: number) => {
      const w = widthRef.current;
      if (w <= 0) return;
      const current = { translateX: translateX.value, scale: scale.value };
      const span = initialRange.max - initialRange.min;
      const t = transformToRefocus(year, span, w, current);
      if (t === current) return;
      translateX.value = withTiming(t.translateX, FRAME_TIMING);
      scale.value = withTiming(t.scale, FRAME_TIMING);
    },
    [initialRange.max, initialRange.min, scale, translateX],
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

  // The year the last step is heading for, so steps fired faster than the
  // step animation (a held +/- button) count from there instead of from the
  // half-moved position, which would round back and swallow steps.
  const lastStep = useRef({ year: 0, at: -Infinity });

  const stepYear = useCallback(
    (delta: number) => {
      const w = widthRef.current;
      if (w <= 0) return;
      const now = Date.now();
      const from =
        now - lastStep.current.at < STEP_DURATION_MS ? lastStep.current.year : Math.round(readGuessYear());
      const target = clampYear(from + delta);
      lastStep.current = { year: target, at: now };
      // Translate that puts `target` exactly under the centre crosshair.
      const t = w / 2 - warp(target) * BASE_WIDTH * scale.value;
      translateX.value = withTiming(clampTranslate(t), { duration: STEP_DURATION_MS, easing: Easing.out(Easing.quad) });
    },
    [readGuessYear, scale, translateX],
  );

  const jumpTo = useCallback(
    (year: number, animate: boolean) => {
      'worklet';
      if (width.value <= 0) return;
      const t = clampTranslate(width.value / 2 - warp(clampYear(year)) * BASE_WIDTH * scale.value);
      if (animate) {
        translateX.value = withTiming(t, JUMP_TIMING);
      } else {
        cancelAnimation(translateX);
        translateX.value = t;
      }
    },
    [scale, translateX, width],
  );

  const halt = useCallback(
    (then: () => void) => {
      runOnUI(() => {
        'worklet';
        cancelAnimation(translateX);
        cancelAnimation(scale);
        requestAnimationFrame(() => {
          runOnJS(then)();
        });
      })();
    },
    [scale, translateX],
  );

  return {
    translateX,
    scale,
    atRest,
    centreYear,
    width,
    gesture,
    onLayout,
    readGuessYear,
    fitTo,
    reveal,
    refocus,
    stepYear,
    jumpTo,
    touchBegan,
    touchFinalized,
    halt,
    ready,
  };
}
