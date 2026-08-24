import * as Haptics from 'expo-haptics';
import { Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Fire a light haptic on press (default true). */
  haptic?: boolean;
  className?: string;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-accent',
  ghost: 'bg-white/5 border border-hair',
};

const LABEL: Record<ButtonVariant, string> = {
  // Near-black on the metallic orange accent — white fails contrast there.
  primary: 'text-black',
  ghost: 'text-ink-primary',
};

/** Primary interactive button with a tactile press-scale and optional haptic. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  haptic = true,
  className,
  testID,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withTiming(0.96, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      onPress={handlePress}
      style={animatedStyle}
      className={cn(
        'h-14 items-center justify-center px-6',
        CONTAINER[variant],
        disabled && 'opacity-40',
        className,
      )}
    >
      <Text className={cn('text-base font-semibold', LABEL[variant])}>{label}</Text>
    </AnimatedPressable>
  );
}
