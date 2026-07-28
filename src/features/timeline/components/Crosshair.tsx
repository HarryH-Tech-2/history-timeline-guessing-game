import { TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';

import { formatYear } from '@/features/timeline/math';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface CrosshairProps {
  centreYear: SharedValue<number>;
}

/**
 * The fixed centre marker. The year readout is driven by an animated,
 * read-only TextInput: its text updates on the UI thread every frame without
 * triggering a React re-render, keeping the interaction smooth.
 */
export function Crosshair({ centreYear }: CrosshairProps) {
  const animatedProps = useAnimatedProps(() => {
    const text = formatYear(centreYear.value);
    // `text` is a valid native TextInput prop but is absent from the RN types.
    return { text } as unknown as Partial<TextInputProps>;
  });

  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      {/* Readout pill above the crosshair */}
      <View className="absolute top-2 rounded-full border border-accent/40 bg-accent/15 px-4 py-1.5">
        <AnimatedTextInput
          editable={false}
          underlineColorAndroid="transparent"
          accessibilityLabel="Selected year"
          className="min-w-[72px] text-center text-lg font-bold text-accent-soft"
          animatedProps={animatedProps}
        />
      </View>

      {/* Glow */}
      <View className="absolute h-40 w-8 rounded-full bg-accent/10" />
      {/* Crosshair line */}
      <View className="h-32 w-0.5 bg-accent" />
      {/* Cap dot */}
      <View className="absolute h-3 w-3 rounded-full border-2 border-bg-raised bg-accent" />
    </View>
  );
}
