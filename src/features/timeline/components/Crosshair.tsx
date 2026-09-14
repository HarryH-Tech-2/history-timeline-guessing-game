import { useLayoutEffect, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  type SharedValue,
} from 'react-native-reanimated';

import { formatYear } from '@/features/timeline/math';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface CrosshairProps {
  centreYear: SharedValue<number>;
  /** True while the timeline is still (see TimelineController.atRest). */
  atRest: SharedValue<boolean>;
}

/**
 * The live year readout, driven by an animated, read-only TextInput: its text
 * updates on the UI thread every frame without a React re-render.
 *
 * Those UI-thread updates are invisible to React, though, and animatedProps
 * only push again when the year actually changes — so on mount, and after any
 * React re-render at a standstill (e.g. the parent re-laying out between
 * rounds), the native text would be left blank. To cover that, the input is
 * also given a `value` seeded from the shared value *after* render (never
 * during it): RN re-applies `value` to the native view whenever it changes.
 * The seed is also refreshed each time the timeline comes to rest — never
 * while it moves, since a React commit mid-pan pauses Reanimated's commits —
 * so React's copy of the year is current even if nothing else re-renders.
 */
function YearReadout({ centreYear, atRest }: CrosshairProps) {
  const animatedProps = useAnimatedProps(() => {
    const text = formatYear(centreYear.value);
    // `text` is a valid native TextInput prop but is absent from the RN types.
    return { text } as unknown as Partial<TextInputProps>;
  });

  const [seed, setSeed] = useState('');
  useLayoutEffect(() => {
    const current = formatYear(centreYear.value);
    if (current !== seed) setSeed(current);
  });
  useAnimatedReaction(
    () => (atRest.value ? formatYear(centreYear.value) : undefined),
    (current, previous) => {
      if (current === undefined || current === previous) return;
      runOnJS(setSeed)(current);
    },
  );

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      accessibilityLabel="Selected year"
      className="min-w-[72px] text-center text-lg font-bold text-accent-soft"
      value={seed}
      animatedProps={animatedProps}
    />
  );
}

/** The fixed centre marker: readout pill above, needle down to the baseline. */
export function Crosshair({ centreYear, atRest }: CrosshairProps) {
  // The needle starts from the measured bottom of the pill rather than a fixed
  // offset, so it never overlaps the year readout at large font scales.
  const [needleTop, setNeedleTop] = useState(52);

  return (
    <View pointerEvents="none" className="absolute inset-0 items-center">
      {/* Readout plaque above the crosshair */}
      <View
        className="absolute top-2 border border-accent/40 bg-accent/15 px-4 py-1"
        onLayout={(e) => setNeedleTop(8 + e.nativeEvent.layout.height + 6)}
      >
        <YearReadout centreYear={centreYear} atRest={atRest} />
      </View>

      {/* Glow, needle and cap dot run from below the plaque down to the baseline */}
      <View className="absolute bottom-8 w-6 bg-accent/10" style={{ top: needleTop }} />
      <View className="absolute bottom-8 w-0.5 bg-accent" style={{ top: needleTop }} />
      <View className="absolute bottom-8 -mb-1.5 h-3 w-3 rounded-full border-2 border-bg-raised bg-accent" />
    </View>
  );
}
