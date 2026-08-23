import { Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { formatYear, worldXForYear } from '@/features/timeline/math';

interface RevealMarkerProps {
  year: number;
  scale: SharedValue<number>;
  colour: string;
  /** Short caption shown before the year in the pill (e.g. "You"). */
  label?: string;
  /**
   * Pushes the pill down from the top of the track by this many px, so two
   * markers close together (guess vs answer) never overlap their labels.
   */
  stagger?: number;
  /** Text colour inside the pill; defaults to black for light pills. */
  textColour?: string;
  testID?: string;
}

/** Fixed marker-box width, shifted left by half so the line lands on the year. */
const MARKER_WIDTH = 128;

/**
 * Marks a year on the timeline after submission — the correct answer, or the
 * player's guess. Anchored to a fixed world position inside the panning layer,
 * so it moves in lockstep with the gridlines and only recomputes when the zoom
 * scale changes.
 */
export function RevealMarker({
  year,
  scale,
  colour,
  label,
  stagger = 0,
  textColour = '#000000',
  testID,
}: RevealMarkerProps) {
  const worldX = worldXForYear(year);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: worldX * scale.value - MARKER_WIDTH / 2 }],
  }));

  const pillText = label ? `${label} · ${formatYear(year)}` : formatYear(year);

  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(400)}
      style={[style, { width: MARKER_WIDTH }]}
      className="absolute bottom-8 top-2 left-0 items-center"
      testID={testID}
    >
      <View
        className="rounded-full px-3 py-1"
        style={{ backgroundColor: colour, marginTop: stagger }}
      >
        <Text className="text-xs font-bold" style={{ color: textColour }}>
          {pillText}
        </Text>
      </View>
      <View className="w-0.5 flex-1" style={{ backgroundColor: colour }} />
      <View
        className="absolute bottom-0 h-3.5 w-3.5 -mb-1.5 rounded-full border-2 border-bg-raised"
        style={{ backgroundColor: colour }}
      />
    </Animated.View>
  );
}
