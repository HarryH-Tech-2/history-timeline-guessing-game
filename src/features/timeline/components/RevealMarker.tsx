import { Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { formatYear, worldXForYear } from '@/features/timeline/math';

interface RevealMarkerProps {
  year: number;
  translateX: SharedValue<number>;
  scale: SharedValue<number>;
  colour: string;
}

/**
 * Marks the correct year on the timeline after submission. Anchored to a fixed
 * world position, so it pans and zooms in lockstep with the gridlines.
 */
export function RevealMarker({ year, translateX, scale, colour }: RevealMarkerProps) {
  const worldX = worldXForYear(year);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: worldX * scale.value + translateX.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(400)}
      style={style}
      className="absolute bottom-0 top-0 left-0 items-center justify-center"
    >
      <View
        className="mb-2 rounded-full px-3 py-1"
        style={{ backgroundColor: colour }}
      >
        <Text className="text-xs font-bold text-black">{formatYear(year)}</Text>
      </View>
      <View className="h-40 w-0.5" style={{ backgroundColor: colour }} />
      <View
        className="absolute h-3.5 w-3.5 rounded-full border-2 border-white"
        style={{ backgroundColor: colour }}
      />
    </Animated.View>
  );
}
