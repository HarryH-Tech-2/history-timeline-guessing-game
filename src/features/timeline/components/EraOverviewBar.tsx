import { useCallback } from 'react';
import { Text, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { TimelineController } from '@/features/timeline/hooks/useTimelineTransform';
import { OVERVIEW_ERAS, overviewX, overviewYear, type OverviewEra } from '@/features/timeline/math/overview';
import { t, type TranslationKey } from '@/i18n';
import { palette } from '@/theme/tokens';

/** Height of the overview bar; RoundView reserves room for it above the track. */
export const OVERVIEW_BAR_HEIGHT = 34;
/** Space between the bar and the track below it. */
export const OVERVIEW_BAR_GAP = 8;

const ERA_INK = '#1B140D';

/** Translation key per era id (keys only: t() must not run at import). */
const ERA_LABEL_KEYS: Record<string, TranslationKey> = {
  ancient: 'round.timeline.eras.ancient',
  medieval: 'round.timeline.eras.medieval',
  'early-modern': 'round.timeline.eras.earlyModern',
  nineteenth: 'round.timeline.eras.nineteenth',
  modern: 'round.timeline.eras.modern',
};

/** The era's name in the current language, falling back to its English label. */
function eraLabel(era: OverviewEra): string {
  const key = ERA_LABEL_KEYS[era.id];
  return key === undefined ? era.label : t(key);
}
/** Width of the year marker's box (its triangle is 12px wide). */
const MARKER_W = 12;

/**
 * All of history above the timeline, one equal slot per era (so the modern
 * centuries, where most questions sit, are as easy to hit as antiquity). A
 * marker shows the year the track below is on. Tap anywhere to glide
 * there; drag along it to scrub. The track stays the fine control.
 *
 * Everything moving here is UI-thread: the marker follows the controller's
 * shared values and the gesture writes the transform directly, so scrubbing
 * never commits to React (see TimelineController.atRest).
 */
export function EraOverviewBar({
  controller,
  disabled = false,
}: {
  controller: TimelineController;
  /** Revealed: the bar still follows the view but can't move it. */
  disabled?: boolean;
}) {
  // Destructured so the worklets capture shared values and worklet functions,
  // never the controller (whose composed gesture cannot go to the UI thread).
  const { centreYear, jumpTo, touchBegan, touchFinalized } = controller;
  const barWidth = useSharedValue(0);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      barWidth.value = e.nativeEvent.layout.width;
    },
    [barWidth],
  );

  const pan = Gesture.Pan()
    .withTestId('overview-pan')
    .minDistance(0)
    .enabled(!disabled)
    .onBegin((e) => {
      touchBegan();
      jumpTo(overviewYear(e.x, barWidth.value), true);
    })
    .onUpdate((e) => {
      jumpTo(overviewYear(e.x, barWidth.value), false);
    })
    .onFinalize(() => {
      touchFinalized();
    });

  // A fixed-size marker, not a window: the bar isn't to scale, so the track's
  // span would draw narrow in Ancient and spill across eras in Modern.
  const markerStyle = useAnimatedStyle(() => ({
    opacity: barWidth.value > 0 ? 1 : 0,
    transform: [{ translateX: overviewX(centreYear.value, barWidth.value) - MARKER_W / 2 }],
  }));

  // Screen readers get one action per era in place of the drag.
  const onAccessibilityAction = useCallback(
    (e: AccessibilityActionEvent) => {
      const era = OVERVIEW_ERAS.find((x) => x.id === e.nativeEvent.actionName);
      if (era) jumpTo((era.from + era.to) / 2, true);
    },
    [jumpTo],
  );

  return (
    <GestureDetector gesture={pan}>
      <View
        testID="era-overview"
        onLayout={onLayout}
        accessible
        accessibilityLabel={t('round.timeline.erasLabel')}
        accessibilityActions={OVERVIEW_ERAS.map((era) => ({ name: era.id, label: t('round.timeline.jumpTo', { era: eraLabel(era) }) }))}
        onAccessibilityAction={onAccessibilityAction}
        className="flex-row overflow-hidden border border-hair bg-bg-raised"
        style={{ height: OVERVIEW_BAR_HEIGHT, opacity: disabled ? 0.6 : 1 }}
      >
        {OVERVIEW_ERAS.map((era, i) => (
          <View
            key={era.id}
            testID={`era-overview-${era.id}`}
            className="flex-1 items-center justify-center"
            style={{ backgroundColor: era.colour, marginLeft: i === 0 ? 0 : 1.5 }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              className="px-1 text-[11px] font-extrabold uppercase"
              style={{ color: ERA_INK, letterSpacing: 0.3 }}
            >
              {eraLabel(era)}
            </Text>
          </View>
        ))}
        <Animated.View
          pointerEvents="none"
          testID="era-overview-marker"
          className="absolute bottom-0 left-0 top-0 items-center"
          style={[markerStyle, { width: MARKER_W }]}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 6,
              borderRightWidth: 6,
              borderTopWidth: 7,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: palette.accent.default,
            }}
          />
          <View className="flex-1" style={{ width: 2.5, backgroundColor: palette.accent.default }} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
