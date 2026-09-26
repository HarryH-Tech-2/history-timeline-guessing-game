import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useProgression } from '@/features/progression';
import { dateKey } from '@/utils/date';

import { dailyHeroStatus } from './dailyHero';
import { IconPlaque } from './IconPlaque';

/** Re-derive the countdown this often while the card is on screen. */
const TICK_MS = 60_000;

/**
 * The card's call to action while today's Daily is unplayed: a lifted pill
 * that breathes gently so the eye lands on it. The loop is cancelled on
 * unmount — a leaked repeat here would keep Reanimated busy on every screen.
 */
function PlayPill() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 750, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(scale);
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        style,
        {
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        },
      ]}
      className="flex-row items-center gap-1.5 rounded-full bg-accent px-5 py-3"
    >
      <Text className="text-xs text-bg-base" style={{ includeFontPadding: false }}>
        ▶
      </Text>
      <Text className="text-base font-extrabold text-bg-base">Play</Text>
    </Animated.View>
  );
}

/**
 * The Daily as the first thing on the home hub. It is the habit loop of the
 * game, and the numbers said almost nobody found it below the fold: one card
 * with a clear state — play now, streak on the line, or done with a countdown.
 */
export function DailyHeroCard({ onPress }: { onPress: () => void }) {
  const { state } = useProgression();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const status = dailyHeroStatus({ streak: state.streak, today: dateKey(now), now });
  const streakLine =
    status.streak > 0
      ? status.done
        ? `🔥 ${status.streak}-day streak`
        : `🔥 ${status.streak}-day streak — play today to keep it`
      : null;

  return (
    <Animated.View entering={FadeInUp.springify().damping(18)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={status.done ? 'Daily done, see your result' : "Play today's Daily"}
        testID="mode-daily"
        className={`flex-row items-center gap-4 overflow-hidden border-2 p-4 ${
          status.done ? 'border-hair bg-bg-raised' : 'border-accent bg-accent/10'
        }`}
      >
        <IconPlaque glyph={status.done ? '✅' : '📅'} />
        <View className="flex-1">
          {status.done && (
            <Text className="text-xs font-semibold uppercase tracking-wide text-accent">
              Come back tomorrow
            </Text>
          )}
          <Text className="text-xl font-extrabold text-ink-primary">
            {status.done ? 'Daily done' : "Today's Daily"}
          </Text>
          {streakLine !== null && (
            <Text className="text-sm text-ink-secondary">{streakLine}</Text>
          )}
          {status.done && (
            <Text className="text-sm text-ink-muted">Next Daily in {status.hoursUntilNext}h</Text>
          )}
        </View>
        {status.done ? <Text className="text-xl text-ink-muted">›</Text> : <PlayPill />}
      </Pressable>
    </Animated.View>
  );
}
