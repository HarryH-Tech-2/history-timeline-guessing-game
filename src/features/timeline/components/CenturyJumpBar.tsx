import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';

import { MIN_YEAR, PRESENT_YEAR } from '@/features/timeline/math';

import type { TimelineController } from '../hooks/useTimelineTransform';

interface CenturyBand {
  /** Inclusive start year of the 100-year band. */
  start: number;
  /** Range to frame when tapped (100-year window, clamped to the present). */
  frameMin: number;
  frameMax: number;
  label: string;
}

/** Label a 100-year band compactly, e.g. 1500 → "1500s", -3000 → "3000s BCE". */
function centuryLabel(start: number): string {
  if (start >= 0) return `${start}s`;
  return `${-start}s BCE`;
}

/** The century band a given year falls into (band starts step from MIN_YEAR). */
function bandStartForYear(year: number): number {
  return Math.floor((year - MIN_YEAR) / 100) * 100 + MIN_YEAR;
}

const BANDS: readonly CenturyBand[] = (() => {
  const bands: CenturyBand[] = [];
  for (let start = MIN_YEAR; start <= PRESENT_YEAR; start += 100) {
    const frameMax = Math.min(start + 100, PRESENT_YEAR);
    bands.push({
      start,
      frameMin: frameMax - 100,
      frameMax,
      label: centuryLabel(start),
    });
  }
  return bands;
})();

interface CenturyJumpBarProps {
  controller: TimelineController;
}

/**
 * A horizontal strip of century chips under the timeline. Tapping one re-frames
 * the timeline to that 100-year window; the chip covering the crosshair year
 * stays highlighted as the user pans.
 */
export function CenturyJumpBar({ controller }: CenturyJumpBarProps) {
  const [activeStart, setActiveStart] = useState<number>(() =>
    bandStartForYear(PRESENT_YEAR),
  );

  // Track which century sits under the crosshair. Fires only when the band
  // changes (crossing a 100-year boundary), so this stays cheap while panning.
  useAnimatedReaction(
    () => bandStartForYear(controller.centreYear.value),
    (current, previous) => {
      if (current !== previous) runOnJS(setActiveStart)(current);
    },
  );

  const bands = useMemo(() => BANDS, []);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-3 max-h-11"
      contentContainerClassName="gap-2 px-1"
    >
      {bands.map((band) => {
        const active = band.start === activeStart;
        return (
          <Pressable
            key={band.start}
            onPress={() => controller.fitTo(band.frameMin, band.frameMax)}
            accessibilityRole="button"
            accessibilityLabel={`Jump to ${band.label}`}
            accessibilityState={{ selected: active }}
            testID={`century-${band.start}`}
            className={
              active
                ? 'rounded-full bg-accent px-3 py-1.5'
                : 'rounded-full border border-hair bg-bg-raised px-3 py-1.5'
            }
          >
            <Text
              className={
                active
                  ? 'text-xs font-bold text-white'
                  : 'text-xs font-semibold text-ink-secondary'
              }
            >
              {band.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
