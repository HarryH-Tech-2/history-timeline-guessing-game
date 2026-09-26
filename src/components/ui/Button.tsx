import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { haptic as buzz } from '@/features/haptics';
import { cn } from '@/utils/cn';

/** `hero` is the one button a screen wants tapped next: taller, lifted, with a nudging glyph. */
type ButtonVariant = 'primary' | 'ghost' | 'hero';

interface ButtonProps {
  label: string;
  /**
   * Optional second line under the label (a price, a "then £x" detail). Keeps
   * the action readable at button size instead of cramming it onto one line.
   */
  sublabel?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Trailing glyph (e.g. "→"); in the hero variant it nudges gently to invite the tap. */
  glyph?: string;
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
  hero: 'bg-accent rounded-xl border-b-4 border-b-black/20',
};

/** Only the hero lifts off the surface. */
const HERO_SHADOW = {
  shadowColor: '#E8862B',
  shadowOpacity: 0.45,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
} as const;

const LABEL: Record<ButtonVariant, string> = {
  // Near-black on the metallic orange accent — white fails contrast there.
  primary: 'text-black',
  ghost: 'text-ink-primary',
  hero: 'text-black',
};

const SUBLABEL: Record<ButtonVariant, string> = {
  primary: 'text-black/70',
  ghost: 'text-ink-secondary',
  hero: 'text-black/70',
};

/** The hero glyph's slow nudge: a few px right and back, forever, until unmount. */
function useGlyphNudge(active: boolean) {
  const reducedMotion = useReducedMotion();
  const shift = useSharedValue(0);
  useEffect(() => {
    if (!active || reducedMotion) {
      shift.value = 0;
      return;
    }
    shift.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 700 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(shift);
  }, [active, reducedMotion, shift]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: shift.value }] }));
}

/** Primary interactive button with a tactile press-scale and optional haptic. */
export function Button({
  label,
  sublabel,
  glyph,
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
  const glyphStyle = useGlyphNudge(variant === 'hero' && glyph !== undefined && !disabled);
  const hero = variant === 'hero';

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      buzz.impact();
    }
    onPress();
  };

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={sublabel ? `${label}, ${sublabel}` : label}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withTiming(0.96, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      onPress={handlePress}
      style={hero ? [animatedStyle, HERO_SHADOW] : animatedStyle}
      className={cn(
        'flex-row items-center justify-center gap-2 px-6',
        sublabel ? 'min-h-16 py-3' : hero ? 'h-16' : 'h-14',
        CONTAINER[variant],
        disabled && 'opacity-40',
        className,
      )}
    >
      <Text
        className={cn(
          sublabel ? 'text-lg font-bold' : hero ? 'text-lg font-extrabold' : 'text-base font-semibold',
          LABEL[variant],
        )}
      >
        {label}
      </Text>
      {glyph !== undefined && (
        <Animated.Text
          style={glyphStyle}
          className={cn(hero ? 'text-xl font-extrabold' : 'text-base font-semibold', LABEL[variant])}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {glyph}
        </Animated.Text>
      )}
      {sublabel !== undefined && (
        <Text className={cn('mt-0.5 text-sm font-medium', SUBLABEL[variant])}>{sublabel}</Text>
      )}
    </AnimatedPressable>
  );
}
