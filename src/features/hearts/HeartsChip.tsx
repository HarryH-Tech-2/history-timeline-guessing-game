import { useEffect, useRef } from 'react';
import { Text } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { t } from '@/i18n';

import { useHearts } from './useHearts';

interface HeartsChipViewProps {
  count: number;
  max: number;
  unlimited: boolean;
  /** False during a new player's free games — the chip stays out of the way. */
  atStake: boolean;
}

/**
 * The hearts meter as a compact HUD chip. Shakes when a heart is lost so a
 * loose guess has a visible cost, not just a smaller number.
 */
export function HeartsChipView({ count, max, unlimited, atStake }: HeartsChipViewProps) {
  const reducedMotion = useReducedMotion();
  const shake = useSharedValue(0);
  const previous = useRef(count);

  useEffect(() => {
    const lost = count < previous.current;
    previous.current = count;
    if (!lost || reducedMotion) return;
    shake.value = withSequence(
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 70 }),
      withTiming(-3, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
    return () => cancelAnimation(shake);
  }, [count, reducedMotion, shake]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  if (!atStake && !unlimited) return null;

  return (
    <Animated.View
      style={style}
      className="h-8 flex-row items-center gap-1 rounded-full border border-hair bg-bg-raised px-2.5"
      accessibilityLabel={
        unlimited ? t('home.hearts.unlimitedA11y') : t('home.hearts.leftA11y', { count, max })
      }
      testID="hud-hearts"
    >
      <Text className="text-sm" style={{ includeFontPadding: false }}>
        ❤️
      </Text>
      <Text
        className={`text-sm font-extrabold ${count <= 2 && !unlimited ? 'text-danger' : 'text-ink-primary'}`}
        style={{ fontVariant: ['tabular-nums'], includeFontPadding: false }}
      >
        {unlimited ? '∞' : count}
      </Text>
    </Animated.View>
  );
}

/** The live hearts meter, for the quiz HUD of every mode that spends hearts. */
export function HeartsChip() {
  const hearts = useHearts();
  return (
    <HeartsChipView
      count={hearts.count}
      max={hearts.max}
      unlimited={hearts.unlimited}
      atStake={hearts.atStake}
    />
  );
}
